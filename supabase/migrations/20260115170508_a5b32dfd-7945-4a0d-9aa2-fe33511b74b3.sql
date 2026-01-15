-- Create agent_sales table
CREATE TABLE public.agent_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  package_name TEXT NOT NULL,
  sale_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 4.5,
  status TEXT NOT NULL DEFAULT 'pending',
  booking_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  departure_date DATE,
  payment_proof_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_withdrawals table
CREATE TABLE public.agent_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  bank_name TEXT NOT NULL,
  bank_account TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_sales
CREATE POLICY "Agents can view their own sales"
ON public.agent_sales
FOR SELECT
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all sales"
ON public.agent_sales
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all sales"
ON public.agent_sales
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for agent_withdrawals
CREATE POLICY "Agents can view their own withdrawals"
ON public.agent_withdrawals
FOR SELECT
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can request withdrawals"
ON public.agent_withdrawals
FOR INSERT
WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all withdrawals"
ON public.agent_withdrawals
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all withdrawals"
ON public.agent_withdrawals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_agent_sales_agent_id ON public.agent_sales(agent_id);
CREATE INDEX idx_agent_sales_status ON public.agent_sales(status);
CREATE INDEX idx_agent_sales_booking_date ON public.agent_sales(booking_date);
CREATE INDEX idx_agent_withdrawals_agent_id ON public.agent_withdrawals(agent_id);
CREATE INDEX idx_agent_withdrawals_status ON public.agent_withdrawals(status);