/*
  # Add user email access for admin view

  1. Changes
    - Create a function to access user emails for admin display
    - This approach avoids the need to enable RLS on views

  2. Security
    - Maintain RLS security while allowing admin access to user data
    - Function checks if the current user is an admin before returning results
*/

-- Create a function to get user emails that respects admin permissions
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin BOOLEAN;
  user_email TEXT;
BEGIN
  -- Check if the current user is an admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  ) INTO is_admin;
  
  -- If admin, return the email, otherwise return null
  IF is_admin THEN
    SELECT email INTO user_email FROM auth.users WHERE id = user_id;
    RETURN user_email;
  ELSE
    -- Only return the email if it belongs to the current user
    IF user_id = auth.uid() THEN
      SELECT email INTO user_email FROM auth.users WHERE id = user_id;
      RETURN user_email;
    ELSE
      RETURN NULL;
    END IF;
  END IF;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_email(UUID) TO authenticated;