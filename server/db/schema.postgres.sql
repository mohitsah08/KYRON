-- KYRON PostgreSQL Schema

-- Compatibility function for datetime(val text)
CREATE OR REPLACE FUNCTION datetime(val text) RETURNS timestamptz AS $$
BEGIN
  IF val = 'now' THEN RETURN clock_timestamp(); END IF;
  RETURN val::timestamptz;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION datetime(val timestamptz) RETURNS timestamptz AS $$
BEGIN
  RETURN val;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  display_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  credit_balance NUMERIC(12, 2) DEFAULT 0.00,
  is_unlimited_credit_user INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT NOT NULL, -- JSON array string
  logo_url TEXT,
  pricing_type TEXT CHECK (pricing_type IN ('free', 'paid', 'subscription')) NOT NULL,
  price NUMERIC(10, 4) DEFAULT 0.00,
  subscription_price_monthly NUMERIC(10, 2),
  compatibility_type TEXT DEFAULT 'universal',
  current_version TEXT DEFAULT '1.0',
  creator_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  security_status TEXT CHECK (security_status IN ('pass', 'fail', 'pending')) DEFAULT 'pass',
  status TEXT CHECK (status IN ('live', 'draft', 'rejected')) DEFAULT 'live',
  install_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  net_votes INTEGER DEFAULT 0,
  average_rating NUMERIC(3, 2) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  package_tree TEXT, -- JSON string representing file structure
  session_preview TEXT, -- JSON string representing sample interactive execution
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_deals (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  discount_percent INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS skill_votes (
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (skill_id, user_id)
);

CREATE TABLE IF NOT EXISTS saved_skills (
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (skill_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  amount_paid NUMERIC(10, 2) NOT NULL,
  license_key TEXT NOT NULL,
  purchased_at TEXT NOT NULL,
  status TEXT DEFAULT 'completed'
);

CREATE TABLE IF NOT EXISTS skill_reviews (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT NOT NULL,
  is_verified_purchase INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS security_audit_logs (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT NOT NULL,
  scanned_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_packages (
  skill_id TEXT PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  skill_md_content TEXT NOT NULL,
  files_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);
CREATE INDEX IF NOT EXISTS idx_skills_creator ON skills(creator_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_skill ON user_purchases(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_reviews_skill ON skill_reviews(skill_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_skill ON security_audit_logs(skill_id);
