-- New staff role 'finance' (SOP section 11: a commission needs a management approval and a finance approval, by two
-- different people). Kept alone in its own migration: Postgres does not allow a new enum value to be used in the
-- transaction that adds it. Everything that uses the role lives in 20261008110000_commission_lifecycle.sql.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
