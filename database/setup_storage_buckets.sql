-- =============================================
-- Setup Storage Buckets for Elite AccessControl
-- =============================================
-- Run this in Supabase SQL Editor to create and configure storage buckets
-- with proper RLS policies for staff photos and condominium logos.

-- 1. Create the staff-photos bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-photos',
  'staff-photos',
  true,  -- Public bucket for easy access to photos
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Create the condo-logos bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'condo-logos',
  'condo-logos',
  true,  -- Public bucket for easy access to logos
  2097152,  -- 2MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- =============================================
-- RLS Policies for staff-photos bucket
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to staff photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload to staff photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to staff photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete to staff photos" ON storage.objects;

-- Policy: Anyone can view staff photos (public read)
CREATE POLICY "Allow public read access to staff photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'staff-photos');

-- Policy: Authenticated users can upload staff photos
CREATE POLICY "Allow authenticated upload to staff photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'staff-photos'
  AND auth.role() = 'authenticated'
);

-- Policy: Authenticated users can update staff photos
CREATE POLICY "Allow authenticated update to staff photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'staff-photos'
  AND auth.role() = 'authenticated'
);

-- Policy: Authenticated users can delete staff photos
CREATE POLICY "Allow authenticated delete to staff photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'staff-photos'
  AND auth.role() = 'authenticated'
);

-- =============================================
-- RLS Policies for condo-logos bucket
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to condo logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload to condo logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to condo logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete to condo logos" ON storage.objects;

-- Policy: Anyone can view condo logos (public read)
CREATE POLICY "Allow public read access to condo logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'condo-logos');

-- Policy: Authenticated users can upload condo logos
CREATE POLICY "Allow authenticated upload to condo logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'condo-logos'
  AND auth.role() = 'authenticated'
);

-- Policy: Authenticated users can update condo logos
CREATE POLICY "Allow authenticated update to condo logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'condo-logos'
  AND auth.role() = 'authenticated'
);

-- Policy: Authenticated users can delete condo logos
CREATE POLICY "Allow authenticated delete to condo logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'condo-logos'
  AND auth.role() = 'authenticated'
);

-- =============================================
-- Alternative: Allow anonymous uploads (if using anon key)
-- =============================================
-- If your app uses the anon key and doesn't have authenticated users,
-- uncomment these policies instead:

-- DROP POLICY IF EXISTS "Allow anon upload to staff photos" ON storage.objects;
-- CREATE POLICY "Allow anon upload to staff photos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'staff-photos');

-- DROP POLICY IF EXISTS "Allow anon upload to condo logos" ON storage.objects;
-- CREATE POLICY "Allow anon upload to condo logos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'condo-logos');

-- =============================================
-- Verify setup
-- =============================================
-- Run these queries to verify the buckets and policies were created:

-- SELECT * FROM storage.buckets;
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
