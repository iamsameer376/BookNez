-- Add qr_scanned field to bookings table to track if QR was already used
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS qr_scanned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS qr_scanned_at TIMESTAMP WITH TIME ZONE;

-- Add email to profiles table for phone-based login
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing profiles with email from auth.users
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.id = auth.users.id AND profiles.email IS NULL;

COMMENT ON COLUMN public.bookings.qr_scanned IS 'Tracks if the QR code has been scanned';
COMMENT ON COLUMN public.bookings.qr_scanned_at IS 'Timestamp when QR code was scanned';
COMMENT ON COLUMN public.profiles.email IS 'Email address for login purposes';