-- Draft of the agent onboarding form (/agent/onboarding), saved to the cloud so a long form survives a closed tab or another device.
-- Written only by the agent on their own row (the existing update policy); cleared when the profile is submitted.
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS onboarding_draft jsonb;
COMMENT ON COLUMN public.agents.onboarding_draft IS 'Unsubmitted onboarding form values (JSON). Null once the profile is submitted.';
