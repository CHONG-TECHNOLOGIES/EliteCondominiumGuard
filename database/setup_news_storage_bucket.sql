-- =============================================
-- News Images Storage Bucket Setup
-- =============================================
-- This migration creates the storage bucket for news images.
-- Run this in the Supabase SQL Editor.

-- Create bucket for news images (public read access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'news-images',
  'news-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- =============================================
-- RLS POLICIES FOR NEWS IMAGES
-- =============================================

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads to news-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'news-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated updates to news-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'news-images');

-- Allow authenticated users to delete images
CREATE POLICY "Allow authenticated deletes from news-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'news-images');

-- Allow public read access to all images
CREATE POLICY "Allow public read access to news-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'news-images');
