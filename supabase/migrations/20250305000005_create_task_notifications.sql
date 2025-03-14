/*
  # Create task notifications table and related functionality

  1. New Tables
    - `task_notifications`
      - `id` (uuid, primary key)
      - `created_at` (timestamp with time zone)
      - `task_id` (uuid, references tasks)
      - `user_id` (uuid, references auth.users)
      - `message` (text)
      - `is_read` (boolean)

  2. Security
    - Enable RLS on `task_notifications` table
    - Add policies for authenticated users to:
      - Read their own notifications
      - Update their own notifications (to mark as read)
    - Add policies for admins to:
      - Read all notifications
      - Create notifications for any user
*/

CREATE TABLE IF NOT EXISTS task_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  task_id uuid REFERENCES tasks NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_notifications_task_id ON task_notifications (task_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_user_id ON task_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_is_read ON task_notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_task_notifications_created_at ON task_notifications (created_at);

-- Enable RLS
ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for regular users
CREATE POLICY "Users can read their own notifications"
  ON task_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON task_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for admins
CREATE POLICY "Admins can read all notifications"
  ON task_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can create notifications for any user"
  ON task_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update any notification"
  ON task_notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  );

-- Create function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(
  user_id uuid DEFAULT auth.uid()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_result integer;
BEGIN
  SELECT COUNT(*) INTO count_result
  FROM task_notifications
  WHERE user_id = get_unread_notification_count.user_id
  AND is_read = false;
  
  RETURN count_result;
END;
$$; 