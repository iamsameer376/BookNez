-- Fix RLS policies to allow owners to update their venues

-- Drop existing policy if it exists (name might vary, so we use DO block or just try create and ignore/replace)
-- Easiest is to drop by name if we know it.
DROP POLICY IF EXISTS "Venue owners can update their venues" ON public.venues;
DROP POLICY IF EXISTS "Enable update for owners" ON public.venues;

-- Create correct policy
CREATE POLICY "Venue owners can update their venues"
ON public.venues FOR UPDATE
USING (auth.uid() = owner_id);

-- Also ensure Select is allowed (usually is)
DROP POLICY IF EXISTS "Venue owners can view their venues" ON public.venues;
CREATE POLICY "Venue owners can view their venues"
ON public.venues FOR SELECT
USING (auth.uid() = owner_id);

-- Public needs to view for booking (using separate policy or public access?)
-- Usually "Public can view all venues"
DROP POLICY IF EXISTS "Public can view all venues" ON public.venues;
CREATE POLICY "Public can view all venues"
ON public.venues FOR SELECT
USING (true);

DO $$
BEGIN
    RAISE NOTICE 'Updated RLS policies for venues table';
END $$;
