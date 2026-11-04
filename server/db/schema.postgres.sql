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
  full_name TEXT,
  username TEXT UNIQUE NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  credit_balance NUMERIC(12, 2) DEFAULT 0.00,
  is_unlimited_credit_user INTEGER DEFAULT 0,
  website_url TEXT,
  onboarding_completed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  first_name TEXT,
  last_name TEXT,
  cover_image_url TEXT,
  location TEXT,
  phone TEXT,
  social_links TEXT,
  creator_mode_enabled INTEGER DEFAULT 0,
  creator_display_name TEXT,
  creator_avatar_url TEXT,
  creator_cover_image_url TEXT,
  creator_headline TEXT,
  creator_bio TEXT,
  creator_skills TEXT,
  creator_categories TEXT,
  creator_portfolio TEXT,
  creator_links TEXT,
  creator_verified INTEGER DEFAULT 0,
  creator_storefront_slug TEXT,
  role_type TEXT DEFAULT 'individual',
  professional_title TEXT,
  skills_expertise TEXT,
  years_experience INTEGER DEFAULT 0,
  portfolio_items TEXT,
  services_offered TEXT,
  agency_name TEXT,
  agency_logo_url TEXT,
  agency_description TEXT,
  agency_website TEXT,
  agency_team_size TEXT,
  agency_designation TEXT,
  agency_permissions TEXT,
  company_name TEXT,
  company_industry TEXT,
  company_size TEXT,
  hiring_preferences TEXT,
  theme_preference TEXT DEFAULT 'system',
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  notification_preferences TEXT,
  profile_visibility TEXT DEFAULT 'public',
  discoverability INTEGER DEFAULT 1,
  messaging_preference TEXT DEFAULT 'anyone',
  is_deactivated INTEGER DEFAULT 0,
  deactivated_at TEXT
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
  pricing_type TEXT CHECK (pricing_type IN ('free', 'paid')) NOT NULL,
  price NUMERIC(10, 4) DEFAULT 0.00,
  subscription_price_monthly NUMERIC(10, 2),
  compatibility_type TEXT DEFAULT 'universal',
  current_version TEXT DEFAULT '1.0',
  creator_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  security_status TEXT CHECK (security_status IN ('pass', 'fail', 'pending')) DEFAULT 'pass',
  status TEXT CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'published', 'live', 'rejected', 'paused')) DEFAULT 'draft',
  visibility TEXT CHECK (visibility IN ('public', 'unlisted', 'private')) DEFAULT 'public',
  rejection_feedback TEXT,
  install_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  net_votes INTEGER DEFAULT 0,
  average_rating NUMERIC(3, 2) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  package_tree TEXT, -- JSON string representing file structure
  session_preview TEXT, -- JSON string representing sample interactive execution
  license TEXT DEFAULT 'MIT',
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
  storage_path TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_downloads (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  version TEXT NOT NULL,
  download_type TEXT CHECK (download_type IN ('markdown', 'zip', 'prompt')) NOT NULL,
  downloaded_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS skill_submissions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  submitted_by TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')),
  validation_report TEXT,
  reviewer_feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS skill_versions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  changelog TEXT,
  file_manifest TEXT,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  UNIQUE (skill_id, version_number)
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS login_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  location TEXT,
  logged_in_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS active_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT,
  device_name TEXT,
  ip_address TEXT,
  last_active TIMESTAMPTZ DEFAULT clock_timestamp(),
  is_current INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS auth_email_rate_limits (
  id TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  outcome TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_email_action ON auth_email_rate_limits(email_hash, action, created_at_ms);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON auth_email_rate_limits(ip_address, created_at_ms);

-- Protect rate-limit records against client modification using RLS
ALTER TABLE auth_email_rate_limits ENABLE ROW LEVEL SECURITY;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);
CREATE INDEX IF NOT EXISTS idx_skills_creator ON skills(creator_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_skill ON user_purchases(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_reviews_skill ON skill_reviews(skill_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_skill ON security_audit_logs(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_downloads_skill ON skill_downloads(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_downloads_user ON skill_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_submissions_skill ON skill_submissions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_submissions_status ON skill_submissions(status);
CREATE INDEX IF NOT EXISTS idx_skill_versions_skill ON skill_versions(skill_id);
