/*
  # Add trigger for Excel export updates

  1. Changes
    - Create a function to invoke the update-excel-file Edge Function
    - Add triggers to call this function when time entries are modified

  2. Security
    - Function runs with security definer privileges
*/

-- Create function to invoke the Edge Function
CREATE OR REPLACE FUNCTION public.trigger_update_excel_export()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result TEXT;
BEGIN
  -- Call the Edge Function to update the Excel file
  SELECT
    content::TEXT INTO result
  FROM
    http((
      'POST',
      CONCAT(
        current_setting('app.settings.service_role_base_url'),
        '/functions/v1/update-excel-file'
      ),
      ARRAY[
        http_header('Authorization', CONCAT('Bearer ', current_setting('app.settings.service_role_key'))),
        http_header('Content-Type', 'application/json')
      ],
      '{}',
      NULL
    )::http_request);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error calling update-excel-file function: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Add trigger for INSERT operations
DROP TRIGGER IF EXISTS trigger_time_entries_insert ON public.time_entries;
CREATE TRIGGER trigger_time_entries_insert
AFTER INSERT ON public.time_entries
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_update_excel_export();

-- Add trigger for UPDATE operations
DROP TRIGGER IF EXISTS trigger_time_entries_update ON public.time_entries;
CREATE TRIGGER trigger_time_entries_update
AFTER UPDATE ON public.time_entries
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_update_excel_export();

-- Add trigger for DELETE operations
DROP TRIGGER IF EXISTS trigger_time_entries_delete ON public.time_entries;
CREATE TRIGGER trigger_time_entries_delete
AFTER DELETE ON public.time_entries
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_update_excel_export();

-- Enable the pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net; 