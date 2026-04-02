-- ============================================================
-- ApplyHub — Drive Files
-- ============================================================

CREATE TABLE IF NOT EXISTS drive_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  storage_path    TEXT NOT NULL UNIQUE,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  mime_type       TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drive_files_user_id
  ON drive_files(user_id);

CREATE INDEX IF NOT EXISTS idx_drive_files_created_at
  ON drive_files(user_id, created_at DESC);

ALTER TABLE drive_files ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'drive_files'
      AND policyname = 'users can select own drive files'
  ) THEN
    CREATE POLICY "users can select own drive files"
      ON drive_files FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'drive_files'
      AND policyname = 'users can insert own drive files'
  ) THEN
    CREATE POLICY "users can insert own drive files"
      ON drive_files FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'drive_files'
      AND policyname = 'users can update own drive files'
  ) THEN
    CREATE POLICY "users can update own drive files"
      ON drive_files FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'drive_files'
      AND policyname = 'users can delete own drive files'
  ) THEN
    CREATE POLICY "users can delete own drive files"
      ON drive_files FOR DELETE
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
  'drive-files',
  'drive-files',
  FALSE,
  20971520,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
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
      AND policyname = 'users can select own drive files storage objects'
  ) THEN
    CREATE POLICY "users can select own drive files storage objects"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'drive-files'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'users can insert own drive files storage objects'
  ) THEN
    CREATE POLICY "users can insert own drive files storage objects"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'drive-files'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'users can delete own drive files storage objects'
  ) THEN
    CREATE POLICY "users can delete own drive files storage objects"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'drive-files'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
