/*
  # Create functions for workload analysis

  1. Functions
    - `get_user_workload` - Get workload information for all users
    - `get_task_distribution` - Get task distribution by status
    - `get_user_task_stats` - Get task statistics for a specific user
*/

-- Function to get workload information for all users
CREATE OR REPLACE FUNCTION get_user_workload()
RETURNS TABLE (
  id uuid,
  email text,
  active_tasks_count bigint,
  completed_tasks_count bigint,
  total_hours numeric,
  avg_completion_time numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_tasks AS (
    SELECT
      u.id AS user_id,
      u.email,
      COUNT(CASE WHEN t.status IN ('pending', 'in_progress') THEN 1 END) AS active_tasks,
      COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS completed_tasks,
      COALESCE(SUM(te.duration), 0) AS total_hours,
      CASE
        WHEN COUNT(CASE WHEN t.status = 'completed' AND t.completed_at IS NOT NULL THEN 1 END) > 0 THEN
          AVG(
            EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600
          ) FILTER (WHERE t.status = 'completed' AND t.completed_at IS NOT NULL)
        ELSE 0
      END AS avg_completion_time
    FROM
      auth.users u
    LEFT JOIN
      tasks t ON t.assigned_to = u.id
    LEFT JOIN
      time_entries te ON te.user_id = u.id
    GROUP BY
      u.id, u.email
  )
  SELECT
    ut.user_id,
    ut.email,
    ut.active_tasks,
    ut.completed_tasks,
    ut.total_hours,
    ut.avg_completion_time
  FROM
    user_tasks ut
  ORDER BY
    ut.active_tasks DESC,
    ut.total_hours DESC;
END;
$$;

-- Function to get task distribution by status
CREATE OR REPLACE FUNCTION get_task_distribution()
RETURNS TABLE (
  status text,
  count bigint,
  percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_count bigint;
BEGIN
  -- Get total count of tasks
  SELECT COUNT(*) INTO total_count FROM tasks;
  
  -- Return distribution
  RETURN QUERY
  SELECT
    t.status,
    COUNT(*) AS count,
    CASE
      WHEN total_count > 0 THEN ROUND((COUNT(*) * 100.0 / total_count), 2)
      ELSE 0
    END AS percentage
  FROM
    tasks t
  GROUP BY
    t.status
  ORDER BY
    CASE 
      WHEN t.status = 'in_progress' THEN 1
      WHEN t.status = 'pending' THEN 2
      WHEN t.status = 'completed' THEN 3
      WHEN t.status = 'cancelled' THEN 4
      ELSE 5
    END;
END;
$$;

-- Function to get task statistics for a specific user
CREATE OR REPLACE FUNCTION get_user_task_stats(
  user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  pending_count bigint,
  in_progress_count bigint,
  completed_count bigint,
  cancelled_count bigint,
  total_count bigint,
  avg_completion_time numeric,
  overdue_count bigint,
  completion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_task_counts AS (
    SELECT
      COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) AS in_progress_count,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_count,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_count,
      COUNT(*) AS total_count,
      CASE
        WHEN COUNT(CASE WHEN status = 'completed' AND completed_at IS NOT NULL THEN 1 END) > 0 THEN
          AVG(
            EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
          ) FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL)
        ELSE 0
      END AS avg_completion_time,
      COUNT(CASE WHEN due_date < now() AND status != 'completed' THEN 1 END) AS overdue_count,
      CASE
        WHEN COUNT(CASE WHEN status IN ('completed', 'cancelled') THEN 1 END) > 0 THEN
          ROUND(
            (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0) /
            COUNT(CASE WHEN status IN ('completed', 'cancelled') THEN 1 END),
            2
          )
        ELSE 0
      END AS completion_rate
    FROM
      tasks
    WHERE
      assigned_to = user_id
  )
  SELECT
    utc.pending_count,
    utc.in_progress_count,
    utc.completed_count,
    utc.cancelled_count,
    utc.total_count,
    utc.avg_completion_time,
    utc.overdue_count,
    utc.completion_rate
  FROM
    user_task_counts utc;
END;
$$; 