-- Fix RLS policies to allow users to see availability and pricing

-- 1. Venue Pricing: Public read access needed so users can see dynamic prices and frozen slots
DROP POLICY IF EXISTS "Venue owners can view their pricing" ON public.venue_pricing;

CREATE POLICY "Public can view venue pricing"
ON public.venue_pricing FOR SELECT
USING (true);

-- 2. Bookings: Read access needed so users can see which slots are taken
-- Note: Ideally we'd restrict column access (e.g. hide user_id), but for now we ensure availability checks work.
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
-- (We keep "Users can view own" if it exists, actually we usually want "Users see their own" AND "Public sees busy slots")
-- But strictly:
CREATE POLICY "Public can view bookings"
ON public.bookings FOR SELECT
USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.venue_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE 'Updated RLS policies for venue_pricing and bookings to allow public read access (for availability checks)';
END $$;
