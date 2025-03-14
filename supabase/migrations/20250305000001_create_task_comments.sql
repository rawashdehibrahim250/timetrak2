/*
  # Create task comments table and related functionality

  1. New Tables
    - `task_comments`
      - `id` (uuid, primary key)
      - `created_at` (timestamp with time zone)
      - `task_id` (uuid, references tasks)
      - `user_id` (uuid, references auth.users)
      - `content` (text)
      - `is_internal` (boolean) - Whether the comment is only visible to team members

  2. Security
    - Enable RLS on `task_comments` table
    - Add policies for authenticated users to:
      - Read comments on tasks they created or are assigned to
      - Create new comments on tasks they can access
    - Add policies for admins to:
      - Read all comments
      - Create comments on any task
*/

CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  task_id uuid REFERENCES tasks NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  content text NOT NULL,
  is_internal boolean DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments (task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments (user_id);

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for regular users
CREATE POLICY "Users can read comments on tasks they created or are assigned to"
  ON task_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_comments.task_id
      AND (
        tasks.created_by = auth.uid() OR 
        tasks.assigned_to = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create comments on tasks they can access"
  ON task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_comments.task_id
      AND (
        tasks.created_by = auth.uid() OR 
        tasks.assigned_to = auth.uid()
      )
    )
  );

-- Create policies for admins
CREATE POLICY "Admins can read all comments"
  ON task_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can create comments on any task"
  ON task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete any comment"
  ON task_comments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  ); 