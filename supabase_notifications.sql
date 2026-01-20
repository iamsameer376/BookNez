-- Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'broadcast'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create Announcements Table (For Broadcasts)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_role TEXT NOT NULL, -- 'all', 'owner', 'user'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policies for Notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
CREATE POLICY "Admins can insert notifications" 
ON notifications FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users can update their own notifications (mark as read)" ON notifications;
CREATE POLICY "Users can update their own notifications (mark as read)" 
ON notifications FOR UPDATE 
USING (auth.uid() = recipient_id);

-- Policies for Announcements
DROP POLICY IF EXISTS "Anyone can view announcements matching their role or 'all'" ON announcements;
CREATE POLICY "Anyone can view announcements matching their role or 'all'" 
ON announcements FOR SELECT 
USING (
  target_role = 'all' 
  OR 
  (target_role = 'owner' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'owner'))
  OR
  (target_role = 'user' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'user'))
);

DROP POLICY IF EXISTS "Admins can insert announcements" ON announcements;
CREATE POLICY "Admins can insert announcements" 
ON announcements FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Function to handle new announcements and fan-out to notifications
CREATE OR REPLACE FUNCTION handle_new_announcement() 
RETURNS TRIGGER AS $$
DECLARE
  target_user RECORD;
BEGIN
  -- Loop through users based on target_role
  FOR target_user IN 
    SELECT user_id FROM user_roles 
    WHERE 
      (NEW.target_role = 'all') 
      OR 
      (NEW.target_role = 'owner' AND role = 'owner')
      OR 
      (NEW.target_role = 'user' AND role = 'user')
  LOOP
    INSERT INTO notifications (recipient_id, title, message, type, created_at)
    VALUES (target_user.user_id, NEW.title, NEW.message, 'broadcast', NOW());
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for announcements
DROP TRIGGER IF EXISTS on_announcement_created ON announcements;
CREATE TRIGGER on_announcement_created
AFTER INSERT ON announcements
FOR EACH ROW EXECUTE FUNCTION handle_new_announcement();
