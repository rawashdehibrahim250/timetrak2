/*
  # Create tasks table and related functionality

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `created_at` (timestamp with time zone)
      - `title` (text)
      - `description` (text)
      - `status` (text) - 'pending', 'in_progress', 'completed', 'cancelled'
      - `priority` (text) - 'low', 'medium', 'high', 'urgent'
      - `due_date` (timestamptz, nullable)
      - `created_by` (uuid, references auth.users)
      - `assigned_to` (uuid, references auth.users, nullable)
      - `project` (text, nullable)
      - `estimated_hours` (numeric, nullable)
      - `actual_hours` (numeric, nullable)
      - `completed_at` (timestamptz, nullable)

  2. Security
    - Enable RLS on `tasks` table
    - Add policies for authenticated users to:
      - Read tasks they created or are assigned to
      - Create new tasks
      - Update tasks they created or are assigned to
    - Add policies for admins to:
      - Read all tasks
      - Create and update any task
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date timestamptz,
  created_by uuid REFERENCES auth.users NOT NULL,
  assigned_to uuid REFERENCES auth.users,
  project text,
  estimated_hours numeric CHECK (estimated_hours > 0),
  actual_hours numeric CHECK (actual_hours >= 0),
  completed_at timestamptz
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks (created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks (project);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for regular users
CREATE POLICY "Users can read tasks they created or are assigned to"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by OR 
    auth.uid() = assigned_to
  );

CREATE POLICY "Users can create tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update tasks they created or are assigned to"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR 
    auth.uid() = assigned_to
  );

-- Create policies for admins
CREATE POLICY "Admins can read all tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can create any task"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update any task"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete any task"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  ); 