/*
  # Add indexes for performance optimization

  1. Changes
    - Add index on time_entries.user_id for faster user-specific queries
    - Add index on time_entries.start_time for faster date range filtering
    - Add index on time_entries.end_time for faster duration calculations
  
  2. Performance
    - These indexes will improve query performance for filtering operations
    - Particularly beneficial for admin views with many time entries
*/

-- Add index on user_id for faster filtering by user
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id 
ON time_entries(user_id);

-- Add index on start_time for faster date range queries
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time 
ON time_entries(start_time);

-- Add index on end_time for faster duration calculations
CREATE INDEX IF NOT EXISTS idx_time_entries_end_time 
ON time_entries(end_time);