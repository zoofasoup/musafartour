-- WhatsApp bot: a group chat can change a package's hotel when someone tags the bot and a
-- listed sender confirms. Everything here is service-role only (RLS on, no policies); the
-- whatsapp-bot edge function is the only reader/writer. Changes to packages are recorded
-- by the existing log_package_change trigger (the bot passes change_reason).

-- Which WhatsApp group manages which package, and who may change it.
CREATE TABLE IF NOT EXISTS public.whatsapp_bot_groups (
  group_jid text PRIMARY KEY,                       -- e.g. 120363012345678901@g.us
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  -- Phone numbers (digits only, e.g. 628123456789) allowed to confirm changes.
  allowed_senders text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Rolling text buffer so the bot can read the discussion before it was tagged.
CREATE TABLE IF NOT EXISTS public.whatsapp_bot_messages (
  id bigserial PRIMARY KEY,
  group_jid text NOT NULL,
  sender text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_bot_messages_group_idx
  ON public.whatsapp_bot_messages (group_jid, id DESC);

-- A proposed change waiting for "OK". Expires so a stale proposal can't be confirmed days later.
CREATE TABLE IF NOT EXISTS public.whatsapp_bot_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_jid text NOT NULL,
  requested_by text NOT NULL,
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  -- { "changes": { "<packages column>": <new value>, ... }, "summary": "..." }
  proposal jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'cancelled', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_bot_pending_group_idx
  ON public.whatsapp_bot_pending (group_jid, status);

ALTER TABLE public.whatsapp_bot_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_bot_pending ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_bot_groups, public.whatsapp_bot_messages, public.whatsapp_bot_pending FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.whatsapp_bot_messages_id_seq FROM anon, authenticated;
