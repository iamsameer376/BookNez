-- Add unique constraint to prevent duplicate bookings for same venue, date, and time
CREATE UNIQUE INDEX IF NOT EXISTS unique_venue_booking 
ON bookings(venue_id, booking_date, booking_time) 
WHERE status IN ('confirmed', 'completed');