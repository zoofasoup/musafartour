-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins to read notifications
CREATE POLICY "Admins can view notifications"
    ON public.admin_notifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Create policy to allow admins to update notifications (e.g. mark as read)
CREATE POLICY "Admins can update notifications"
    ON public.admin_notifications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Trigger function to create a notification when a new agent registers and becomes pending
CREATE OR REPLACE FUNCTION public.handle_new_agent_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when an agent is newly inserted with 'pending' status, 
    -- or updated from something else to 'pending'
    IF (TG_OP = 'INSERT' AND NEW.status = 'pending') OR 
       (TG_OP = 'UPDATE' AND NEW.status = 'pending' AND OLD.status != 'pending') THEN
       
       INSERT INTO public.admin_notifications (title, message, type, action_url)
       VALUES (
           'Pendaftaran Agen Baru',
           'Agen baru bernama ' || NEW.name || ' menunggu persetujuan (Pending).',
           'agent_registration',
           '/admin/setup?tab=agents'
       );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on agents table
DROP TRIGGER IF EXISTS on_agent_status_change ON public.agents;
CREATE TRIGGER on_agent_status_change
    AFTER INSERT OR UPDATE ON public.agents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_agent_notification();
