-- Add location fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS country text;

-- Make phone number required for login
ALTER TABLE public.profiles 
ALTER COLUMN phone SET NOT NULL;

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Function to find user by phone or email
CREATE OR REPLACE FUNCTION public.find_user_by_phone_or_email(input_value text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id uuid;
BEGIN
  -- Try to find by phone first
  SELECT id INTO found_user_id
  FROM public.profiles
  WHERE phone = input_value
  LIMIT 1;
  
  -- If not found, try by email
  IF found_user_id IS NULL THEN
    SELECT id INTO found_user_id
    FROM auth.users
    WHERE email = input_value
    LIMIT 1;
  END IF;
  
  RETURN found_user_id;
END;
$$;