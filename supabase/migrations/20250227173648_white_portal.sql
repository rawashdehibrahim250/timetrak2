/*
  # Add description_summary field to time_entries table

  1. Changes
     - Add `description_summary` column to `time_entries` table to store AI-generated summaries
     - This allows for storing pre-generated summaries of long descriptions

  2. Benefits
     - Improves performance by avoiding real-time summarization
     - Provides consistent summaries across all views
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_entries' AND column_name = 'description_summary'
  ) THEN
    ALTER TABLE time_entries 
      ADD COLUMN description_summary text;
  END IF;
END $$;