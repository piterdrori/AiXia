-- Fix D-C: remove incorrect deny policies that used not-equal bucket checks and could
-- broaden SELECT/INSERT on other buckets via OR composition.

DROP POLICY IF EXISTS agentops_artifacts_staging_deny_select ON storage.objects;
DROP POLICY IF EXISTS agentops_artifacts_staging_deny_insert ON storage.objects;
DROP POLICY IF EXISTS agentops_artifacts_staging_deny_update ON storage.objects;
DROP POLICY IF EXISTS agentops_artifacts_staging_deny_delete ON storage.objects;

-- Private bucket remains with no granting policies for anon/authenticated.
-- Explicit never-grant policies scoped ONLY to this bucket (AND false).
CREATE POLICY agentops_artifacts_staging_block_select
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'agentops-artifacts-staging' AND false);

CREATE POLICY agentops_artifacts_staging_block_insert
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'agentops-artifacts-staging' AND false);

CREATE POLICY agentops_artifacts_staging_block_update
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'agentops-artifacts-staging' AND false)
  WITH CHECK (bucket_id = 'agentops-artifacts-staging' AND false);

CREATE POLICY agentops_artifacts_staging_block_delete
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'agentops-artifacts-staging' AND false);
