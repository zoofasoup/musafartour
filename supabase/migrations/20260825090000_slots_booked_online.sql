-- supabase/migrations/20260825090000_slots_booked_online.sql
--
-- Final-review fix, Finding 1 (Critical) + Finding 2 (Important).
--
-- Finding 1: packages.slots_filled had two incompatible writers.
--   * The daily Google Sheet sync (supabase/functions/sync-seats/index.ts, run
--     by the 'daily-seat-sync' cron) treats it as an ABSOLUTE value:
--     slots_filled = slots_total - sheetRow.remaining. It fully overwrites.
--   * create_booking / release_expired_booking_holds treated it as a COUNTER
--     they increment and decrement.
--   Result: the nightly sheet sync silently erased every online booking's slot
--   hold, and the hold-release could free seats that were actually sold offline.
--
--   Fix (user-approved): online bookings get their own column,
--   packages.slots_booked_online. The sheet sync keeps owning slots_filled
--   untouched; the booking RPCs own slots_booked_online. Availability anywhere
--   is slots_filled + slots_booked_online vs slots_total.
--
-- Finding 2: create_booking had no server-side guard against booking a package
--   that is unpublished, flagged sold out, or already departed. The RPC is
--   reachable directly regardless of what the UI renders, so the guard has to
--   live here.

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS slots_booked_online INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.packages.slots_booked_online IS
  'Seats held/sold through the online booking system. Owned exclusively by create_booking and release_expired_booking_holds. Deliberately separate from slots_filled, which is overwritten wholesale by the daily Google Sheet seat sync. Available seats = slots_total - (slots_filled + slots_booked_online).';

CREATE OR REPLACE FUNCTION public.create_booking(
  _package_id UUID,
  _room_type TEXT,
  _traveler_count INTEGER,
  _primary_contact_name TEXT,
  _primary_contact_phone TEXT,
  _referral_code TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pkg RECORD;
  _price NUMERIC;
  _total NUMERIC;
  _agent_id UUID;
  _booking_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be logged in to book';
  END IF;

  IF _room_type NOT IN ('quad', 'triple', 'double') THEN
    RAISE EXCEPTION 'Invalid room_type';
  END IF;

  IF _traveler_count IS NULL OR _traveler_count <= 0 THEN
    RAISE EXCEPTION 'traveler_count must be positive';
  END IF;

  IF (_room_type = 'quad' AND _traveler_count > 4)
     OR (_room_type = 'triple' AND _traveler_count > 3)
     OR (_room_type = 'double' AND _traveler_count > 2) THEN
    RAISE EXCEPTION 'traveler_count exceeds room_type capacity';
  END IF;

  -- Lock the package row so two concurrent bookings can't both pass the slot check
  SELECT * INTO _pkg FROM public.packages WHERE id = _package_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Package not found';
  END IF;

  -- Finding 2: server-side bookability guard. Mirrors isPackageUnavailable()
  -- in src/lib/utils.ts, plus a published-status check the public UI gets for
  -- free by only ever listing published packages.
  IF _pkg.status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'Package is not open for booking';
  END IF;

  IF _pkg.is_sold_out THEN
    RAISE EXCEPTION 'Package is sold out';
  END IF;

  IF _pkg.departure_date IS NOT NULL AND _pkg.departure_date < current_date THEN
    RAISE EXCEPTION 'Package has already departed';
  END IF;

  -- Finding 1: seats sold offline (slots_filled, from the sheet) and seats
  -- taken online (slots_booked_online) both consume slots_total.
  IF COALESCE(_pkg.slots_filled, 0) + _pkg.slots_booked_online + _traveler_count > _pkg.slots_total THEN
    RAISE EXCEPTION 'Not enough slots available';
  END IF;

  -- A package has exactly one active tier (available_tiers is a single-element
  -- array); that tier picks which price column's quad/triple/double to read.
  _price := CASE
    WHEN _pkg.available_tiers[1] = 'hemat' THEN
      (_pkg.hemat_package_price ->> _room_type)::NUMERIC
    WHEN _pkg.available_tiers[1] = 'five-star' THEN
      (_pkg.five_star_package_price ->> _room_type)::NUMERIC
    WHEN _pkg.available_tiers[1] LIKE 'pelataran%' THEN
      (_pkg.pelataran_package_price ->> _room_type)::NUMERIC
    ELSE
      (_pkg.package_price ->> _room_type)::NUMERIC
  END;

  IF _price IS NULL OR _price <= 0 THEN
    RAISE EXCEPTION 'No price configured for this room type';
  END IF;

  _total := _price * _traveler_count;

  IF _referral_code IS NOT NULL THEN
    SELECT id INTO _agent_id FROM public.agents
    WHERE referral_code = upper(trim(_referral_code)) AND status = 'active';
  END IF;

  INSERT INTO public.bookings (
    package_id, jamaah_id, status, room_type, traveler_count,
    price_per_person, total_price, dp_required, agent_id, hold_expires_at
  ) VALUES (
    _package_id, auth.uid(), 'held', _room_type, _traveler_count,
    _price, _total, _pkg.dp_amount, _agent_id, now() + interval '24 hours'
  ) RETURNING id INTO _booking_id;

  INSERT INTO public.booking_travelers (booking_id, full_name, phone, is_primary_contact)
  VALUES (_booking_id, _primary_contact_name, _primary_contact_phone, true);

  UPDATE public.packages
  SET slots_booked_online = slots_booked_online + _traveler_count
  WHERE id = _package_id;

  RETURN _booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_expired_booking_holds()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _b RECORD;
BEGIN
  FOR _b IN
    SELECT id, package_id, traveler_count FROM public.bookings
    WHERE status = 'held' AND hold_expires_at < now()
    FOR UPDATE
  LOOP
    UPDATE public.bookings SET status = 'expired', hold_expires_at = NULL, updated_at = now() WHERE id = _b.id;
    -- Finding 1: give the seat back to slots_booked_online, the column the
    -- booking system owns - never to slots_filled, which the sheet sync owns
    -- and which may represent seats sold offline.
    UPDATE public.packages
    SET slots_booked_online = GREATEST(0, slots_booked_online - _b.traveler_count)
    WHERE id = _b.package_id;
  END LOOP;
END;
$$;
