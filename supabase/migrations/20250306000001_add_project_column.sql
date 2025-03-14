/*
  # Add project column to time_entries table

  1. Modifications
    - Add `project` column to `time_entries` table if it doesn't exist
*/

-- Check if the project column exists and add it if it doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'time_entries'
      AND column_name = 'project'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN project text;
  END IF;
END $$; 