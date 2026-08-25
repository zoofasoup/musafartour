CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.packages(id),
  jamaah_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held','active','completed','expired','cancelled')),
  room_type TEXT NOT NULL CHECK (room_type IN ('quad','triple','double')),
  traveler_count INTEGER NOT NULL CHECK (traveler_count > 0),
  price_per_person NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  dp_required NUMERIC(12,2) NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  hold_expires_at TIMESTAMPTZ,
  commission_credited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_travelers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  passport_number TEXT,
  date_of_birth DATE,
  is_primary_contact BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  admin_fee NUMERIC(12,2) NOT NULL DEFAULT 4000,
  total_charged NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','settled','expired','failed')),
  midtrans_order_id TEXT NOT NULL UNIQUE,
  midtrans_transaction_id TEXT,
  va_number TEXT,
  bank TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;

-- No jamaah/agent INSERT or UPDATE policies: for those roles, every write to
-- these three tables happens through the SECURITY DEFINER RPCs (Task 4), which
-- own the invariants (slot accounting, payment totals, commission crediting).
-- The one deliberate exception is the admin "FOR ALL" policies below: an admin
-- CAN write these rows directly, bypassing the RPCs. That is a trusted-operator
-- escape hatch, not an RPC-guarded path - note that a direct row edit is not
-- audited, whereas admin_mark_payment_settled records who overrode what and why.
-- (Corrected by 20260825090300; the policies themselves are unchanged and the
-- same statement is recorded as COMMENT ON POLICY there.)

CREATE POLICY "Jamaah can view their own bookings"
ON public.bookings FOR SELECT
USING (auth.uid() = jamaah_id);

CREATE POLICY "Agents can view bookings attributed to them"
ON public.bookings FOR SELECT
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all bookings"
ON public.bookings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all bookings"
ON public.bookings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Jamaah can view travelers on their own bookings"
ON public.booking_travelers FOR SELECT
USING (booking_id IN (SELECT id FROM public.bookings WHERE jamaah_id = auth.uid()));

CREATE POLICY "Jamaah can update travelers on their own bookings"
ON public.booking_travelers FOR UPDATE
USING (booking_id IN (SELECT id FROM public.bookings WHERE jamaah_id = auth.uid()));

CREATE POLICY "Admins can view all travelers"
ON public.booking_travelers FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all travelers"
ON public.booking_travelers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Jamaah can view payments on their own bookings"
ON public.booking_payments FOR SELECT
USING (booking_id IN (SELECT id FROM public.bookings WHERE jamaah_id = auth.uid()));

CREATE POLICY "Admins can view all payments"
ON public.booking_payments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all payments"
ON public.booking_payments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_bookings_jamaah_id ON public.bookings(jamaah_id);
CREATE INDEX idx_bookings_package_id ON public.bookings(package_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_agent_id ON public.bookings(agent_id);
CREATE INDEX idx_booking_travelers_booking_id ON public.booking_travelers(booking_id);
CREATE INDEX idx_booking_payments_booking_id ON public.booking_payments(booking_id);
CREATE INDEX idx_booking_payments_order_id ON public.booking_payments(midtrans_order_id);
