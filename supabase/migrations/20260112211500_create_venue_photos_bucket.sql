-- Create the 'venue_photos' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue_photos', 'venue_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS) on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow Public Read Access (Anyone can view images)
-- We drop first to avoid conflicts if re-running
DROP POLICY IF EXISTS "Public Access Venue Photos" ON storage.objects;
CREATE POLICY "Public Access Venue Photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'venue_photos' );

-- Policy: Allow Authenticated Users to Upload (Owners)
DROP POLICY IF EXISTS "Authenticated Upload Venue Photos" ON storage.objects;
CREATE POLICY "Authenticated Upload Venue Photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'venue_photos' );

-- Policy: Allow Users to Update/Delete their own uploads
DROP POLICY IF EXISTS "Owner Manage Venue Photos" ON storage.objects;
CREATE POLICY "Owner Manage Venue Photos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'venue_photos' AND auth.uid() = owner );
