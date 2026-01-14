-- Add peak_price column to venues table
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS peak_price NUMERIC DEFAULT NULL;

-- Notify
DO $$
BEGIN
    RAISE NOTICE 'Added peak_price column to venues table';
END $$;
