ALTER TABLE bookings ADD COLUMN booking_group_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_bookings_group_ref ON bookings(booking_group_ref);
