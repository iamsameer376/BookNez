-- Enable RLS updates/deletes for Admins

-- 1. ADmins can UPDATE venues (Approve/Reject)
DROP POLICY IF EXISTS "Admins can update venues" ON venues;
CREATE POLICY "Admins can update venues" 
ON venues 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 2. Admins can DELETE venues
DROP POLICY IF EXISTS "Admins can delete venues" ON venues;
CREATE POLICY "Admins can delete venues" 
ON venues 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 3. Admins can DELETE bookings (Cascade for venue deletion)
DROP POLICY IF EXISTS "Admins can delete bookings" ON bookings;
CREATE POLICY "Admins can delete bookings" 
ON bookings 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 4. Admins can DELETE venue_pricing (Cascade for venue deletion)
DROP POLICY IF EXISTS "Admins can delete venue_pricing" ON venue_pricing;
CREATE POLICY "Admins can delete venue_pricing" 
ON venue_pricing 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
