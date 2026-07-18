-- Add onboarding fields to agents table
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS agency_name TEXT,
ADD COLUMN IF NOT EXISTS ktp_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS ktp_image_url TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS experience_level TEXT;

-- Set up Storage for KTP images
-- 1. Create the agent-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('agent-documents', 'agent-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2-4. RLS + policies on storage.objects.
-- On hosted Supabase the migration role does not own storage.objects (RLS is
-- already enabled there); skip gracefully when we lack privileges.
DO $$
BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping RLS enable on storage.objects (insufficient privilege)';
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Agents can upload their own documents" ON storage.objects;
    CREATE POLICY "Agents can upload their own documents" ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'agent-documents' AND
            (auth.uid() = owner OR (auth.uid())::text = (string_to_array(name, '/'))[1])
        );

    DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
    CREATE POLICY "Users can view their own documents" ON storage.objects
        FOR SELECT
        TO authenticated
        USING (
            bucket_id = 'agent-documents' AND
            (auth.uid() = owner OR (auth.uid())::text = (string_to_array(name, '/'))[1] OR
            EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid() AND role = 'admin'
            ))
        );
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping storage.objects policies (insufficient privilege) — create them in the Supabase dashboard';
END $$;
