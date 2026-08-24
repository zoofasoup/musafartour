ALTER TABLE public.agent_sales ADD COLUMN booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
ALTER TABLE public.agent_sales ADD COLUMN source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','booking'));

CREATE INDEX idx_agent_sales_booking_id ON public.agent_sales(booking_id);
