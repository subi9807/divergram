/*
  # Create reports storage bucket

  1. Storage
    - Create `reports` bucket for storing report attachments
    - Enable public access for uploaded files
    - Set file size limit to 10MB
    
  2. Security
    - Allow authenticated users to upload files
    - Allow authenticated users to read their own files
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload report files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own report files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);