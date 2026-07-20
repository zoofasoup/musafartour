-- agent_sales has existed since 20260115170508 with full RLS, but nothing
-- in the codebase ever inserted into it - every agent's Total Sales, Total
-- Commission, Available Balance (all stored columns on `agents`, not
-- derived from agent_sales on the fly) could only ever be changed by
-- editing the database directly. This RPC is the missing write path: it
-- inserts the ledger row and keeps the agent's aggregate columns in sync
-- in one transaction, the same way create_calculator_lead already bundles
-- a multi-field insert behind a single function call.
--
-- Aggregates only move when status = 'confirmed', to avoid double-counting
-- if a pending/cancelled entry is later corrected - this function does not
-- attempt to handle status *changes* after the fact (e.g. pending ->
-- confirmed), only what happens at insert time. That's a real limitation,
-- not solved here.
CREATE OR REPLACE FUNCTION public.log_agent_sale(
  _agent_id UUID,
  _customer_name TEXT,
  _customer_phone TEXT,
  _package_id UUID,
  _package_name TEXT,
  _sale_amount NUMERIC,
  _commission_rate NUMERIC DEFAULT 4.5,
  _departure_date DATE DEFAULT NULL,
  _status TEXT DEFAULT 'confirmed',
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _commission_amount NUMERIC;
  _new_id UUID;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
    OR has_role(auth.uid(), 'agent_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to log agent sales';
  END IF;

  IF _sale_amount IS NULL OR _sale_amount <= 0 THEN
    RAISE EXCEPTION 'sale_amount must be positive';
  END IF;

  _commission_amount := round(_sale_amount * _commission_rate / 100, 2);

  INSERT INTO public.agent_sales (
    agent_id, customer_name, customer_phone, package_id, package_name,
    sale_amount, commission_amount, commission_rate, departure_date, status, notes
  ) VALUES (
    _agent_id, _customer_name, _customer_phone, _package_id, _package_name,
    _sale_amount, _commission_amount, _commission_rate, _departure_date, _status, _notes
  ) RETURNING id INTO _new_id;

  IF _status = 'confirmed' THEN
    UPDATE public.agents
    SET total_sales = total_sales + 1,
        total_commission = total_commission + _commission_amount,
        available_balance = available_balance + _commission_amount
    WHERE id = _agent_id;
  END IF;

  RETURN _new_id;
END;
$$;
