-- Delete all user registration data
TRUNCATE public.profiles CASCADE;
TRUNCATE public.user_roles CASCADE;

-- Note: Auth users need to be deleted from Supabase dashboard or via admin functions
-- This clears the app-specific data tables