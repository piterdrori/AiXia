-- Phase 5F — atomic owner-click apply of monitoring memory proposal → agentops_memory (staging only).

CREATE UNIQUE INDEX IF NOT EXISTS idx_agentops_memory_monitoring_source_proposal_id
  ON public.agentops_memory ((content->>'source_proposal_id'))
  WHERE content->>'source_proposal_id' IS NOT NULL;

CREATE OR REPLACE FUNCTION public.agentops_apply_monitoring_memory_proposal(
  p_proposal_id uuid,
  p_owner_id text,
  p_memory_scope text,
  p_agent_id uuid,
  p_content jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal public.agentops_monitoring_memory_proposals%ROWTYPE;
  v_memory_id uuid;
  v_existing_memory_id uuid;
BEGIN
  IF p_proposal_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'proposal_id is required.');
  END IF;

  IF p_owner_id IS NULL OR btrim(p_owner_id) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'owner_id is required.');
  END IF;

  IF p_memory_scope NOT IN ('global', 'agent') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid memory scope for agentops_memory.');
  END IF;

  IF p_memory_scope = 'agent' AND p_agent_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'agent_id is required for agent-scoped memory.');
  END IF;

  IF p_memory_scope = 'global' AND p_agent_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'global memory cannot include agent_id.');
  END IF;

  SELECT *
  INTO v_proposal
  FROM public.agentops_monitoring_memory_proposals
  WHERE id = p_proposal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Memory proposal not found.');
  END IF;

  IF v_proposal.applied_memory_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'memory_id', v_proposal.applied_memory_id,
      'proposal_id', v_proposal.id,
      'already_applied', true,
      'target_scope', p_memory_scope,
      'target_store', 'agentops_memory'
    );
  END IF;

  IF v_proposal.status <> 'owner_approved' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('Proposal must be owner_approved before apply (current: %s).', v_proposal.status)
    );
  END IF;

  SELECT id
  INTO v_existing_memory_id
  FROM public.agentops_memory
  WHERE content->>'source_proposal_id' = p_proposal_id::text
  LIMIT 1;

  IF v_existing_memory_id IS NOT NULL THEN
    UPDATE public.agentops_monitoring_memory_proposals
    SET
      status = 'applied',
      applied_memory_id = v_existing_memory_id,
      owner_decision_by = p_owner_id,
      owner_decision_at = now(),
      updated_at = now()
    WHERE id = p_proposal_id;

    RETURN jsonb_build_object(
      'ok', true,
      'memory_id', v_existing_memory_id,
      'proposal_id', v_proposal.id,
      'already_applied', true,
      'target_scope', p_memory_scope,
      'target_store', 'agentops_memory'
    );
  END IF;

  IF v_proposal.duplicate_key IS NOT NULL THEN
    SELECT id
    INTO v_existing_memory_id
    FROM public.agentops_memory
    WHERE approved = true
      AND content->>'duplicate_key' = v_proposal.duplicate_key
    LIMIT 1;

    IF v_existing_memory_id IS NOT NULL THEN
      UPDATE public.agentops_monitoring_memory_proposals
      SET
        status = 'applied',
        applied_memory_id = v_existing_memory_id,
        owner_decision_by = p_owner_id,
        owner_decision_at = now(),
        updated_at = now()
      WHERE id = p_proposal_id;

      RETURN jsonb_build_object(
        'ok', true,
        'memory_id', v_existing_memory_id,
        'proposal_id', v_proposal.id,
        'already_applied', false,
        'duplicate_blocked', true,
        'target_scope', p_memory_scope,
        'target_store', 'agentops_memory'
      );
    END IF;
  END IF;

  INSERT INTO public.agentops_memory (
    scope,
    agent_id,
    content,
    source,
    approved,
    environment
  )
  VALUES (
    p_memory_scope,
    CASE WHEN p_memory_scope = 'agent' THEN p_agent_id ELSE NULL END,
    p_content,
    'system',
    true,
    'staging'
  )
  RETURNING id INTO v_memory_id;

  UPDATE public.agentops_monitoring_memory_proposals
  SET
    status = 'applied',
    applied_memory_id = v_memory_id,
    owner_decision_by = p_owner_id,
    owner_decision_at = now(),
    updated_at = now()
  WHERE id = p_proposal_id
    AND status = 'owner_approved'
    AND applied_memory_id IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Proposal apply race — proposal state changed during apply.');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'memory_id', v_memory_id,
    'proposal_id', v_proposal.id,
    'already_applied', false,
    'duplicate_blocked', false,
    'target_scope', p_memory_scope,
    'target_store', 'agentops_memory'
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT id
    INTO v_existing_memory_id
    FROM public.agentops_memory
    WHERE content->>'source_proposal_id' = p_proposal_id::text
    LIMIT 1;

    IF v_existing_memory_id IS NOT NULL THEN
      UPDATE public.agentops_monitoring_memory_proposals
      SET
        status = 'applied',
        applied_memory_id = v_existing_memory_id,
        owner_decision_by = p_owner_id,
        owner_decision_at = now(),
        updated_at = now()
      WHERE id = p_proposal_id;

      RETURN jsonb_build_object(
        'ok', true,
        'memory_id', v_existing_memory_id,
        'proposal_id', v_proposal.id,
        'already_applied', true,
        'target_scope', p_memory_scope,
        'target_store', 'agentops_memory'
      );
    END IF;

    RETURN jsonb_build_object('ok', false, 'error', 'Duplicate active memory constraint violated.');
END;
$$;

COMMENT ON FUNCTION public.agentops_apply_monitoring_memory_proposal IS
  'Phase 5F — atomic owner-click apply of owner_approved monitoring memory proposal to agentops_memory (staging).';

REVOKE ALL ON FUNCTION public.agentops_apply_monitoring_memory_proposal(uuid, text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agentops_apply_monitoring_memory_proposal(uuid, text, text, uuid, jsonb) TO service_role;
