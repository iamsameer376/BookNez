-- Add dynamic pricing and slot management tables
CREATE TABLE IF NOT EXISTS public.venue_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  price NUMERIC NOT NULL,
  is_frozen BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(venue_id, date, time_slot)
);

-- Enable RLS
ALTER TABLE public.venue_pricing ENABLE ROW LEVEL SECURITY;

-- Owners can manage pricing for their venues
CREATE POLICY "Owners can view pricing for their venues"
  ON public.venue_pricing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE venues.id = venue_pricing.venue_id
      AND venues.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can insert pricing for their venues"
  ON public.venue_pricing FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE venues.id = venue_pricing.venue_id
      AND venues.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update pricing for their venues"
  ON public.venue_pricing FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE venues.id = venue_pricing.venue_id
      AND venues.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete pricing for their venues"
  ON public.venue_pricing FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE venues.id = venue_pricing.venue_id
      AND venues.owner_id = auth.uid()
    )
  );

-- Users can view pricing for active venues
CREATE POLICY "Users can view pricing for active venues"
  ON public.venue_pricing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE venues.id = venue_pricing.venue_id
      AND venues.is_active = true
    )
  );

-- Create index for better performance
CREATE INDEX idx_venue_pricing_venue_date ON public.venue_pricing(venue_id, date);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_venue_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_pricing_updated_at
  BEFORE UPDATE ON public.venue_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_venue_pricing_updated_at();