/*
  # Link time entries to tasks

  1. Changes
    - Add task_id field to time_entries table
    - Create function to link time entries to tasks
    - Create function to get time entries for a task

  2. Security
    - Existing RLS policies remain unchanged
*/

-- Add task_id field to time_entries table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_entries' AND column_name = 'task_id'
  ) THEN
    ALTER TABLE time_entries 
      ADD COLUMN task_id uuid REFERENCES tasks(id);
    
    CREATE INDEX IF NOT EXISTS idx_time_entries_task_id 
      ON time_entries (task_id);
  END IF;
END $$;

-- Function to link a time entry to a task
CREATE OR REPLACE FUNCTION link_time_entry_to_task(
  time_entry_id uuid,
  task_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  time_entry_user_id uuid;
  task_creator_id uuid;
  task_assignee_id uuid;
  is_admin boolean;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Check if the current user is an admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = current_user_id
  ) INTO is_admin;
  
  -- Get the time entry user ID
  SELECT user_id INTO time_entry_user_id
  FROM time_entries
  WHERE id = time_entry_id;
  
  -- Get the task creator and assignee IDs
  SELECT created_by, assigned_to INTO task_creator_id, task_assignee_id
  FROM tasks
  WHERE id = task_id;
  
  -- Check if the current user is authorized to link the time entry to the task
  IF NOT (
    is_admin 
    OR (current_user_id = time_entry_user_id AND (
      current_user_id = task_creator_id 
      OR current_user_id = task_assignee_id
    ))
  ) THEN
    RAISE EXCEPTION 'Not authorized to link this time entry to this task';
    RETURN false;
  END IF;
  
  -- Update the time entry
  UPDATE time_entries
  SET task_id = task_id
  WHERE id = time_entry_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error linking time entry to task: %', SQLERRM;
    RETURN false;
END;
$$;

-- Function to get time entries for a task
CREATE OR REPLACE FUNCTION get_task_time_entries(
  task_id uuid
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  duration numeric,
  user_id uuid,
  user_email text,
  project text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  task_creator_id uuid;
  task_assignee_id uuid;
  is_admin boolean;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Check if the current user is an admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = current_user_id
  ) INTO is_admin;
  
  -- Get the task creator and assignee IDs
  SELECT created_by, assigned_to INTO task_creator_id, task_assignee_id
  FROM tasks
  WHERE id = task_id;
  
  -- Check if the current user is authorized to view the task time entries
  IF NOT (is_admin OR current_user_id = task_creator_id OR current_user_id = task_assignee_id) THEN
    RAISE EXCEPTION 'Not authorized to view time entries for this task';
    RETURN;
  END IF;
  
  -- Return the time entries
  RETURN QUERY
  SELECT 
    te.id,
    te.created_at,
    te.description,
    te.start_time,
    te.end_time,
    te.duration,
    te.user_id,
    (SELECT email FROM auth.users WHERE id = te.user_id) AS user_email,
    te.project
  FROM 
    time_entries te
  WHERE 
    te.task_id = task_id
  ORDER BY 
    te.start_time DESC;
END;
$$;

-- Function to update task actual hours based on linked time entries
CREATE OR REPLACE FUNCTION update_task_actual_hours(
  task_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_hours numeric;
BEGIN
  -- Calculate total hours from linked time entries
  SELECT COALESCE(SUM(duration), 0) INTO total_hours
  FROM time_entries
  WHERE task_id = task_id;
  
  -- Update the task
  UPDATE tasks
  SET actual_hours = total_hours
  WHERE id = task_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error updating task actual hours: %', SQLERRM;
    RETURN false;
END;
$$;

-- Create trigger to update task actual hours when time entries are linked or updated
CREATE OR REPLACE FUNCTION trigger_update_task_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If task_id is set or changed, update the task's actual hours
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.task_id IS NOT NULL THEN
      PERFORM update_task_actual_hours(NEW.task_id);
    END IF;
    
    -- If task_id was changed, also update the old task's hours
    IF TG_OP = 'UPDATE' AND OLD.task_id IS DISTINCT FROM NEW.task_id AND OLD.task_id IS NOT NULL THEN
      PERFORM update_task_actual_hours(OLD.task_id);
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.task_id IS NOT NULL THEN
    -- If a time entry is deleted, update the associated task's hours
    PERFORM update_task_actual_hours(OLD.task_id);
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_time_entries_task_hours ON time_entries;
CREATE TRIGGER trigger_time_entries_task_hours
AFTER INSERT OR UPDATE OR DELETE ON time_entries
FOR EACH ROW
EXECUTE FUNCTION trigger_update_task_hours(); 