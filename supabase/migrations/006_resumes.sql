-- ============================================================
-- ApplyHub — Resumes
-- ============================================================

CREATE TABLE IF NOT EXISTS resumes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  storage_path    TEXT NOT NULL UNIQUE,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  mime_type       TEXT NOT NULL DEFAULT 'application/pdf',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id
  ON resumes(user_id);

CREATE INDEX IF NOT EXISTS idx_resumes_created_at
  ON resumes(user_id, created_at DESC);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'resumes'
      AND policyname = 'users can select own resumes'
  ) THEN
    CREATE POLICY "users can select own resumes"
      ON resumes FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'resumes'
      AND policyname = 'users can insert own resumes'
  ) THEN
    CREATE POLICY "users can insert own resumes"
      ON resumes FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'resumes'
      AND policyname = 'users can update own resumes'
  ) THEN
    CREATE POLICY "users can update own resumes"
      ON resumes FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'resumes'
      AND policyname = 'users can delete own resumes'
  ) THEN
    CREATE POLICY "users can delete own resumes"
      ON resumes FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) VALUES (
  'resumes',
  'resumes',
  FALSE,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'users can select own resume files'
  ) THEN
    CREATE POLICY "users can select own resume files"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'resumes'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'users can insert own resume files'
  ) THEN
    CREATE POLICY "users can insert own resume files"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'resumes'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'users can delete own resume files'
  ) THEN
    CREATE POLICY "users can delete own resume files"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'resumes'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
