ALTER TABLE bookings ADD COLUMN payment_intent_id TEXT;
CREATE INDEX idx_bookings_payment_intent ON bookings(payment_intent_id);
