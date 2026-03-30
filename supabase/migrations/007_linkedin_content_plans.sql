-- ============================================================
-- ApplyHub — LinkedIn Content Plans
-- ============================================================

CREATE TABLE IF NOT EXISTS linkedin_content_plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  theme          TEXT NOT NULL,
  content_type   TEXT,
  title_hook     TEXT,
  content        TEXT,
  objective      TEXT,
  cta            TEXT,
  status         TEXT,
  performance    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_content_plans_user_id
  ON linkedin_content_plans(user_id);

CREATE INDEX IF NOT EXISTS idx_linkedin_content_plans_schedule
  ON linkedin_content_plans(user_id, scheduled_date ASC, scheduled_time ASC, created_at ASC);

ALTER TABLE linkedin_content_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'linkedin_content_plans'
      AND policyname = 'users can select own linkedin content plans'
  ) THEN
    CREATE POLICY "users can select own linkedin content plans"
      ON linkedin_content_plans FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'linkedin_content_plans'
      AND policyname = 'users can insert own linkedin content plans'
  ) THEN
    CREATE POLICY "users can insert own linkedin content plans"
      ON linkedin_content_plans FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'linkedin_content_plans'
      AND policyname = 'users can update own linkedin content plans'
  ) THEN
    CREATE POLICY "users can update own linkedin content plans"
      ON linkedin_content_plans FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'linkedin_content_plans'
      AND policyname = 'users can delete own linkedin content plans'
  ) THEN
    CREATE POLICY "users can delete own linkedin content plans"
      ON linkedin_content_plans FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;
