-- Create agents table for Agent Portal
CREATE TABLE public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL UNIQUE,
    wa_number TEXT,
    name TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'bronze' CHECK (level IN ('bronze', 'silver', 'gold', 'platinum')),
    total_sales INTEGER NOT NULL DEFAULT 0,
    total_commission NUMERIC(12, 2) NOT NULL DEFAULT 0,
    available_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    referral_code TEXT NOT NULL UNIQUE,
    referred_by_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    bank_name TEXT,
    bank_account TEXT,
    account_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on agents table
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agents
CREATE POLICY "Agents can view their own data"
ON public.agents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Agents can update their own profile"
ON public.agents
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can insert agent (for registration)"
ON public.agents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all agents"
ON public.agents
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all agents"
ON public.agents
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete agents"
ON public.agents
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add commission_rate to existing packages table for agent commissions
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 2) DEFAULT 4.5;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS slots_total INTEGER DEFAULT 40;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS slots_filled INTEGER DEFAULT 0;

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := 'MUS-';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agents_referral_code ON public.agents(referral_code);
CREATE INDEX IF NOT EXISTS idx_agents_status ON public.agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);