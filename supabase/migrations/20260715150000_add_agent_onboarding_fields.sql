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

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy for uploading (Agents can upload their own KTP)
-- We check if the bucket_id is 'agent-documents' and if the authenticated user is uploading
DROP POLICY IF EXISTS "Agents can upload their own documents" ON storage.objects;
CREATE POLICY "Agents can upload their own documents" ON storage.objects
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        bucket_id = 'agent-documents' AND 
        (auth.uid() = owner OR (auth.uid())::text = (string_to_array(name, '/'))[1])
    );

-- 4. Policy for viewing (Agents can view their own documents, admins can view all)
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
CREATE POLICY "Users can view their own documents" ON storage.objects
    FOR SELECT 
    TO authenticated
    USING (
        bucket_id = 'agent-documents' AND 
        (auth.uid() = owner OR (auth.uid())::text = (string_to_array(name, '/'))[1] OR 
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
        ))
    );
