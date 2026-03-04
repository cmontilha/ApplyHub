-- ============================================================
-- ApplyHub — Websites To Apply
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'website_application_type'
  ) THEN
    CREATE TYPE website_application_type AS ENUM ('both', 'nacional', 'internacional');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS websites_to_apply (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  website_url  TEXT NOT NULL,
  type         website_application_type NOT NULL DEFAULT 'both',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_websites_to_apply_user_id
  ON websites_to_apply(user_id);

CREATE INDEX IF NOT EXISTS idx_websites_to_apply_created_at
  ON websites_to_apply(user_id, created_at DESC);

ALTER TABLE websites_to_apply ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'websites_to_apply'
      AND policyname = 'users can select own websites to apply'
  ) THEN
    CREATE POLICY "users can select own websites to apply"
      ON websites_to_apply FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'websites_to_apply'
      AND policyname = 'users can insert own websites to apply'
  ) THEN
    CREATE POLICY "users can insert own websites to apply"
      ON websites_to_apply FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'websites_to_apply'
      AND policyname = 'users can update own websites to apply'
  ) THEN
    CREATE POLICY "users can update own websites to apply"
      ON websites_to_apply FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'websites_to_apply'
      AND policyname = 'users can delete own websites to apply'
  ) THEN
    CREATE POLICY "users can delete own websites to apply"
      ON websites_to_apply FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;
