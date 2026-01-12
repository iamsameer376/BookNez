-- Revert the overly permissive policy
DROP POLICY IF EXISTS "Allow reading security questions for password reset" ON public.profiles;

-- Security note: We should not expose profiles table to anonymous users
-- Password reset will work through email verification only
-- Security questions feature requires backend implementation for proper security