-- Public storage bucket for design-request-form attachments (reference
-- images/logos/examples). Public + open INSERT because the request form
-- itself has no login - matches the "packages" table's public SELECT
-- policy precedent for public-facing, non-sensitive content.
INSERT INTO storage.buckets (id, name, public)
VALUES ('design-request-attachments', 'design-request-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Design request attachments are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'design-request-attachments');

CREATE POLICY "Anyone can upload design request attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'design-request-attachments');
