-- ============================================================
-- ApplyHub — Saved Links
-- ============================================================

CREATE TABLE IF NOT EXISTS saved_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  title             TEXT NOT NULL,
  notes             TEXT,
  description       TEXT,
  preview_image_url TEXT,
  site_name         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_links_user_id
  ON saved_links(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_links_created_at
  ON saved_links(user_id, created_at DESC);

ALTER TABLE saved_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_links'
      AND policyname = 'users can select own saved links'
  ) THEN
    CREATE POLICY "users can select own saved links"
      ON saved_links FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_links'
      AND policyname = 'users can insert own saved links'
  ) THEN
    CREATE POLICY "users can insert own saved links"
      ON saved_links FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_links'
      AND policyname = 'users can update own saved links'
  ) THEN
    CREATE POLICY "users can update own saved links"
      ON saved_links FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_links'
      AND policyname = 'users can delete own saved links'
  ) THEN
    CREATE POLICY "users can delete own saved links"
      ON saved_links FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;
