-- New role for paid-ads/marketing-tracking operators. Split into its own
-- migration file (enum value only) since ALTER TYPE ... ADD VALUE must be
-- committed before the new value can be referenced by a policy.
ALTER TYPE public.app_role ADD VALUE 'advertiser';
