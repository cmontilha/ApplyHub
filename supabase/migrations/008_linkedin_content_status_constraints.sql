-- ============================================================
-- ApplyHub — LinkedIn Content Status Constraints
-- ============================================================

UPDATE linkedin_content_plans
SET status = 'planned'
WHERE status IS NULL
   OR btrim(status) = ''
   OR status NOT IN ('planned', 'scheduled', 'posted', 'not_done');

ALTER TABLE linkedin_content_plans
  ALTER COLUMN status SET DEFAULT 'planned',
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'linkedin_content_plans_status_check'
      AND conrelid = 'linkedin_content_plans'::regclass
  ) THEN
    ALTER TABLE linkedin_content_plans
      ADD CONSTRAINT linkedin_content_plans_status_check
      CHECK (status IN ('planned', 'scheduled', 'posted', 'not_done'));
  END IF;
END $$;
