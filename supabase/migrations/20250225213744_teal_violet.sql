/*
  # Fix admin policies and queries

  1. Changes
    - Fix infinite recursion in admin_users policies
    - Update time entries policies for proper admin access

  2. Security
    - Maintain RLS security while fixing policy issues
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can read admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can view all time entries" ON time_entries;

-- Create new admin_users policies
CREATE POLICY "Anyone can read admin_users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Update time entries policies
CREATE POLICY "Admins can view all time entries"
  ON time_entries
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );