-- Refund/cancellation policy (decided with the user): DP is forfeited on
-- cancellation, everything paid beyond the DP is refunded in full, no
-- cancellation fee. Nothing before this migration could record a
-- cancellation at all - bookings.status has always allowed 'cancelled' in
-- its CHECK constraint (since 20260824090100_booking_tables.sql), but no
-- code path ever set it.
ALTER TABLE public.bookings ADD COLUMN cancelled_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN cancelled_by_admin_id UUID REFERENCES auth.users(id);
ALTER TABLE public.bookings ADD COLUMN cancel_reason TEXT;
ALTER TABLE public.bookings ADD COLUMN refund_due NUMERIC(12,2);
ALTER TABLE public.bookings ADD COLUMN refund_sent_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.cancel_booking(_booking_id UUID, _reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking RECORD;
  _refund NUMERIC;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _reason IS NULL OR btrim(_reason) = '' THEN
    RAISE EXCEPTION 'cancel_reason is required';
  END IF;

  SELECT * INTO _booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF _booking.status NOT IN ('held', 'active', 'completed') THEN
    RAISE EXCEPTION 'Booking cannot be cancelled from status %', _booking.status;
  END IF;

  -- Policy: DP is forfeited, everything paid beyond it is refunded in full.
  _refund := GREATEST(0, _booking.amount_paid - _booking.dp_required);

  UPDATE public.bookings
  SET status = 'cancelled',
      cancelled_at = now(),
      cancelled_by_admin_id = auth.uid(),
      cancel_reason = btrim(_reason),
      refund_due = _refund,
      updated_at = now()
  WHERE id = _booking_id;

  -- Release the seat back into online inventory - same accounting as an
  -- expired hold (release_expired_booking_holds). Never touches slots_filled,
  -- which the daily Google Sheet sync owns exclusively.
  UPDATE public.packages
  SET slots_booked_online = GREATEST(0, slots_booked_online - _booking.traveler_count)
  WHERE id = _booking.package_id;
END;
$$;

-- Deliberately does not touch agent_sales/commission: this policy only
-- covers refunding the customer. Whether a cancelled-after-fully-paid
-- booking's already-credited agent commission should be clawed back is a
-- separate decision the user hasn't made - not assumed here either way.
CREATE OR REPLACE FUNCTION public.mark_refund_sent(_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.bookings
  SET refund_sent_at = now(), updated_at = now()
  WHERE id = _booking_id AND status = 'cancelled' AND refund_sent_at IS NULL;
END;
$$;
