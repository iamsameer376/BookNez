-- Allow authenticated users to view other profiles' basic info
-- This is necessary to show the real name of the reviewer in the reviews list
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);
