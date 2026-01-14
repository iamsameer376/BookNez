-- Add amenities column to venues table if it doesn't exist
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}';

-- Backfill default value for nulls
UPDATE venues 
SET amenities = '{}' 
WHERE amenities IS NULL;

-- Notify completion
DO $$
BEGIN
    RAISE NOTICE 'Added amenities column to venues table';
END $$;
