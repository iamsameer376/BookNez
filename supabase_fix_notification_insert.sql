-- Allow users to insert notifications ONLY for themselves (needed for "Test Push")
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;

CREATE POLICY "Users can insert their own notifications" 
ON notifications FOR INSERT 
WITH CHECK (auth.uid() = recipient_id);
