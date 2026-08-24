-- supabase/migrations/20260824090300_booking_rpcs.sql

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

  IF _pkg.slots_filled + _traveler_count > _pkg.slots_total THEN
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

  UPDATE public.packages SET slots_filled = slots_filled + _traveler_count WHERE id = _package_id;

  RETURN _booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking_payment(
  _booking_id UUID,
  _amount NUMERIC
)
RETURNS TABLE(order_id TEXT, total_charged NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking RECORD;
  _remaining NUMERIC;
  _order_id TEXT;
  _fee NUMERIC := 4000;
BEGIN
  -- Lock the booking row so two concurrent calls (e.g. a double-clicked
  -- "Bayar Sekarang" button) can't both read the same amount_paid/total_price
  -- snapshot, both pass the remaining-balance check below, and both insert a
  -- full-remaining-amount payment row - the same FOR UPDATE pattern already
  -- used on the packages row in create_booking and on both rows in
  -- record_booking_payment_settled.
  SELECT * INTO _booking FROM public.bookings WHERE id = _booking_id AND jamaah_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF _booking.status NOT IN ('held', 'active') THEN
    RAISE EXCEPTION 'Booking is not open for payment';
  END IF;

  _remaining := _booking.total_price - _booking.amount_paid;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  IF _amount > _remaining THEN
    RAISE EXCEPTION 'amount exceeds remaining balance';
  END IF;

  IF _booking.status = 'held' AND _amount < _booking.dp_required THEN
    RAISE EXCEPTION 'First payment must be at least the required DP';
  END IF;

  IF _booking.status = 'active' AND _amount < 500000 AND _amount < _remaining THEN
    RAISE EXCEPTION 'Minimum payment is Rp 500.000 unless paying off the remaining balance';
  END IF;

  _order_id := 'MUSBK-' || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.booking_payments (booking_id, amount, admin_fee, total_charged, midtrans_order_id)
  VALUES (_booking_id, _amount, _fee, _amount + _fee, _order_id);

  RETURN QUERY SELECT _order_id, _amount + _fee;
END;
$$;

-- Called by create-payment.ts after Midtrans returns VA details. No auth.uid()
-- check: midtrans_order_id is an unguessable random token, and this only
-- writes display metadata (VA number/bank), never money-moving state.
CREATE OR REPLACE FUNCTION public.record_payment_va_details(
  _order_id TEXT,
  _midtrans_transaction_id TEXT,
  _va_number TEXT,
  _bank TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.booking_payments
  SET midtrans_transaction_id = _midtrans_transaction_id,
      va_number = _va_number,
      bank = _bank
  WHERE midtrans_order_id = _order_id;
$$;

CREATE OR REPLACE FUNCTION public.record_booking_payment_settled(_order_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payment RECORD;
  _booking RECORD;
  _new_amount_paid NUMERIC;
  _commission NUMERIC;
  _contact_name TEXT;
  _contact_phone TEXT;
  _package_name TEXT;
BEGIN
  SELECT * INTO _payment FROM public.booking_payments WHERE midtrans_order_id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found for order_id %', _order_id;
  END IF;

  IF _payment.status = 'settled' THEN
    RETURN; -- idempotent no-op, already processed (Midtrans retries notifications)
  END IF;

  UPDATE public.booking_payments SET status = 'settled', paid_at = now() WHERE id = _payment.id;

  SELECT * INTO _booking FROM public.bookings WHERE id = _payment.booking_id FOR UPDATE;
  _new_amount_paid := _booking.amount_paid + _payment.amount;

  UPDATE public.bookings
  SET amount_paid = _new_amount_paid,
      status = CASE
        WHEN _new_amount_paid >= total_price THEN 'completed'
        WHEN status = 'held' THEN 'active'
        ELSE status
      END,
      hold_expires_at = CASE WHEN status = 'held' THEN NULL ELSE hold_expires_at END,
      updated_at = now()
  WHERE id = _booking.id;

  IF _new_amount_paid >= _booking.total_price AND NOT _booking.commission_credited AND _booking.agent_id IS NOT NULL THEN
    SELECT agent_commission_amount, package_name INTO _commission, _package_name
    FROM public.packages WHERE id = _booking.package_id;

    SELECT full_name, phone INTO _contact_name, _contact_phone
    FROM public.booking_travelers WHERE booking_id = _booking.id AND is_primary_contact = true LIMIT 1;

    INSERT INTO public.agent_sales (
      agent_id, customer_name, customer_phone, package_id, package_name,
      sale_amount, commission_amount, status, booking_id, source
    ) VALUES (
      _booking.agent_id, COALESCE(_contact_name, ''), COALESCE(_contact_phone, ''),
      _booking.package_id, COALESCE(_package_name, ''),
      _booking.total_price, COALESCE(_commission, 0), 'confirmed', _booking.id, 'booking'
    );

    UPDATE public.agents
    SET total_sales = total_sales + 1,
        total_commission = total_commission + COALESCE(_commission, 0),
        available_balance = available_balance + COALESCE(_commission, 0)
    WHERE id = _booking.agent_id;

    UPDATE public.bookings SET commission_credited = true WHERE id = _booking.id;
  END IF;
END;
$$;

-- Not directly callable by clients: only the webhook (service role) or
-- admin_mark_payment_settled (its own admin check) may invoke this.
--
-- REVOKE ... FROM anon, authenticated alone is NOT sufficient: new functions
-- get EXECUTE granted to the PUBLIC pseudo-role by default, and every role
-- (including anon/authenticated) implicitly inherits PUBLIC's grants. Revoking
-- from the named roles only removes a *direct* grant to them, which never
-- existed here - it silently no-ops while PUBLIC still lets anyone call it.
-- PUBLIC must be revoked explicitly to actually close this off.
REVOKE EXECUTE ON FUNCTION public.record_booking_payment_settled(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_booking_payment_settled(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_mark_payment_settled(_order_id TEXT, _admin_notes TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  PERFORM public.record_booking_payment_settled(_order_id);
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
    UPDATE public.packages SET slots_filled = GREATEST(0, slots_filled - _b.traveler_count) WHERE id = _b.package_id;
  END LOOP;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'release-expired-booking-holds',
  '*/15 * * * *',
  $$SELECT public.release_expired_booking_holds();$$
);
