/*
  # Add admin role and policies

  1. Changes
    - Create admin_users table to track admin status
    - Add policies for admin access
    - Set initial admin user

  2. Security
    - Enable RLS on admin_users table
    - Add policies for admin access to all time entries
*/

-- Create admin_users table
DO $$ 
BEGIN
  CREATE TABLE IF NOT EXISTS admin_users (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admins can read admin_users" ON admin_users;
  CREATE POLICY "Admins can read admin_users"
    ON admin_users
    FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    ));
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admins can view all time entries" ON time_entries;
  CREATE POLICY "Admins can view all time entries"
    ON time_entries
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM admin_users WHERE id = auth.uid()
      )
    );
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Set initial admin user
DO $$ 
DECLARE
  admin_email text := 'ibrahim250@icloud.com';
  user_id uuid;
BEGIN
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = admin_email;

  IF user_id IS NOT NULL THEN
    INSERT INTO admin_users (id)
    VALUES (user_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;