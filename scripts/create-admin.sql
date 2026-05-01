-- Create admin user for Deploy Agent
-- Run this SQL in your PostgreSQL client

-- First, check if users table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'users'
);

-- If the table exists, insert admin user
-- Password: admin123 (bcrypt hash below)
-- Hash was generated with bcrypt.hash('admin123', 10)

INSERT INTO users (email, password_hash, name, is_admin, created_at, updated_at)
VALUES (
  'admin@deploy-agent.local',
  '$2b$10$TMp8qSaoxzOinRFmVTpmeeKKvdKioRNFmg3G1vRa5PqcZxnHIpdOu',
  'Admin User',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET is_admin = true, password_hash = EXCLUDED.password_hash, updated_at = NOW();

-- Verify admin was created
SELECT id, email, name, is_admin FROM users WHERE email = 'admin@deploy-agent.local';
