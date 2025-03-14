/*
  # Create functions for task management

  1. Functions
    - `get_user_tasks` - Get tasks for a user (created or assigned)
    - `assign_task` - Assign a task to a user
    - `update_task_status` - Update the status of a task
    - `get_task_with_comments` - Get a task with its comments
    - `get_task_history` - Get the history of a task
    - `get_project_tasks` - Get tasks for a specific project
*/

-- Function to get tasks for a user
CREATE OR REPLACE FUNCTION get_user_tasks(
  user_id uuid,
  status_filter text DEFAULT NULL,
  project_filter text DEFAULT NULL,
  limit_count int DEFAULT 100,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  title text,
  description text,
  status text,
  priority text,
  due_date timestamptz,
  created_by uuid,
  creator_email text,
  assigned_to uuid,
  assignee_email text,
  project text,
  estimated_hours numeric,
  actual_hours numeric,
  completed_at timestamptz,
  is_overdue boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.created_at,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.created_by,
    (SELECT email FROM auth.users WHERE id = t.created_by) AS creator_email,
    t.assigned_to,
    (SELECT email FROM auth.users WHERE id = t.assigned_to) AS assignee_email,
    t.project,
    t.estimated_hours,
    t.actual_hours,
    t.completed_at,
    (t.due_date < now() AND t.status != 'completed') AS is_overdue
  FROM 
    tasks t
  WHERE 
    (t.created_by = user_id OR t.assigned_to = user_id)
    AND (status_filter IS NULL OR t.status = status_filter)
    AND (project_filter IS NULL OR t.project = project_filter)
  ORDER BY 
    CASE 
      WHEN t.status = 'in_progress' THEN 1
      WHEN t.status = 'pending' THEN 2
      WHEN t.status = 'completed' THEN 3
      WHEN t.status = 'cancelled' THEN 4
      ELSE 5
    END,
    CASE 
      WHEN t.priority = 'urgent' THEN 1
      WHEN t.priority = 'high' THEN 2
      WHEN t.priority = 'medium' THEN 3
      WHEN t.priority = 'low' THEN 4
      ELSE 5
    END,
    t.due_date ASC NULLS LAST,
    t.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Function to assign a task to a user
CREATE OR REPLACE FUNCTION assign_task(
  task_id uuid,
  assignee_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  task_creator_id uuid;
  is_admin boolean;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Check if the current user is an admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = current_user_id
  ) INTO is_admin;
  
  -- Get the task creator ID
  SELECT created_by INTO task_creator_id
  FROM tasks
  WHERE id = task_id;
  
  -- Check if the current user is authorized to assign the task
  IF NOT (is_admin OR current_user_id = task_creator_id) THEN
    RAISE EXCEPTION 'Not authorized to assign this task';
    RETURN false;
  END IF;
  
  -- Update the task
  UPDATE tasks
  SET assigned_to = assignee_id
  WHERE id = task_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error assigning task: %', SQLERRM;
    RETURN false;
END;
$$;

-- Function to update the status of a task
CREATE OR REPLACE FUNCTION update_task_status(
  task_id uuid,
  new_status text
)
RETURNS boolean
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
  
  -- Check if the current user is authorized to update the task
  IF NOT (is_admin OR current_user_id = task_creator_id OR current_user_id = task_assignee_id) THEN
    RAISE EXCEPTION 'Not authorized to update this task';
    RETURN false;
  END IF;
  
  -- Update the task status
  UPDATE tasks
  SET 
    status = new_status,
    completed_at = CASE WHEN new_status = 'completed' THEN now() ELSE NULL END
  WHERE id = task_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error updating task status: %', SQLERRM;
    RETURN false;
END;
$$;

-- Function to get a task with its comments
CREATE OR REPLACE FUNCTION get_task_with_comments(
  task_id uuid
)
RETURNS TABLE (
  task_data json,
  comments json
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  task_creator_id uuid;
  task_assignee_id uuid;
  is_admin boolean;
  task_json json;
  comments_json json;
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
  
  -- Check if the current user is authorized to view the task
  IF NOT (is_admin OR current_user_id = task_creator_id OR current_user_id = task_assignee_id) THEN
    RAISE EXCEPTION 'Not authorized to view this task';
    RETURN;
  END IF;
  
  -- Get the task data
  SELECT 
    json_build_object(
      'id', t.id,
      'created_at', t.created_at,
      'title', t.title,
      'description', t.description,
      'status', t.status,
      'priority', t.priority,
      'due_date', t.due_date,
      'created_by', t.created_by,
      'creator_email', (SELECT email FROM auth.users WHERE id = t.created_by),
      'assigned_to', t.assigned_to,
      'assignee_email', (SELECT email FROM auth.users WHERE id = t.assigned_to),
      'project', t.project,
      'estimated_hours', t.estimated_hours,
      'actual_hours', t.actual_hours,
      'completed_at', t.completed_at,
      'is_overdue', (t.due_date < now() AND t.status != 'completed')
    )
  INTO task_json
  FROM tasks t
  WHERE t.id = task_id;
  
  -- Get the comments
  SELECT 
    json_agg(
      json_build_object(
        'id', c.id,
        'created_at', c.created_at,
        'user_id', c.user_id,
        'user_email', (SELECT email FROM auth.users WHERE id = c.user_id),
        'content', c.content,
        'is_internal', c.is_internal
      )
    )
  INTO comments_json
  FROM task_comments c
  WHERE c.task_id = task_id
  ORDER BY c.created_at DESC;
  
  -- Return the data
  task_data := task_json;
  comments := COALESCE(comments_json, '[]'::json);
  RETURN NEXT;
END;
$$;

-- Function to get the history of a task
CREATE OR REPLACE FUNCTION get_task_history(
  task_id uuid
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  user_id uuid,
  user_email text,
  field_name text,
  old_value text,
  new_value text,
  change_type text
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
  
  -- Check if the current user is authorized to view the task history
  IF NOT (is_admin OR current_user_id = task_creator_id OR current_user_id = task_assignee_id) THEN
    RAISE EXCEPTION 'Not authorized to view this task history';
    RETURN;
  END IF;
  
  -- Return the task history
  RETURN QUERY
  SELECT 
    h.id,
    h.created_at,
    h.user_id,
    (SELECT email FROM auth.users WHERE id = h.user_id) AS user_email,
    h.field_name,
    h.old_value,
    h.new_value,
    h.change_type
  FROM 
    task_history h
  WHERE 
    h.task_id = task_id
  ORDER BY 
    h.created_at DESC;
END;
$$;

-- Function to get tasks for a specific project
CREATE OR REPLACE FUNCTION get_project_tasks(
  project_name text,
  status_filter text DEFAULT NULL,
  limit_count int DEFAULT 100,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  title text,
  description text,
  status text,
  priority text,
  due_date timestamptz,
  created_by uuid,
  creator_email text,
  assigned_to uuid,
  assignee_email text,
  project text,
  estimated_hours numeric,
  actual_hours numeric,
  completed_at timestamptz,
  is_overdue boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  is_admin boolean;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Check if the current user is an admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = current_user_id
  ) INTO is_admin;
  
  -- Return the project tasks
  RETURN QUERY
  SELECT 
    t.id,
    t.created_at,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.created_by,
    (SELECT email FROM auth.users WHERE id = t.created_by) AS creator_email,
    t.assigned_to,
    (SELECT email FROM auth.users WHERE id = t.assigned_to) AS assignee_email,
    t.project,
    t.estimated_hours,
    t.actual_hours,
    t.completed_at,
    (t.due_date < now() AND t.status != 'completed') AS is_overdue
  FROM 
    tasks t
  WHERE 
    t.project = project_name
    AND (status_filter IS NULL OR t.status = status_filter)
    AND (
      is_admin 
      OR t.created_by = current_user_id 
      OR t.assigned_to = current_user_id
    )
  ORDER BY 
    CASE 
      WHEN t.status = 'in_progress' THEN 1
      WHEN t.status = 'pending' THEN 2
      WHEN t.status = 'completed' THEN 3
      WHEN t.status = 'cancelled' THEN 4
      ELSE 5
    END,
    CASE 
      WHEN t.priority = 'urgent' THEN 1
      WHEN t.priority = 'high' THEN 2
      WHEN t.priority = 'medium' THEN 3
      WHEN t.priority = 'low' THEN 4
      ELSE 5
    END,
    t.due_date ASC NULLS LAST,
    t.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$; 