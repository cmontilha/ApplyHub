-- ============================================================
-- ApplyHub — Networking Birthdays
-- ============================================================

ALTER TABLE networking_contacts
  ADD COLUMN IF NOT EXISTS birthday_date DATE;

CREATE INDEX IF NOT EXISTS idx_networking_contacts_birthday_date
  ON networking_contacts(user_id, birthday_date);
