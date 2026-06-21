-- Add Stripe fields to users (per organizer/tenant)
ALTER TABLE users ADD COLUMN stripe_account_id TEXT;
ALTER TABLE users ADD COLUMN stripe_onboarding_completed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN stripe_account_status TEXT; -- 'pending', 'active', 'disabled'

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  user_id TEXT NOT NULL, -- compratore
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_session_id TEXT UNIQUE NOT NULL,
  amount_total INTEGER NOT NULL, -- in cents
  amount_platform_fee INTEGER NOT NULL,
  amount_organizer INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'succeeded', 'failed', 'refunded'
  payment_method TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add cash payment support
ALTER TABLE bookings ADD COLUMN payment_method TEXT DEFAULT 'stripe'; -- 'stripe', 'cash'
ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT 'pending'; -- 'pending', 'paid', 'failed'
ALTER TABLE events ADD COLUMN accepts_cash INTEGER DEFAULT 1;
