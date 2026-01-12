-- Create Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    reply TEXT, -- For owner replies
    reply_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 1. PUBLIC READ: Everyone can read reviews
CREATE POLICY "Public can view reviews" 
ON public.reviews FOR SELECT 
USING (true);

-- 2. AUTHENTICATED INSERT: Users can review
-- (Ideally check for booking, but for verified implementation allow auth users)
CREATE POLICY "Authenticated users can create reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. OWNER REPLY: Owners can update reviews ONLY for their venues
CREATE POLICY "Owners can reply to reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = reviews.venue_id
        AND venues.owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = reviews.venue_id
        AND venues.owner_id = auth.uid()
    )
);
