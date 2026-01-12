-- Add RLS policy to allow reading security questions for password reset
-- This is needed so users can verify their identity when they forget their password
CREATE POLICY "Allow reading security questions for password reset"
ON public.profiles
FOR SELECT
TO anon
USING (true);