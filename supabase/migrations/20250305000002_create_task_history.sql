/*
  # Create task history table and related triggers

  1. New Tables
    - `task_history`
      - `id` (uuid, primary key)
      - `created_at` (timestamp with time zone)
      - `task_id` (uuid, references tasks)
      - `user_id` (uuid, references auth.users)
      - `field_name` (text) - The field that was changed
      - `old_value` (text) - The previous value
      - `new_value` (text) - The new value
      - `change_type` (text) - 'create', 'update', 'delete'

  2. Triggers
    - Add triggers to automatically track changes to tasks
*/

CREATE TABLE IF NOT EXISTS task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  task_id uuid REFERENCES tasks NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  change_type text NOT NULL CHECK (change_type IN ('create', 'update', 'delete'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history (task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_user_id ON task_history (user_id);
CREATE INDEX IF NOT EXISTS idx_task_history_created_at ON task_history (created_at);

-- Enable RLS
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- Create policies for regular users
CREATE POLICY "Users can read history of tasks they created or are assigned to"
  ON task_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_history.task_id
      AND (
        tasks.created_by = auth.uid() OR 
        tasks.assigned_to = auth.uid()
      )
    )
  );

-- Create policies for admins
CREATE POLICY "Admins can read all task history"
  ON task_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  );

-- Create function to track task changes
CREATE OR REPLACE FUNCTION track_task_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  field_name text;
  old_value text;
  new_value text;
  user_id uuid;
BEGIN
  -- Get the current user ID
  user_id := auth.uid();
  
  -- Handle different operations
  IF TG_OP = 'INSERT' THEN
    -- For new tasks, record creation
    INSERT INTO task_history (task_id, user_id, change_type, field_name, new_value)
    VALUES (NEW.id, user_id, 'create', 'task', NEW.title);
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- For updates, check each field and record changes
    IF NEW.title <> OLD.title THEN
      INSERT INTO task_history (task_id, user_id, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, user_id, 'update', 'title', OLD.title, NEW.title);
    END IF;
    
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      INSERT INTO task_history (task_id, user_id, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, user_id, 'update', 'description', OLD.description, NEW.description);
    END IF;
    
    IF NEW.status <> OLD.status THEN
      INSERT INTO task_history (task_id, user_id, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, user_id, 'update', 'status', OLD.status, NEW.status);
      
      -- If status changed to 'completed', update completed_at
      IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
        NEW.completed_at := now();
      ELSIF NEW.status <> 'completed' AND OLD.status = 'completed' THEN
        NEW.completed_at := NULL;
      END IF;
    END IF;
    
    IF NEW.priority <> OLD.priority THEN
      INSERT INTO task_history (task_id, user_id, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, user_id, 'update', 'priority', OLD.priority, NEW.priority);
    END IF;
    
    IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
      INSERT INTO task_history (task_id, user_id, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, user_id, 'update', 'due_date', OLD.due_date::text, NEW.due_date::text);
    END IF;
    
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO task_history (task_id, user_id, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, user_id, 'update', 'assigned_to', OLD.assigned_to::text, NEW.assigned_to::text);
    END IF;
    
    IF NEW.project IS DISTINCT FROM OLD.project THEN
      INSERT INTO task_history (task_id, user_id, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, user_id, 'update', 'project', OLD.project, NEW.project);
    END IF;
    
    IF NEW.estimated_hours IS DISTINCT FROM OLD.estimated_hours THEN
      INSERT INTO task_history (task_id, user_id, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, user_id, 'update', 'estimated_hours', OLD.estimated_hours::text, NEW.estimated_hours::text);
    END IF;
    
    IF NEW.actual_hours IS DISTINCT FROM OLD.actual_hours THEN
      INSERT INTO task_history (task_id, user_id, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, user_id, 'update', 'actual_hours', OLD.actual_hours::text, NEW.actual_hours::text);
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- For deletions, record the deletion
    INSERT INTO task_history (task_id, user_id, change_type, field_name, old_value)
    VALUES (OLD.id, user_id, 'delete', 'task', OLD.title);
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_task_changes ON tasks;
CREATE TRIGGER trigger_task_changes
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION track_task_changes(); 