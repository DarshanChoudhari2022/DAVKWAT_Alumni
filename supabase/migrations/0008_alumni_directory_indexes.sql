-- Alumni directory search performance: trigram indexes for ilike substring matching.
-- Only creates indexes that don't already exist (full_name and email covered by 0004).
-- Req 6.6: uses CREATE INDEX IF NOT EXISTS for idempotency.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_profiles_company_trgm
  ON profiles USING gin (company gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_occupation_trgm
  ON profiles USING gin (occupation gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_industry_trgm
  ON profiles USING gin (industry gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_current_city_trgm
  ON profiles USING gin (current_city gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_current_state_trgm
  ON profiles USING gin (current_state gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_current_country_trgm
  ON profiles USING gin (current_country gin_trgm_ops);
