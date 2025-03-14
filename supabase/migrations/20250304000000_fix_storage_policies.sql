/*
  # Fix storage policies for exports bucket
  
  1. Changes
    - Drop existing policies and recreate them with correct syntax
    - Ensure admins can access the exports bucket

  2. Security
    - Only admins can access the exports bucket
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admins to read exports" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role to write exports" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to update exports" ON storage.objects;

-- Create policy to allow admins to read exports
CREATE POLICY "Allow admins to read exports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports' AND
  auth.uid() IN (SELECT id FROM admin_users)
);

-- Create policy to allow admins to insert exports
CREATE POLICY "Allow admins to insert exports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exports' AND
  auth.uid() IN (SELECT id FROM admin_users)
);

-- Create policy to allow admins to update exports
CREATE POLICY "Allow admins to update exports"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exports' AND
  auth.uid() IN (SELECT id FROM admin_users)
);

-- Create policy to allow admins to delete exports
CREATE POLICY "Allow admins to delete exports"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'exports' AND
  auth.uid() IN (SELECT id FROM admin_users)
); 