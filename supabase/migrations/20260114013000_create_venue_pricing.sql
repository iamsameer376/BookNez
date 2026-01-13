-- Create venue_pricing table
CREATE TABLE IF NOT EXISTS public.venue_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    is_frozen BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(venue_id, date, time_slot)
);

-- Enable RLS
ALTER TABLE public.venue_pricing ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Venue owners can view their pricing" 
ON public.venue_pricing FOR SELECT 
USING (auth.uid() IN (SELECT owner_id FROM public.venues WHERE id = venue_id));

CREATE POLICY "Venue owners can insert their pricing" 
ON public.venue_pricing FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT owner_id FROM public.venues WHERE id = venue_id));

CREATE POLICY "Venue owners can update their pricing" 
ON public.venue_pricing FOR UPDATE 
USING (auth.uid() IN (SELECT owner_id FROM public.venues WHERE id = venue_id));

CREATE POLICY "Venue owners can delete their pricing" 
ON public.venue_pricing FOR DELETE 
USING (auth.uid() IN (SELECT owner_id FROM public.venues WHERE id = venue_id));

-- Notify
DO $$
BEGIN
    RAISE NOTICE 'Created venue_pricing table';
END $$;
