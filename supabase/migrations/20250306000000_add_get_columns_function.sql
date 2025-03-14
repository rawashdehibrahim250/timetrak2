/*
  # Add function to get columns for a table

  1. Functions
    - `get_columns_for_table` - Get column information for a specified table
*/

-- Function to get columns for a table
CREATE OR REPLACE FUNCTION get_columns_for_table(
  table_name text
)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text,
    (c.is_nullable = 'YES') AS is_nullable
  FROM 
    information_schema.columns c
  WHERE 
    c.table_schema = 'public'
    AND c.table_name = table_name
  ORDER BY 
    c.ordinal_position;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_columns_for_table TO authenticated; 