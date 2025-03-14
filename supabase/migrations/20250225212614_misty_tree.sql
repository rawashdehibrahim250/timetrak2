/*
  # Create time entries table

  1. New Tables
    - `time_entries`
      - `id` (uuid, primary key)
      - `created_at` (timestamp with time zone)
      - `description` (text)
      - `duration` (numeric)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `time_entries` table
    - Add policies for authenticated users to:
      - Read their own time entries
      - Create new time entries
*/

CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  description text NOT NULL,
  duration numeric NOT NULL CHECK (duration > 0),
  user_id uuid REFERENCES auth.users NOT NULL
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own time entries"
  ON time_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own time entries"
  ON time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);