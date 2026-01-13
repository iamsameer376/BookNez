-- Fix missing columns in venues table
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS peak_hours text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sports text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS latitude double precision DEFAULT NULL,
ADD COLUMN IF NOT EXISTS longitude double precision DEFAULT NULL;

-- Backfill default values where appropriate
UPDATE venues 
SET peak_hours = '{}' 
WHERE peak_hours IS NULL;

-- Ensure sports exists for turf venues
UPDATE venues 
SET sports = ARRAY['Cricket'] 
WHERE category = 'turf' AND (sports IS NULL OR sports = '{}');

-- Notify completion
DO $$
BEGIN
    RAISE NOTICE 'Fixed venues table schema by ensuring peak_hours, sports, and location columns exist';
END $$;
