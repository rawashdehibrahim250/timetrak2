/*
  # Add project field to time entries

  1. Changes
    - Add new column to time_entries table:
      - `project` (text, nullable)
    - Add index on project field for faster filtering

  2. Security
    - Existing RLS policies remain unchanged
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_entries' AND column_name = 'project'
  ) THEN
    ALTER TABLE time_entries 
      ADD COLUMN project text;
    
    CREATE INDEX IF NOT EXISTS idx_time_entries_project 
      ON time_entries (project);
  END IF;
END $$; 