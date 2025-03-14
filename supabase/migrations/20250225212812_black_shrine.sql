/*
  # Add start and end times to time entries

  1. Changes
    - Add new columns to time_entries table:
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
    - Add check constraint to ensure end_time is after start_time
    - Make duration a computed column based on start and end times

  2. Security
    - Existing RLS policies remain unchanged
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_entries' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE time_entries 
      ADD COLUMN start_time timestamptz NOT NULL,
      ADD COLUMN end_time timestamptz NOT NULL,
      ADD CONSTRAINT end_time_after_start_time CHECK (end_time > start_time),
      DROP COLUMN duration;

    ALTER TABLE time_entries
      ADD COLUMN duration numeric GENERATED ALWAYS AS (
        EXTRACT(epoch FROM (end_time - start_time)) / 3600
      ) STORED;
  END IF;
END $$;