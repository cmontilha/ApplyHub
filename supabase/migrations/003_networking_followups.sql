-- ============================================================
-- ApplyHub — Networking Follow-ups
-- ============================================================

ALTER TABLE networking_contacts
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_at DATE,
  ADD COLUMN IF NOT EXISTS next_follow_up_at DATE,
  ADD COLUMN IF NOT EXISTS follow_up_interval_months INTEGER NOT NULL DEFAULT 5;

ALTER TABLE networking_contacts
  ALTER COLUMN contact DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'networking_contacts_follow_up_interval_check'
  ) THEN
    ALTER TABLE networking_contacts
      ADD CONSTRAINT networking_contacts_follow_up_interval_check
      CHECK (follow_up_interval_months > 0);
  END IF;
END $$;

UPDATE networking_contacts
SET last_contact_at = created_at::date
WHERE last_contact_at IS NULL;

UPDATE networking_contacts
SET next_follow_up_at = (last_contact_at + make_interval(months => follow_up_interval_months))::date
WHERE last_contact_at IS NOT NULL
  AND next_follow_up_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_networking_contacts_next_follow_up
  ON networking_contacts(user_id, next_follow_up_at);
