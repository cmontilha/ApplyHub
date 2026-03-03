-- ============================================================
-- ApplyHub — Networking Contacts
-- ============================================================

CREATE TABLE IF NOT EXISTS networking_contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  company      TEXT,
  role_title   TEXT,
  contact      TEXT NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_networking_contacts_user_id
  ON networking_contacts(user_id);

CREATE INDEX IF NOT EXISTS idx_networking_contacts_created_at
  ON networking_contacts(user_id, created_at DESC);

ALTER TABLE networking_contacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'networking_contacts'
      AND policyname = 'users can select own networking contacts'
  ) THEN
    CREATE POLICY "users can select own networking contacts"
      ON networking_contacts FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'networking_contacts'
      AND policyname = 'users can insert own networking contacts'
  ) THEN
    CREATE POLICY "users can insert own networking contacts"
      ON networking_contacts FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'networking_contacts'
      AND policyname = 'users can update own networking contacts'
  ) THEN
    CREATE POLICY "users can update own networking contacts"
      ON networking_contacts FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'networking_contacts'
      AND policyname = 'users can delete own networking contacts'
  ) THEN
    CREATE POLICY "users can delete own networking contacts"
      ON networking_contacts FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;
