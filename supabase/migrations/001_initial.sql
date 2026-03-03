-- ============================================================
-- ApplyHub — Initial Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE work_mode AS ENUM ('onsite', 'hybrid', 'remote');
CREATE TYPE application_status AS ENUM ('applied', 'in_progress', 'interview', 'rejected', 'offer');
CREATE TYPE application_category AS ENUM ('referral', 'no_referral', 'recruiter_contact');
CREATE TYPE cert_difficulty AS ENUM ('easy', 'medium', 'hard');

-- ─────────────────────────────────────────────
-- 2. TABLES
-- ─────────────────────────────────────────────

-- Applications
CREATE TABLE IF NOT EXISTS applications (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  applied_date           DATE NOT NULL,
  company                TEXT NOT NULL,
  role_title             TEXT NOT NULL,
  work_mode              work_mode NOT NULL DEFAULT 'remote',
  location               TEXT,
  job_url                TEXT,
  status                 application_status NOT NULL DEFAULT 'applied',
  category               application_category NOT NULL DEFAULT 'no_referral',
  recruiter_contact_notes TEXT,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Companies (watchlist)
CREATE TABLE IF NOT EXISTS companies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  website_url  TEXT,
  contacts     TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Certifications (tracker)
CREATE TABLE IF NOT EXISTS certifications (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  area                 TEXT,
  difficulty           cert_difficulty,
  market_recognition   TEXT,
  price                NUMERIC(10, 2),
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX idx_applications_user_id    ON applications(user_id);
CREATE INDEX idx_applications_date       ON applications(user_id, applied_date DESC);
CREATE INDEX idx_applications_status     ON applications(user_id, status);
CREATE INDEX idx_companies_user_id       ON companies(user_id);
CREATE INDEX idx_companies_created_at    ON companies(user_id, created_at DESC);
CREATE INDEX idx_certifications_user_id  ON certifications(user_id);
CREATE INDEX idx_certifications_created_at ON certifications(user_id, created_at DESC);

-- ─────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
ALTER TABLE applications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications  ENABLE ROW LEVEL SECURITY;

-- Applications policies
CREATE POLICY "users can select own applications"
  ON applications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users can insert own applications"
  ON applications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can update own applications"
  ON applications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can delete own applications"
  ON applications FOR DELETE
  USING (user_id = auth.uid());

-- Companies policies
CREATE POLICY "users can select own companies"
  ON companies FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users can insert own companies"
  ON companies FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can update own companies"
  ON companies FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can delete own companies"
  ON companies FOR DELETE
  USING (user_id = auth.uid());

-- Certifications policies
CREATE POLICY "users can select own certifications"
  ON certifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users can insert own certifications"
  ON certifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can update own certifications"
  ON certifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can delete own certifications"
  ON certifications FOR DELETE
  USING (user_id = auth.uid());
