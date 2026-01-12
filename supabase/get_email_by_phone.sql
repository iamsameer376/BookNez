-- Create a secure function to look up email by phone number
-- This function runs with "security definer" privileges, bypassing RLS
CREATE OR REPLACE FUNCTION get_email_by_phone(phone_number text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  found_email text;
BEGIN
  SELECT email INTO found_email
  FROM profiles
  WHERE phone = phone_number
  LIMIT 1;
  
  RETURN found_email;
END;
$$;

-- Grant execution permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION get_email_by_phone(text) TO anon, authenticated;
