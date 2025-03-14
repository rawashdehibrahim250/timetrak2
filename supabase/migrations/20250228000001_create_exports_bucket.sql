/*
  # Create exports bucket for Excel reports

  1. Changes
    - Create a new storage bucket for Excel exports
    - Set RLS policies to allow admins to access the bucket

  2. Security
    - Only admins can access the exports bucket
*/

-- Create the exports bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('exports', 'exports', false)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Create policy to allow admins to read from the bucket
DO $$
BEGIN
  INSERT INTO storage.policies (name, definition, bucket_id)
  VALUES (
    'Admin Read Policy',
    '(auth.uid() IN (SELECT id FROM admin_users))',
    'exports'
  )
  ON CONFLICT (name, bucket_id) DO NOTHING;
END $$;

-- Create policy to allow admins to insert into the bucket
DO $$
BEGIN
  INSERT INTO storage.policies (name, definition, bucket_id, operation)
  VALUES (
    'Admin Insert Policy',
    '(auth.uid() IN (SELECT id FROM admin_users))',
    'exports',
    'INSERT'
  )
  ON CONFLICT (name, bucket_id) DO NOTHING;
END $$;

-- Create policy to allow admins to update files in the bucket
DO $$
BEGIN
  INSERT INTO storage.policies (name, definition, bucket_id, operation)
  VALUES (
    'Admin Update Policy',
    '(auth.uid() IN (SELECT id FROM admin_users))',
    'exports',
    'UPDATE'
  )
  ON CONFLICT (name, bucket_id) DO NOTHING;
END $$; 