-- AgentOps MVP: Owner allowlist, core tables, and Owner-only RLS.
-- Access: public.agentops_owners (active=true) via public.agentops_is_owner().
-- NOT available to all admins at runtime — bootstrap seeds active admins once; Piter must review agentops_owners after apply.
-- Hermes: 8/100 Learning, database-only MVP memory. agentops_agent_memory is NOT Personal User AI memory.

-- ---------------------------------------------------------------------------
-- 1. Owner allowlist
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agentops_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles (user_id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES public.profiles (user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agentops_owners_user_id
  ON public.agentops_owners (user_id);

CREATE INDEX IF NOT EXISTS idx_agentops_owners_active
  ON public.agentops_owners (active)
  WHERE active = true;

COMMENT ON TABLE public.agentops_owners IS
  'Dedicated AgentOps Owner allowlist. Runtime access requires active=true here — NOT all profiles.role=admin users. Review rows after initial migration bootstrap.';

-- Bootstrap: seed active admin profile(s) once. profiles PK for auth is user_id (see AGENTOPS_PRE_SQL_SCHEMA_INSPECTION.md).
-- If multiple active admins exist, all are seeded; Piter should deactivate extras in agentops_owners after review.
INSERT INTO public.agentops_owners (user_id, notes)
SELECT
  p.user_id,
  'Bootstrap AgentOps owner from active admin profile during initial migration'
FROM public.profiles p
WHERE p.role = 'admin'
  AND p.status = 'active'
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Owner gate function (allowlist only — does NOT call is_admin())
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.agentops_is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agentops_owners ao
    WHERE ao.user_id = auth.uid()
      AND ao.active = true
  );
$$;

COMMENT ON FUNCTION public.agentops_is_owner() IS
  'AgentOps Owner-only access gate. True only when auth.uid() exists in agentops_owners with active=true. Does not grant every admin access.';

-- ---------------------------------------------------------------------------
-- 3. Updated_at triggers (project convention: finance_set_updated_at)
-- ---------------------------------------------------------------------------
-- Requires public.finance_set_updated_at() from prior migrations (ai_settings / finance).

-- ---------------------------------------------------------------------------
-- 4. Core AgentOps tables
-- ---------------------------------------------------------------------------

-- A. agentops_runs
CREATE TABLE IF NOT EXISTS public.agentops_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL,
  environment text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  triggered_by uuid REFERENCES public.profiles (user_id) ON DELETE SET NULL,
  focus_directive_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  active_queue_count_before integer NOT NULL DEFAULT 0,
  active_queue_open_slots integer NOT NULL DEFAULT 0,
  total_findings integer NOT NULL DEFAULT 0,
  promoted_count integer NOT NULL DEFAULT 0,
  backlog_count integer NOT NULL DEFAULT 0,
  verified_fixed_count integer NOT NULL DEFAULT 0,
  still_broken_count integer NOT NULL DEFAULT 0,
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agentops_runs_run_type_chk CHECK (
    run_type IN (
      'daily', 'manual', 'pre-release', 'focused', 'retest', 'verification', 'import'
    )
  ),
  CONSTRAINT agentops_runs_environment_chk CHECK (
    environment IN ('local', 'staging', 'preview', 'production-read-only')
  ),
  CONSTRAINT agentops_runs_status_chk CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT agentops_runs_active_queue_count_before_chk CHECK (
    active_queue_count_before BETWEEN 0 AND 10
  ),
  CONSTRAINT agentops_runs_active_queue_open_slots_chk CHECK (
    active_queue_open_slots BETWEEN 0 AND 10
  )
);

CREATE INDEX IF NOT EXISTS idx_agentops_runs_status ON public.agentops_runs (status);
CREATE INDEX IF NOT EXISTS idx_agentops_runs_run_type ON public.agentops_runs (run_type);
CREATE INDEX IF NOT EXISTS idx_agentops_runs_started_at_desc ON public.agentops_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agentops_runs_created_at_desc ON public.agentops_runs (created_at DESC);

COMMENT ON TABLE public.agentops_runs IS
  'AgentOps orchestration runs. Owner-only. Hermes readiness may be stored in metadata (database-only MVP; Hermes 8/100 Learning, not app-callable).';

-- B. agentops_findings
CREATE TABLE IF NOT EXISTS public.agentops_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.agentops_runs (id) ON DELETE SET NULL,
  issue_code text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'New',
  queue_state text NOT NULL DEFAULT 'backlog',
  top10_rank integer,
  route text,
  module text,
  page_type text,
  user_role text,
  browser_flow text,
  agent_id text,
  review_panel text,
  evidence_summary text,
  evidence_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  problem text NOT NULL,
  expected_result text,
  actual_result text,
  likely_root_cause text,
  recommended_fix_strategy text,
  cursor_prompt text,
  non_change_rules text,
  saas_impact text,
  ai_mcp_impact text,
  personal_ai_impact text,
  hr_impact text,
  security_impact text,
  priority_score numeric NOT NULL DEFAULT 0,
  piter_priority_override numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agentops_findings_category_chk CHECK (
    category IN (
      'Design', 'Functional', 'Logical', 'Technical', 'Improvement', 'HR',
      'AI/MCP', 'Personal AI', 'SaaS', 'Security/Permission', 'Performance/Reliability'
    )
  ),
  CONSTRAINT agentops_findings_severity_chk CHECK (
    severity IN ('Critical', 'High', 'Medium', 'Low', 'Suggestion')
  ),
  CONSTRAINT agentops_findings_status_chk CHECK (
    status IN (
      'New', 'Backlog', 'Active Top 10', 'Owner Reviewed', 'Approved for Fix',
      'Rejected', 'Deferred', 'False Positive', 'In Progress',
      'Marked Fixed by Piter', 'Verification Running', 'Verified Fixed',
      'Still Broken', 'Needs Follow-Up Fix', 'Verification Blocked', 'Archived'
    )
  ),
  CONSTRAINT agentops_findings_queue_state_chk CHECK (
    queue_state IN ('backlog', 'active_top_10', 'archived')
  ),
  CONSTRAINT agentops_findings_top10_rank_chk CHECK (
    top10_rank IS NULL OR (top10_rank BETWEEN 1 AND 10)
  ),
  CONSTRAINT agentops_findings_piter_priority_override_chk CHECK (
    piter_priority_override IS NULL OR (piter_priority_override BETWEEN 0 AND 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_agentops_findings_queue_state_status
  ON public.agentops_findings (queue_state, status);
CREATE INDEX IF NOT EXISTS idx_agentops_findings_severity ON public.agentops_findings (severity);
CREATE INDEX IF NOT EXISTS idx_agentops_findings_category ON public.agentops_findings (category);
CREATE INDEX IF NOT EXISTS idx_agentops_findings_module ON public.agentops_findings (module);
CREATE INDEX IF NOT EXISTS idx_agentops_findings_route ON public.agentops_findings (route);
CREATE INDEX IF NOT EXISTS idx_agentops_findings_priority_score_desc
  ON public.agentops_findings (priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_agentops_findings_top10_rank ON public.agentops_findings (top10_rank);
CREATE INDEX IF NOT EXISTS idx_agentops_findings_created_at_desc
  ON public.agentops_findings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agentops_findings_run_id ON public.agentops_findings (run_id);

-- Partial unique: no duplicate rank among open active Top 10 items.
-- Max 10 open actives is NOT enforced here — use service layer / future RPC agentops_promote_findings_to_active(p_limit).
CREATE UNIQUE INDEX IF NOT EXISTS idx_agentops_findings_active_top10_rank_unique
  ON public.agentops_findings (top10_rank)
  WHERE queue_state = 'active_top_10'
    AND status NOT IN (
      'Verified Fixed', 'Rejected', 'Deferred', 'False Positive', 'Archived'
    );

CREATE INDEX IF NOT EXISTS idx_agentops_findings_backlog_priority
  ON public.agentops_findings (priority_score DESC)
  WHERE queue_state = 'backlog';

COMMENT ON TABLE public.agentops_findings IS
  'AgentOps issues and improvements. Owner-only Active Top 10 queue. Normal users and Personal User AI must not access.';

-- C. agentops_agent_opinions
CREATE TABLE IF NOT EXISTS public.agentops_agent_opinions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid NOT NULL REFERENCES public.agentops_findings (id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  position text NOT NULL,
  reason text NOT NULL,
  suggested_improvement text,
  blocking_concern text,
  confidence_score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agentops_agent_opinions_position_chk CHECK (
    position IN ('approve', 'needs_review', 'reject')
  ),
  CONSTRAINT agentops_agent_opinions_confidence_score_chk CHECK (
    confidence_score IS NULL OR (confidence_score BETWEEN 0 AND 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_agentops_agent_opinions_finding_id
  ON public.agentops_agent_opinions (finding_id);
CREATE INDEX IF NOT EXISTS idx_agentops_agent_opinions_agent_id
  ON public.agentops_agent_opinions (agent_id);
CREATE INDEX IF NOT EXISTS idx_agentops_agent_opinions_position
  ON public.agentops_agent_opinions (position);

-- D. agentops_owner_feedback
CREATE TABLE IF NOT EXISTS public.agentops_owner_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid REFERENCES public.agentops_findings (id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES public.profiles (user_id) ON DELETE CASCADE,
  feedback_type text NOT NULL,
  remark text,
  priority_override numeric,
  requested_scope text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agentops_owner_feedback_feedback_type_chk CHECK (
    feedback_type IN (
      'remark', 'approve', 'reject', 'defer', 'priority_change', 'scope_change',
      'false_positive', 'focus_instruction', 'mark_in_progress', 'mark_fixed',
      'request_verification', 're_review_request'
    )
  ),
  CONSTRAINT agentops_owner_feedback_priority_override_chk CHECK (
    priority_override IS NULL OR (priority_override BETWEEN 0 AND 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_agentops_owner_feedback_finding_id
  ON public.agentops_owner_feedback (finding_id);
CREATE INDEX IF NOT EXISTS idx_agentops_owner_feedback_owner_user_id
  ON public.agentops_owner_feedback (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_agentops_owner_feedback_feedback_type
  ON public.agentops_owner_feedback (feedback_type);
CREATE INDEX IF NOT EXISTS idx_agentops_owner_feedback_created_at_desc
  ON public.agentops_owner_feedback (created_at DESC);

-- E. agentops_focus_directives
CREATE TABLE IF NOT EXISTS public.agentops_focus_directives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_feedback_id uuid REFERENCES public.agentops_owner_feedback (id) ON DELETE SET NULL,
  directive_text text NOT NULL,
  module_focus text,
  category_focus text,
  agent_focus text,
  route_focus text,
  severity_focus text,
  ignored_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority_weight numeric NOT NULL DEFAULT 1,
  active_from timestamptz NOT NULL DEFAULT now(),
  active_until timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES public.profiles (user_id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agentops_focus_directives_status_chk CHECK (
    status IN ('active', 'paused', 'expired', 'deleted')
  ),
  CONSTRAINT agentops_focus_directives_priority_weight_chk CHECK (
    priority_weight BETWEEN 0 AND 10
  )
);

CREATE INDEX IF NOT EXISTS idx_agentops_focus_directives_status
  ON public.agentops_focus_directives (status);
CREATE INDEX IF NOT EXISTS idx_agentops_focus_directives_active_from
  ON public.agentops_focus_directives (active_from);
CREATE INDEX IF NOT EXISTS idx_agentops_focus_directives_active_until
  ON public.agentops_focus_directives (active_until);
CREATE INDEX IF NOT EXISTS idx_agentops_focus_directives_module_focus
  ON public.agentops_focus_directives (module_focus);
CREATE INDEX IF NOT EXISTS idx_agentops_focus_directives_category_focus
  ON public.agentops_focus_directives (category_focus);

CREATE INDEX IF NOT EXISTS idx_agentops_focus_directives_active
  ON public.agentops_focus_directives (active_from)
  WHERE status = 'active';

-- F. agentops_agent_memory
CREATE TABLE IF NOT EXISTS public.agentops_agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  memory_type text NOT NULL,
  memory_text text NOT NULL,
  source_finding_id uuid REFERENCES public.agentops_findings (id) ON DELETE SET NULL,
  source_feedback_id uuid REFERENCES public.agentops_owner_feedback (id) ON DELETE SET NULL,
  confidence_score numeric,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agentops_agent_memory_memory_type_chk CHECK (
    memory_type IN (
      'preference', 'rejection_pattern', 'approved_pattern', 'false_positive_pattern',
      'focus_rule', 'module_priority', 'prompt_style', 'implementation_rule',
      'verification_pattern'
    )
  ),
  CONSTRAINT agentops_agent_memory_confidence_score_chk CHECK (
    confidence_score IS NULL OR (confidence_score BETWEEN 0 AND 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_agentops_agent_memory_agent_id
  ON public.agentops_agent_memory (agent_id);
CREATE INDEX IF NOT EXISTS idx_agentops_agent_memory_memory_type
  ON public.agentops_agent_memory (memory_type);
CREATE INDEX IF NOT EXISTS idx_agentops_agent_memory_active
  ON public.agentops_agent_memory (active);
CREATE INDEX IF NOT EXISTS idx_agentops_agent_memory_created_at_desc
  ON public.agentops_agent_memory (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agentops_agent_memory_active_rows
  ON public.agentops_agent_memory (memory_type)
  WHERE active = true;

COMMENT ON TABLE public.agentops_agent_memory IS
  'AgentOps Owner-only long-term memory patterns. NOT ai_memory_items / Personal User AI memory. Database is MVP durable memory (Hermes 8/100, not app-callable).';

-- G. agentops_prompt_library
CREATE TABLE IF NOT EXISTS public.agentops_prompt_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid REFERENCES public.agentops_findings (id) ON DELETE CASCADE,
  prompt_type text NOT NULL,
  prompt_text text NOT NULL,
  approved_by_owner boolean NOT NULL DEFAULT false,
  copied_by_owner boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  result_status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agentops_prompt_library_prompt_type_chk CHECK (
    prompt_type IN (
      'fix', 'improvement', 'verification', 'retest', 'implementation', 'browser-qa'
    )
  ),
  CONSTRAINT agentops_prompt_library_result_status_chk CHECK (
    result_status IS NULL OR result_status IN (
      'draft', 'approved', 'copied', 'used', 'successful', 'failed', 'obsolete'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_agentops_prompt_library_finding_id
  ON public.agentops_prompt_library (finding_id);
CREATE INDEX IF NOT EXISTS idx_agentops_prompt_library_prompt_type
  ON public.agentops_prompt_library (prompt_type);
CREATE INDEX IF NOT EXISTS idx_agentops_prompt_library_approved_by_owner
  ON public.agentops_prompt_library (approved_by_owner);
CREATE INDEX IF NOT EXISTS idx_agentops_prompt_library_created_at_desc
  ON public.agentops_prompt_library (created_at DESC);

-- H. agentops_verifications (before evidence_files for FK)
CREATE TABLE IF NOT EXISTS public.agentops_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid NOT NULL REFERENCES public.agentops_findings (id) ON DELETE CASCADE,
  verification_run_id uuid REFERENCES public.agentops_runs (id) ON DELETE SET NULL,
  marked_fixed_feedback_id uuid REFERENCES public.agentops_owner_feedback (id) ON DELETE SET NULL,
  verification_status text NOT NULL DEFAULT 'pending',
  route_retested text,
  workflow_retested text,
  expected_fix text,
  actual_result text,
  regression_check_summary text,
  evidence_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_up_prompt text,
  verified_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agentops_verifications_verification_status_chk CHECK (
    verification_status IN (
      'pending', 'running', 'verified_fixed', 'still_broken',
      'needs_follow_up_fix', 'verification_blocked', 'cancelled'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_agentops_verifications_finding_id
  ON public.agentops_verifications (finding_id);
CREATE INDEX IF NOT EXISTS idx_agentops_verifications_verification_status
  ON public.agentops_verifications (verification_status);
CREATE INDEX IF NOT EXISTS idx_agentops_verifications_verified_at_desc
  ON public.agentops_verifications (verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_agentops_verifications_created_at_desc
  ON public.agentops_verifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agentops_verifications_pending
  ON public.agentops_verifications (finding_id, created_at DESC)
  WHERE verification_status IN ('pending', 'running');

-- I. agentops_evidence_files
CREATE TABLE IF NOT EXISTS public.agentops_evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid REFERENCES public.agentops_findings (id) ON DELETE CASCADE,
  verification_id uuid REFERENCES public.agentops_verifications (id) ON DELETE CASCADE,
  evidence_type text NOT NULL,
  file_path text NOT NULL,
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agentops_evidence_files_evidence_type_chk CHECK (
    evidence_type IN (
      'screenshot', 'trace', 'video', 'console', 'network', 'markdown', 'json',
      'browser-note', 'codegraph-note'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_agentops_evidence_files_finding_id
  ON public.agentops_evidence_files (finding_id);
CREATE INDEX IF NOT EXISTS idx_agentops_evidence_files_verification_id
  ON public.agentops_evidence_files (verification_id);
CREATE INDEX IF NOT EXISTS idx_agentops_evidence_files_evidence_type
  ON public.agentops_evidence_files (evidence_type);
CREATE INDEX IF NOT EXISTS idx_agentops_evidence_files_created_at_desc
  ON public.agentops_evidence_files (created_at DESC);

-- J. agentops_backlog_promotions
CREATE TABLE IF NOT EXISTS public.agentops_backlog_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid NOT NULL REFERENCES public.agentops_findings (id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.agentops_runs (id) ON DELETE SET NULL,
  promoted_from text NOT NULL,
  promoted_reason text NOT NULL,
  queue_slot_number integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agentops_backlog_promotions_promoted_from_chk CHECK (
    promoted_from IN ('backlog', 'new_scan', 'manual')
  ),
  CONSTRAINT agentops_backlog_promotions_queue_slot_number_chk CHECK (
    queue_slot_number BETWEEN 1 AND 10
  )
);

CREATE INDEX IF NOT EXISTS idx_agentops_backlog_promotions_finding_id
  ON public.agentops_backlog_promotions (finding_id);
CREATE INDEX IF NOT EXISTS idx_agentops_backlog_promotions_run_id
  ON public.agentops_backlog_promotions (run_id);
CREATE INDEX IF NOT EXISTS idx_agentops_backlog_promotions_queue_slot_number
  ON public.agentops_backlog_promotions (queue_slot_number);
CREATE INDEX IF NOT EXISTS idx_agentops_backlog_promotions_created_at_desc
  ON public.agentops_backlog_promotions (created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. Updated_at triggers
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_agentops_owners_set_updated_at ON public.agentops_owners;
CREATE TRIGGER trg_agentops_owners_set_updated_at
  BEFORE UPDATE ON public.agentops_owners
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_set_updated_at();

DROP TRIGGER IF EXISTS trg_agentops_runs_set_updated_at ON public.agentops_runs;
CREATE TRIGGER trg_agentops_runs_set_updated_at
  BEFORE UPDATE ON public.agentops_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_set_updated_at();

DROP TRIGGER IF EXISTS trg_agentops_findings_set_updated_at ON public.agentops_findings;
CREATE TRIGGER trg_agentops_findings_set_updated_at
  BEFORE UPDATE ON public.agentops_findings
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_set_updated_at();

DROP TRIGGER IF EXISTS trg_agentops_focus_directives_set_updated_at ON public.agentops_focus_directives;
CREATE TRIGGER trg_agentops_focus_directives_set_updated_at
  BEFORE UPDATE ON public.agentops_focus_directives
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_set_updated_at();

DROP TRIGGER IF EXISTS trg_agentops_agent_memory_set_updated_at ON public.agentops_agent_memory;
CREATE TRIGGER trg_agentops_agent_memory_set_updated_at
  BEFORE UPDATE ON public.agentops_agent_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_set_updated_at();

DROP TRIGGER IF EXISTS trg_agentops_prompt_library_set_updated_at ON public.agentops_prompt_library;
CREATE TRIGGER trg_agentops_prompt_library_set_updated_at
  BEFORE UPDATE ON public.agentops_prompt_library
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_set_updated_at();

DROP TRIGGER IF EXISTS trg_agentops_verifications_set_updated_at ON public.agentops_verifications;
CREATE TRIGGER trg_agentops_verifications_set_updated_at
  BEFORE UPDATE ON public.agentops_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. RLS — Owner-only via agentops_is_owner() (allowlist, not all admins)
-- ---------------------------------------------------------------------------
ALTER TABLE public.agentops_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agentops_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agentops_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agentops_agent_opinions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agentops_owner_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agentops_focus_directives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agentops_agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agentops_prompt_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agentops_evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agentops_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agentops_backlog_promotions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentops_owners TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentops_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentops_findings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentops_agent_opinions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentops_owner_feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentops_focus_directives TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentops_agent_memory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentops_prompt_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentops_evidence_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentops_verifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentops_backlog_promotions TO authenticated;

-- agentops_owners
DROP POLICY IF EXISTS agentops_owners_select_owner ON public.agentops_owners;
CREATE POLICY agentops_owners_select_owner ON public.agentops_owners
  FOR SELECT TO authenticated USING (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_owners_insert_owner ON public.agentops_owners;
CREATE POLICY agentops_owners_insert_owner ON public.agentops_owners
  FOR INSERT TO authenticated WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_owners_update_owner ON public.agentops_owners;
CREATE POLICY agentops_owners_update_owner ON public.agentops_owners
  FOR UPDATE TO authenticated
  USING (public.agentops_is_owner()) WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_owners_delete_owner ON public.agentops_owners;
CREATE POLICY agentops_owners_delete_owner ON public.agentops_owners
  FOR DELETE TO authenticated USING (public.agentops_is_owner());

-- agentops_runs
DROP POLICY IF EXISTS agentops_runs_select_owner ON public.agentops_runs;
CREATE POLICY agentops_runs_select_owner ON public.agentops_runs
  FOR SELECT TO authenticated USING (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_runs_insert_owner ON public.agentops_runs;
CREATE POLICY agentops_runs_insert_owner ON public.agentops_runs
  FOR INSERT TO authenticated WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_runs_update_owner ON public.agentops_runs;
CREATE POLICY agentops_runs_update_owner ON public.agentops_runs
  FOR UPDATE TO authenticated
  USING (public.agentops_is_owner()) WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_runs_delete_owner ON public.agentops_runs;
CREATE POLICY agentops_runs_delete_owner ON public.agentops_runs
  FOR DELETE TO authenticated USING (public.agentops_is_owner());

-- agentops_findings
DROP POLICY IF EXISTS agentops_findings_select_owner ON public.agentops_findings;
CREATE POLICY agentops_findings_select_owner ON public.agentops_findings
  FOR SELECT TO authenticated USING (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_findings_insert_owner ON public.agentops_findings;
CREATE POLICY agentops_findings_insert_owner ON public.agentops_findings
  FOR INSERT TO authenticated WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_findings_update_owner ON public.agentops_findings;
CREATE POLICY agentops_findings_update_owner ON public.agentops_findings
  FOR UPDATE TO authenticated
  USING (public.agentops_is_owner()) WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_findings_delete_owner ON public.agentops_findings;
CREATE POLICY agentops_findings_delete_owner ON public.agentops_findings
  FOR DELETE TO authenticated USING (public.agentops_is_owner());

-- agentops_agent_opinions
DROP POLICY IF EXISTS agentops_agent_opinions_select_owner ON public.agentops_agent_opinions;
CREATE POLICY agentops_agent_opinions_select_owner ON public.agentops_agent_opinions
  FOR SELECT TO authenticated USING (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_agent_opinions_insert_owner ON public.agentops_agent_opinions;
CREATE POLICY agentops_agent_opinions_insert_owner ON public.agentops_agent_opinions
  FOR INSERT TO authenticated WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_agent_opinions_update_owner ON public.agentops_agent_opinions;
CREATE POLICY agentops_agent_opinions_update_owner ON public.agentops_agent_opinions
  FOR UPDATE TO authenticated
  USING (public.agentops_is_owner()) WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_agent_opinions_delete_owner ON public.agentops_agent_opinions;
CREATE POLICY agentops_agent_opinions_delete_owner ON public.agentops_agent_opinions
  FOR DELETE TO authenticated USING (public.agentops_is_owner());

-- agentops_owner_feedback
DROP POLICY IF EXISTS agentops_owner_feedback_select_owner ON public.agentops_owner_feedback;
CREATE POLICY agentops_owner_feedback_select_owner ON public.agentops_owner_feedback
  FOR SELECT TO authenticated USING (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_owner_feedback_insert_owner ON public.agentops_owner_feedback;
CREATE POLICY agentops_owner_feedback_insert_owner ON public.agentops_owner_feedback
  FOR INSERT TO authenticated WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_owner_feedback_update_owner ON public.agentops_owner_feedback;
CREATE POLICY agentops_owner_feedback_update_owner ON public.agentops_owner_feedback
  FOR UPDATE TO authenticated
  USING (public.agentops_is_owner()) WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_owner_feedback_delete_owner ON public.agentops_owner_feedback;
CREATE POLICY agentops_owner_feedback_delete_owner ON public.agentops_owner_feedback
  FOR DELETE TO authenticated USING (public.agentops_is_owner());

-- agentops_focus_directives
DROP POLICY IF EXISTS agentops_focus_directives_select_owner ON public.agentops_focus_directives;
CREATE POLICY agentops_focus_directives_select_owner ON public.agentops_focus_directives
  FOR SELECT TO authenticated USING (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_focus_directives_insert_owner ON public.agentops_focus_directives;
CREATE POLICY agentops_focus_directives_insert_owner ON public.agentops_focus_directives
  FOR INSERT TO authenticated WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_focus_directives_update_owner ON public.agentops_focus_directives;
CREATE POLICY agentops_focus_directives_update_owner ON public.agentops_focus_directives
  FOR UPDATE TO authenticated
  USING (public.agentops_is_owner()) WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_focus_directives_delete_owner ON public.agentops_focus_directives;
CREATE POLICY agentops_focus_directives_delete_owner ON public.agentops_focus_directives
  FOR DELETE TO authenticated USING (public.agentops_is_owner());

-- agentops_agent_memory
DROP POLICY IF EXISTS agentops_agent_memory_select_owner ON public.agentops_agent_memory;
CREATE POLICY agentops_agent_memory_select_owner ON public.agentops_agent_memory
  FOR SELECT TO authenticated USING (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_agent_memory_insert_owner ON public.agentops_agent_memory;
CREATE POLICY agentops_agent_memory_insert_owner ON public.agentops_agent_memory
  FOR INSERT TO authenticated WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_agent_memory_update_owner ON public.agentops_agent_memory;
CREATE POLICY agentops_agent_memory_update_owner ON public.agentops_agent_memory
  FOR UPDATE TO authenticated
  USING (public.agentops_is_owner()) WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_agent_memory_delete_owner ON public.agentops_agent_memory;
CREATE POLICY agentops_agent_memory_delete_owner ON public.agentops_agent_memory
  FOR DELETE TO authenticated USING (public.agentops_is_owner());

-- agentops_prompt_library
DROP POLICY IF EXISTS agentops_prompt_library_select_owner ON public.agentops_prompt_library;
CREATE POLICY agentops_prompt_library_select_owner ON public.agentops_prompt_library
  FOR SELECT TO authenticated USING (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_prompt_library_insert_owner ON public.agentops_prompt_library;
CREATE POLICY agentops_prompt_library_insert_owner ON public.agentops_prompt_library
  FOR INSERT TO authenticated WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_prompt_library_update_owner ON public.agentops_prompt_library;
CREATE POLICY agentops_prompt_library_update_owner ON public.agentops_prompt_library
  FOR UPDATE TO authenticated
  USING (public.agentops_is_owner()) WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_prompt_library_delete_owner ON public.agentops_prompt_library;
CREATE POLICY agentops_prompt_library_delete_owner ON public.agentops_prompt_library
  FOR DELETE TO authenticated USING (public.agentops_is_owner());

-- agentops_evidence_files
DROP POLICY IF EXISTS agentops_evidence_files_select_owner ON public.agentops_evidence_files;
CREATE POLICY agentops_evidence_files_select_owner ON public.agentops_evidence_files
  FOR SELECT TO authenticated USING (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_evidence_files_insert_owner ON public.agentops_evidence_files;
CREATE POLICY agentops_evidence_files_insert_owner ON public.agentops_evidence_files
  FOR INSERT TO authenticated WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_evidence_files_update_owner ON public.agentops_evidence_files;
CREATE POLICY agentops_evidence_files_update_owner ON public.agentops_evidence_files
  FOR UPDATE TO authenticated
  USING (public.agentops_is_owner()) WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_evidence_files_delete_owner ON public.agentops_evidence_files;
CREATE POLICY agentops_evidence_files_delete_owner ON public.agentops_evidence_files
  FOR DELETE TO authenticated USING (public.agentops_is_owner());

-- agentops_verifications
DROP POLICY IF EXISTS agentops_verifications_select_owner ON public.agentops_verifications;
CREATE POLICY agentops_verifications_select_owner ON public.agentops_verifications
  FOR SELECT TO authenticated USING (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_verifications_insert_owner ON public.agentops_verifications;
CREATE POLICY agentops_verifications_insert_owner ON public.agentops_verifications
  FOR INSERT TO authenticated WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_verifications_update_owner ON public.agentops_verifications;
CREATE POLICY agentops_verifications_update_owner ON public.agentops_verifications
  FOR UPDATE TO authenticated
  USING (public.agentops_is_owner()) WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_verifications_delete_owner ON public.agentops_verifications;
CREATE POLICY agentops_verifications_delete_owner ON public.agentops_verifications
  FOR DELETE TO authenticated USING (public.agentops_is_owner());

-- agentops_backlog_promotions
DROP POLICY IF EXISTS agentops_backlog_promotions_select_owner ON public.agentops_backlog_promotions;
CREATE POLICY agentops_backlog_promotions_select_owner ON public.agentops_backlog_promotions
  FOR SELECT TO authenticated USING (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_backlog_promotions_insert_owner ON public.agentops_backlog_promotions;
CREATE POLICY agentops_backlog_promotions_insert_owner ON public.agentops_backlog_promotions
  FOR INSERT TO authenticated WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_backlog_promotions_update_owner ON public.agentops_backlog_promotions;
CREATE POLICY agentops_backlog_promotions_update_owner ON public.agentops_backlog_promotions
  FOR UPDATE TO authenticated
  USING (public.agentops_is_owner()) WITH CHECK (public.agentops_is_owner());
DROP POLICY IF EXISTS agentops_backlog_promotions_delete_owner ON public.agentops_backlog_promotions;
CREATE POLICY agentops_backlog_promotions_delete_owner ON public.agentops_backlog_promotions
  FOR DELETE TO authenticated USING (public.agentops_is_owner());

NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 7. Post-apply validation (run manually in SQL Editor after migration)
-- ---------------------------------------------------------------------------
-- SELECT public.agentops_is_owner();
-- SELECT count(*) FROM public.agentops_owners;
-- SELECT user_id, active, notes FROM public.agentops_owners ORDER BY created_at;
-- SELECT count(*) FROM public.agentops_findings;
-- SELECT tablename, policyname FROM pg_policies WHERE tablename LIKE 'agentops%' ORDER BY 1, 2;
-- Piter: review agentops_owners — deactivate any bootstrap admin who should not retain AgentOps access.
