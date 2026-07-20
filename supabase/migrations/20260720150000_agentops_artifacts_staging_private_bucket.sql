-- Phase D-C: private staging artifact bucket (service-role upload + signed URL only).
-- No granting policies for anon/authenticated; service_role bypasses RLS.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agentops-artifacts-staging',
  'agentops-artifacts-staging',
  false,
  52428800,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/json',
    'text/plain',
    'text/html',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Explicit never-grant policies scoped ONLY to this bucket (AND false).
-- Do NOT use not-equal bucket patterns — those OR-compose and can broaden other buckets.
DROP POLICY IF EXISTS agentops_artifacts_staging_block_select ON storage.objects;
CREATE POLICY agentops_artifacts_staging_block_select
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'agentops-artifacts-staging' AND false);

DROP POLICY IF EXISTS agentops_artifacts_staging_block_insert ON storage.objects;
CREATE POLICY agentops_artifacts_staging_block_insert
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'agentops-artifacts-staging' AND false);

DROP POLICY IF EXISTS agentops_artifacts_staging_block_update ON storage.objects;
CREATE POLICY agentops_artifacts_staging_block_update
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'agentops-artifacts-staging' AND false)
  WITH CHECK (bucket_id = 'agentops-artifacts-staging' AND false);

DROP POLICY IF EXISTS agentops_artifacts_staging_block_delete ON storage.objects;
CREATE POLICY agentops_artifacts_staging_block_delete
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'agentops-artifacts-staging' AND false);
