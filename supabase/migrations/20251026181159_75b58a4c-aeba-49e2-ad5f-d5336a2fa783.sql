-- Add opening and closing time columns to venues table
ALTER TABLE public.venues
ADD COLUMN opening_time TEXT DEFAULT '06:00 AM',
ADD COLUMN closing_time TEXT DEFAULT '11:00 PM';

-- Update existing venues with default times if null
UPDATE public.venues
SET opening_time = '06:00 AM', closing_time = '11:00 PM'
WHERE opening_time IS NULL OR closing_time IS NULL;