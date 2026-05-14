/*
  # Create Storage Bucket for Diving Media

  1. New Storage Bucket
    - Create 'diving-media' bucket for photos and videos
    - Set public access for viewing
    - Allow authenticated users to upload

  2. Security Policies
    - Anyone can view media (public read)
    - Only authenticated users can upload
    - Users can only delete their own uploads
*/

-- Create storage bucket for diving media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diving-media',
  'diving-media',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for diving media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload diving media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own diving media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own diving media" ON storage.objects;

-- Allow public read access to diving media
CREATE POLICY "Public read access for diving media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'diving-media');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload diving media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'diving-media');

-- Allow users to update their own files
CREATE POLICY "Users can update their own diving media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'diving-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own diving media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'diving-media' AND auth.uid()::text = (storage.foldername(name))[1]);
