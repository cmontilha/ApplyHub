-- ============================================================
-- ApplyHub — Pitches
-- ============================================================

CREATE TABLE IF NOT EXISTS pitches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  pitch        TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pitches_user_id
  ON pitches(user_id);

CREATE INDEX IF NOT EXISTS idx_pitches_created_at
  ON pitches(user_id, created_at DESC);

ALTER TABLE pitches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pitches'
      AND policyname = 'users can select own pitches'
  ) THEN
    CREATE POLICY "users can select own pitches"
      ON pitches FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pitches'
      AND policyname = 'users can insert own pitches'
  ) THEN
    CREATE POLICY "users can insert own pitches"
      ON pitches FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pitches'
      AND policyname = 'users can update own pitches'
  ) THEN
    CREATE POLICY "users can update own pitches"
      ON pitches FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pitches'
      AND policyname = 'users can delete own pitches'
  ) THEN
    CREATE POLICY "users can delete own pitches"
      ON pitches FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;
