-- Add sports column to venues table
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS sports text[] DEFAULT '{}';

-- Backfill existing venues with category 'turf' to have 'Cricket' as a default sport
UPDATE venues 
SET sports = ARRAY['Cricket'] 
WHERE category = 'turf' AND (sports IS NULL OR sports = '{}');

-- Notify that existing venues are updated
DO $$
BEGIN
    RAISE NOTICE 'Updated existing Turf venues to include Cricket';
END $$;
