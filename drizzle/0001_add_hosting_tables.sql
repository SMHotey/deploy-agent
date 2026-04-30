-- Hosting providers table (for affiliate partnerships)
CREATE TABLE IF NOT EXISTS hosting_providers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  logo_url VARCHAR(500),
  affiliate_url VARCHAR(500),
  commission_rate VARCHAR(20),
  commission_type VARCHAR(20) DEFAULT 'cpa',
  min_payout INTEGER DEFAULT 50,
  payment_terms VARCHAR(100) DEFAULT 'Net-30',
  categories JSONB,
  features JSONB,
  pricing JSONB,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Affiliate clicks tracking
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER REFERENCES hosting_providers(id),
  user_id INTEGER REFERENCES users(id),
  project_id INTEGER REFERENCES projects(id),
  referrer VARCHAR(500),
  ip_address VARCHAR(45),
  user_agent TEXT,
  clicked_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Affiliate conversions tracking
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER REFERENCES hosting_providers(id),
  user_id INTEGER REFERENCES users(id),
  project_id INTEGER REFERENCES projects(id),
  conversion_type VARCHAR(50) NOT NULL,
  conversion_value INTEGER DEFAULT 0,
  commission_earned INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  external_id VARCHAR(100),
  converted_at TIMESTAMP DEFAULT NOW() NOT NULL,
  paid_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_provider ON affiliate_clicks(provider_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_user ON affiliate_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_provider ON affiliate_conversions(provider_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_status ON affiliate_conversions(status);
CREATE INDEX IF NOT EXISTS idx_hosting_providers_active ON hosting_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_hosting_providers_order ON hosting_providers(sort_order);
