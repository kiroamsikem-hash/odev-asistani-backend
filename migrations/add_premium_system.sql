-- Premium System Migration

-- Add premium fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_tier VARCHAR(20) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Premium Packages Table
CREATE TABLE IF NOT EXISTS premium_packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price INTEGER NOT NULL,
  daily_limit INTEGER NOT NULL,
  features JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert premium packages
INSERT INTO premium_packages (name, price, daily_limit, features) VALUES
('Temel', 99, 20, '["Günlük 20 soru", "Tüm özelliklere erişim", "Reklamsız deneyim"]'),
('Standart', 199, 60, '["Günlük 60 soru", "Tüm özelliklere erişim", "Reklamsız deneyim", "Öncelikli destek"]'),
('Premium', 399, 120, '["Günlük 120 soru", "Tüm özelliklere erişim", "Reklamsız deneyim", "Öncelikli destek", "Özel AI modelleri", "Sınırsız video analizi"]');

-- Premium Transactions Table
CREATE TABLE IF NOT EXISTS premium_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id INTEGER NOT NULL REFERENCES premium_packages(id),
  amount INTEGER NOT NULL,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_premium_transactions_user ON premium_transactions(user_id);
CREATE INDEX idx_premium_transactions_status ON premium_transactions(status);

-- Set admin users
UPDATE users SET is_admin = TRUE WHERE email IN ('byazar1628@gmail.com', 'myazar483@gmail.com');

-- Update existing premium users
UPDATE users SET daily_limit = 20 WHERE is_premium = TRUE AND premium_tier = 'free';
UPDATE users SET premium_tier = 'temel' WHERE is_premium = TRUE AND premium_tier = 'free';
