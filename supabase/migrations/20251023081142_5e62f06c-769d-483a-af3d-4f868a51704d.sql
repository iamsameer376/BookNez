-- Add INSERT policy for user_roles table to allow users to set their role during registration
CREATE POLICY "Users can insert their own role during registration"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);