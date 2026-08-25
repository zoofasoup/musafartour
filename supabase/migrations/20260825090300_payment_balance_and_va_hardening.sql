-- supabase/migrations/20260825090300_payment_balance_and_va_hardening.sql
--
-- Final-review fixes: Finding 5 (Important) and Minor hardenings 1 and 2.
--
-- Finding 5: sequential double-VA let a jamaah overpay. create_booking_payment
--   computed _remaining as total_price - amount_paid, ignoring payments already
--   created but not yet settled. A jamaah could generate a VA for the full
--   remaining balance, navigate away without paying, generate a second VA for
--   the same full remaining balance, then pay both - leaving
--   amount_paid > total_price with no refund path. Outstanding pending payments
--   are now subtracted from the remaining balance.
--
-- Minor 1: record_payment_va_details is deliberately PUBLIC-executable (the
--   midtrans_order_id is an unguessable random token), but it writes a bank
--   account number a customer transfers real money to. It is now write-once:
--   the UPDATE only matches rows whose va_number is still NULL, so the VA
--   details can be set but never later overwritten.
--
-- Minor 2: the leading comment in 20260824090100_booking_tables.sql claimed
--   "No direct INSERT policies: all writes to these three tables happen through
--   SECURITY DEFINER RPCs, never raw client inserts", which contradicted the
--   admin "FOR ALL" policies declared a few lines below it - those do let an
--   admin write directly, bypassing the RPCs. The already-applied policy SQL is
--   correct and unchanged; only the claim about it was wrong. The accurate
--   statement is recorded on the policies themselves below, so it lives in the
--   database rather than only in a migration file nobody re-reads.

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

  -- Finding 5: unsettled payments already issued against this booking are
  -- money the jamaah can still pay at any time before the VA expires, so they
  -- reserve part of the balance. Ignoring them let a second VA be issued for a
  -- balance the first VA already covers.
  _remaining := _booking.total_price
              - _booking.amount_paid
              - COALESCE((
                  SELECT sum(amount) FROM public.booking_payments
                  WHERE booking_id = _booking_id AND status = 'pending'
                ), 0);

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
--
-- Minor 1: write-once. va_number is a bank account a customer sends real money
-- to, so once it is set nothing may change it - the AND va_number IS NULL guard
-- makes a second call a silent no-op rather than a redirect of funds.
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
  WHERE midtrans_order_id = _order_id
    AND va_number IS NULL;
$$;

-- Minor 2: record what the admin FOR ALL policies actually permit, correcting
-- the inaccurate "never raw client inserts" claim in the booking_tables
-- migration's leading comment.
COMMENT ON POLICY "Admins can manage all bookings" ON public.bookings IS
  'Jamaah and agent writes always go through the SECURITY DEFINER booking RPCs - those roles have no INSERT/UPDATE policy at all. This FOR ALL policy is the deliberate exception: an admin CAN write these rows directly, bypassing the RPCs and their invariants (slot accounting, commission crediting, payment totals). Admin edits are trusted-operator actions, not RPC-guarded ones.';

COMMENT ON POLICY "Admins can manage all travelers" ON public.booking_travelers IS
  'Jamaah and agent writes always go through the SECURITY DEFINER booking RPCs. This FOR ALL policy is the deliberate exception: an admin CAN write these rows directly, bypassing the RPCs.';

COMMENT ON POLICY "Admins can manage all payments" ON public.booking_payments IS
  'Jamaah and agent writes always go through the SECURITY DEFINER booking RPCs. This FOR ALL policy is the deliberate exception: an admin CAN write these rows directly, bypassing the RPCs - including amount/status, which record_booking_payment_settled otherwise owns. Note admin_mark_payment_settled is the audited path for forcing a settlement; a direct row edit is not audited.';
