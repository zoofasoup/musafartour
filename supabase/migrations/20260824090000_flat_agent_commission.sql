-- Full migration to flat per-package commission (was percentage-based).
-- packages.commission_rate existed but had no admin UI to edit it - every
-- sale used the log_agent_sale dialog's free-text rate, defaulting to 4.5%.
-- Going forward, commission is a flat Rupiah amount set per package.
ALTER TABLE public.packages ADD COLUMN dp_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.packages ADD COLUMN agent_commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.packages DROP COLUMN commission_rate;

-- agent_sales.commission_rate is now meaningless for new rows (nothing is
-- rate-based anymore) but historical rows keep their real value - just stop
-- requiring/defaulting it rather than losing history.
ALTER TABLE public.agent_sales ALTER COLUMN commission_rate DROP NOT NULL;
ALTER TABLE public.agent_sales ALTER COLUMN commission_rate DROP DEFAULT;

-- Postgres refuses CREATE OR REPLACE when a parameter is renamed in place
-- (_commission_rate -> _commission_amount, same position/type) - drop the
-- old signature first so the replacement below can actually apply.
DROP FUNCTION IF EXISTS public.log_agent_sale(UUID, TEXT, TEXT, UUID, TEXT, NUMERIC, NUMERIC, DATE, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.log_agent_sale(
  _agent_id UUID,
  _customer_name TEXT,
  _customer_phone TEXT,
  _package_id UUID,
  _package_name TEXT,
  _sale_amount NUMERIC,
  _commission_amount NUMERIC,
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

  IF _commission_amount IS NULL OR _commission_amount < 0 THEN
    RAISE EXCEPTION 'commission_amount must not be negative';
  END IF;

  INSERT INTO public.agent_sales (
    agent_id, customer_name, customer_phone, package_id, package_name,
    sale_amount, commission_amount, status, departure_date, notes
  ) VALUES (
    _agent_id, _customer_name, _customer_phone, _package_id, _package_name,
    _sale_amount, _commission_amount, _status, _departure_date, _notes
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
