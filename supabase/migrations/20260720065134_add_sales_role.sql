-- Own migration file since ALTER TYPE ... ADD VALUE must be committed
-- before the new value can be referenced by a policy.
ALTER TYPE public.app_role ADD VALUE 'sales';
