-- supabase/migrations/20260825090100_payment_override_audit.sql
--
-- Final-review fix, Finding 3 (Important): the manual payment override had no
-- audit trail. admin_mark_payment_settled(_order_id, _admin_notes) accepted
-- _admin_notes and silently discarded it - nothing recorded who forced a
-- settlement, when, or why, so a manually-forced settlement was
-- indistinguishable from a real Midtrans webhook settlement.
--
-- Both columns NULL  => genuine webhook settlement.
-- Either column set   => manual admin override.
--
-- record_booking_payment_settled's own signature and logic are deliberately
-- unchanged (already reviewed and approved); the audit write lives only in the
-- admin-only wrapper around it.

ALTER TABLE public.booking_payments
  ADD COLUMN IF NOT EXISTS settled_by_admin_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS override_notes TEXT;

COMMENT ON COLUMN public.booking_payments.settled_by_admin_id IS
  'Set only by admin_mark_payment_settled: the admin who manually forced this settlement. NULL means the payment settled through the genuine Midtrans webhook.';
COMMENT ON COLUMN public.booking_payments.override_notes IS
  'Set only by admin_mark_payment_settled: the reason given for the manual override. NULL means the payment settled through the genuine Midtrans webhook.';

CREATE OR REPLACE FUNCTION public.admin_mark_payment_settled(_order_id TEXT, _admin_notes TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id UUID := auth.uid();
BEGIN
  IF NOT has_role(_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _admin_notes IS NULL OR btrim(_admin_notes) = '' THEN
    RAISE EXCEPTION 'A reason is required to manually override a payment';
  END IF;

  PERFORM public.record_booking_payment_settled(_order_id);

  -- Stamp the override after the settlement so the row is only marked as
  -- manually forced once the settlement actually went through.
  UPDATE public.booking_payments
  SET settled_by_admin_id = _admin_id,
      override_notes = btrim(_admin_notes)
  WHERE midtrans_order_id = _order_id;
END;
$$;
