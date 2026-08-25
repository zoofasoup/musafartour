-- supabase/migrations/20260825090200_record_payment_failed.sql
--
-- Final-review fix, Finding 4 (Important): failed/expired payments were never
-- recorded. functions/midtrans-webhook.ts only handled settlement/capture;
-- every other transaction_status (expire, deny, cancel) returned 200 with no
-- state change, so abandoned VAs stayed 'pending' forever. That left the
-- admin's "Tandai Lunas" override button showing on VAs that expired months
-- ago - a plausible way to accidentally credit money that never arrived.
--
-- Authorization matches record_booking_payment_settled exactly: callable only
-- by the webhook using the service-role key. PUBLIC must be revoked
-- explicitly - every role implicitly inherits PUBLIC's grants, so revoking
-- from anon/authenticated alone silently no-ops.

CREATE OR REPLACE FUNCTION public.record_booking_payment_failed(
  _order_id TEXT,
  _new_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _new_status NOT IN ('expired', 'failed') THEN
    RAISE EXCEPTION 'Invalid status %, expected expired or failed', _new_status;
  END IF;

  -- Never downgrade a real settlement. Midtrans can deliver notifications out
  -- of order and retries them, so an 'expire' arriving after a 'settlement'
  -- must not undo money we already credited to the booking.
  UPDATE public.booking_payments
  SET status = _new_status
  WHERE midtrans_order_id = _order_id
    AND status <> 'settled';

  -- Deliberately no other side effects: bookings.amount_paid, booking status,
  -- agent commission and the package slot hold are all untouched. A failed VA
  -- means no money moved, and the 'held' booking's own hold_expires_at /
  -- release_expired_booking_holds already own reclaiming the seat.
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_booking_payment_failed(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_booking_payment_failed(TEXT, TEXT) TO service_role;
