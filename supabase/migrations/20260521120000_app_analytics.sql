-- Privacy-safe internal usage analytics (new tables only).
-- Inserts via SECURITY DEFINER RPCs; reads admin-only via RLS.

-- ---------------------------------------------------------------------------
-- 1. app_analytics_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_name text NOT NULL,
  event_type text NOT NULL,
  page_path text,
  page_title text,
  module_name text,
  workflow_name text,
  workflow_step text,
  user_id uuid,
  company_id uuid,
  session_id text,
  anonymous_id text,
  target_type text,
  target_id text,
  target_label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_ms integer,
  success boolean,
  error_code text,
  error_message text,
  user_agent text,
  viewport_width integer,
  viewport_height integer
);

CREATE INDEX IF NOT EXISTS idx_app_analytics_events_created_at
  ON public.app_analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_analytics_events_page_path
  ON public.app_analytics_events (page_path);
CREATE INDEX IF NOT EXISTS idx_app_analytics_events_session_id
  ON public.app_analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_app_analytics_events_event_name
  ON public.app_analytics_events (event_name);

-- ---------------------------------------------------------------------------
-- 2. app_analytics_page_views
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_analytics_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  page_path text NOT NULL,
  page_title text,
  module_name text,
  user_id uuid,
  company_id uuid,
  session_id text,
  anonymous_id text,
  referrer text,
  duration_ms integer,
  exit_page boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  viewport_width integer,
  viewport_height integer
);

CREATE INDEX IF NOT EXISTS idx_app_analytics_page_views_created_at
  ON public.app_analytics_page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_analytics_page_views_page_path
  ON public.app_analytics_page_views (page_path);
CREATE INDEX IF NOT EXISTS idx_app_analytics_page_views_session_id
  ON public.app_analytics_page_views (session_id);

-- ---------------------------------------------------------------------------
-- 3. app_analytics_form_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_analytics_form_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  form_name text NOT NULL,
  form_action text NOT NULL,
  page_path text,
  module_name text,
  workflow_name text,
  workflow_step text,
  user_id uuid,
  company_id uuid,
  session_id text,
  anonymous_id text,
  field_name text,
  validation_error text,
  duration_ms integer,
  success boolean,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_app_analytics_form_events_created_at
  ON public.app_analytics_form_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_analytics_form_events_form_name
  ON public.app_analytics_form_events (form_name);
CREATE INDEX IF NOT EXISTS idx_app_analytics_form_events_session_id
  ON public.app_analytics_form_events (session_id);

-- ---------------------------------------------------------------------------
-- 4. app_analytics_frontend_errors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_analytics_frontend_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  page_path text,
  module_name text,
  user_id uuid,
  company_id uuid,
  session_id text,
  anonymous_id text,
  error_name text,
  error_message text,
  error_stack text,
  component_stack text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_app_analytics_frontend_errors_created_at
  ON public.app_analytics_frontend_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_analytics_frontend_errors_session_id
  ON public.app_analytics_frontend_errors (session_id);

-- ---------------------------------------------------------------------------
-- 5. app_analytics_feature_feedback
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_analytics_feature_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  page_path text,
  module_name text,
  feature_name text,
  feedback_type text,
  rating integer,
  comment text,
  user_id uuid,
  company_id uuid,
  session_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_app_analytics_feature_feedback_created_at
  ON public.app_analytics_feature_feedback (created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS: admin SELECT only; no direct client writes
-- ---------------------------------------------------------------------------
ALTER TABLE public.app_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_analytics_form_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_analytics_frontend_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_analytics_feature_feedback ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.app_analytics_events TO authenticated;
GRANT SELECT ON public.app_analytics_page_views TO authenticated;
GRANT SELECT ON public.app_analytics_form_events TO authenticated;
GRANT SELECT ON public.app_analytics_frontend_errors TO authenticated;
GRANT SELECT ON public.app_analytics_feature_feedback TO authenticated;

DROP POLICY IF EXISTS "app_analytics_events_select_admin" ON public.app_analytics_events;
CREATE POLICY "app_analytics_events_select_admin"
ON public.app_analytics_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND lower(trim(p.role::text)) = 'admin'
  )
);

DROP POLICY IF EXISTS "app_analytics_page_views_select_admin" ON public.app_analytics_page_views;
CREATE POLICY "app_analytics_page_views_select_admin"
ON public.app_analytics_page_views FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND lower(trim(p.role::text)) = 'admin'
  )
);

DROP POLICY IF EXISTS "app_analytics_form_events_select_admin" ON public.app_analytics_form_events;
CREATE POLICY "app_analytics_form_events_select_admin"
ON public.app_analytics_form_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND lower(trim(p.role::text)) = 'admin'
  )
);

DROP POLICY IF EXISTS "app_analytics_frontend_errors_select_admin" ON public.app_analytics_frontend_errors;
CREATE POLICY "app_analytics_frontend_errors_select_admin"
ON public.app_analytics_frontend_errors FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND lower(trim(p.role::text)) = 'admin'
  )
);

DROP POLICY IF EXISTS "app_analytics_feature_feedback_select_admin" ON public.app_analytics_feature_feedback;
CREATE POLICY "app_analytics_feature_feedback_select_admin"
ON public.app_analytics_feature_feedback FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND lower(trim(p.role::text)) = 'admin'
  )
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._app_analytics_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND lower(trim(p.role::text)) = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public._app_analytics_safe_text(p_value text, p_max integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_value IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN left(replace(p_value, chr(0), ''), p_max);
END;
$$;

CREATE OR REPLACE FUNCTION public._app_analytics_safe_jsonb(p_value jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_value IS NULL OR p_value = 'null'::jsonb THEN
    RETURN '{}'::jsonb;
  END IF;
  RETURN p_value;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: insert_app_analytics_event
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_app_analytics_event(
  p_event_name text,
  p_event_type text,
  p_page_path text DEFAULT NULL,
  p_page_title text DEFAULT NULL,
  p_module_name text DEFAULT NULL,
  p_workflow_name text DEFAULT NULL,
  p_workflow_step text DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_anonymous_id text DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_target_label text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_duration_ms integer DEFAULT NULL,
  p_success boolean DEFAULT NULL,
  p_error_code text DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_viewport_width integer DEFAULT NULL,
  p_viewport_height integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_user_id uuid := auth.uid();
  v_company_id uuid;
BEGIN
  IF p_event_name IS NULL OR trim(p_event_name) = '' THEN
    RETURN NULL;
  END IF;
  IF p_event_type IS NULL OR trim(p_event_type) = '' THEN
    RETURN NULL;
  END IF;

  IF v_user_id IS NULL THEN
    v_company_id := NULL;
  ELSE
    v_company_id := p_company_id;
  END IF;

  INSERT INTO public.app_analytics_events (
    event_name,
    event_type,
    page_path,
    page_title,
    module_name,
    workflow_name,
    workflow_step,
    user_id,
    company_id,
    session_id,
    anonymous_id,
    target_type,
    target_id,
    target_label,
    metadata,
    duration_ms,
    success,
    error_code,
    error_message,
    user_agent,
    viewport_width,
    viewport_height
  )
  VALUES (
    public._app_analytics_safe_text(p_event_name, 200),
    public._app_analytics_safe_text(p_event_type, 100),
    public._app_analytics_safe_text(p_page_path, 500),
    public._app_analytics_safe_text(p_page_title, 500),
    public._app_analytics_safe_text(p_module_name, 100),
    public._app_analytics_safe_text(p_workflow_name, 200),
    public._app_analytics_safe_text(p_workflow_step, 200),
    v_user_id,
    v_company_id,
    public._app_analytics_safe_text(p_session_id, 100),
    public._app_analytics_safe_text(p_anonymous_id, 100),
    public._app_analytics_safe_text(p_target_type, 100),
    public._app_analytics_safe_text(p_target_id, 200),
    public._app_analytics_safe_text(p_target_label, 500),
    public._app_analytics_safe_jsonb(p_metadata),
    p_duration_ms,
    p_success,
    public._app_analytics_safe_text(p_error_code, 100),
    public._app_analytics_safe_text(p_error_message, 500),
    public._app_analytics_safe_text(p_user_agent, 500),
    p_viewport_width,
    p_viewport_height
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: insert_app_analytics_page_view
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_app_analytics_page_view(
  p_page_path text,
  p_page_title text DEFAULT NULL,
  p_module_name text DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_anonymous_id text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL,
  p_exit_page boolean DEFAULT false,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_viewport_width integer DEFAULT NULL,
  p_viewport_height integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_user_id uuid := auth.uid();
  v_company_id uuid;
BEGIN
  IF p_page_path IS NULL OR trim(p_page_path) = '' THEN
    RETURN NULL;
  END IF;

  IF v_user_id IS NULL THEN
    v_company_id := NULL;
  ELSE
    v_company_id := p_company_id;
  END IF;

  INSERT INTO public.app_analytics_page_views (
    page_path,
    page_title,
    module_name,
    user_id,
    company_id,
    session_id,
    anonymous_id,
    referrer,
    duration_ms,
    exit_page,
    metadata,
    viewport_width,
    viewport_height
  )
  VALUES (
    public._app_analytics_safe_text(p_page_path, 500),
    public._app_analytics_safe_text(p_page_title, 500),
    public._app_analytics_safe_text(p_module_name, 100),
    v_user_id,
    v_company_id,
    public._app_analytics_safe_text(p_session_id, 100),
    public._app_analytics_safe_text(p_anonymous_id, 100),
    public._app_analytics_safe_text(p_referrer, 1000),
    p_duration_ms,
    COALESCE(p_exit_page, false),
    public._app_analytics_safe_jsonb(p_metadata),
    p_viewport_width,
    p_viewport_height
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: insert_app_analytics_form_event
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_app_analytics_form_event(
  p_form_name text,
  p_form_action text,
  p_page_path text DEFAULT NULL,
  p_module_name text DEFAULT NULL,
  p_workflow_name text DEFAULT NULL,
  p_workflow_step text DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_anonymous_id text DEFAULT NULL,
  p_field_name text DEFAULT NULL,
  p_validation_error text DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL,
  p_success boolean DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_user_id uuid := auth.uid();
  v_company_id uuid;
BEGIN
  IF p_form_name IS NULL OR trim(p_form_name) = '' THEN
    RETURN NULL;
  END IF;
  IF p_form_action IS NULL OR trim(p_form_action) = '' THEN
    RETURN NULL;
  END IF;

  IF v_user_id IS NULL THEN
    v_company_id := NULL;
  ELSE
    v_company_id := p_company_id;
  END IF;

  INSERT INTO public.app_analytics_form_events (
    form_name,
    form_action,
    page_path,
    module_name,
    workflow_name,
    workflow_step,
    user_id,
    company_id,
    session_id,
    anonymous_id,
    field_name,
    validation_error,
    duration_ms,
    success,
    metadata
  )
  VALUES (
    public._app_analytics_safe_text(p_form_name, 200),
    public._app_analytics_safe_text(p_form_action, 100),
    public._app_analytics_safe_text(p_page_path, 500),
    public._app_analytics_safe_text(p_module_name, 100),
    public._app_analytics_safe_text(p_workflow_name, 200),
    public._app_analytics_safe_text(p_workflow_step, 200),
    v_user_id,
    v_company_id,
    public._app_analytics_safe_text(p_session_id, 100),
    public._app_analytics_safe_text(p_anonymous_id, 100),
    public._app_analytics_safe_text(p_field_name, 200),
    public._app_analytics_safe_text(p_validation_error, 500),
    p_duration_ms,
    p_success,
    public._app_analytics_safe_jsonb(p_metadata)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: insert_app_analytics_frontend_error
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_app_analytics_frontend_error(
  p_page_path text DEFAULT NULL,
  p_module_name text DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_anonymous_id text DEFAULT NULL,
  p_error_name text DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_error_stack text DEFAULT NULL,
  p_component_stack text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_user_id uuid := auth.uid();
  v_company_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    v_company_id := NULL;
  ELSE
    v_company_id := p_company_id;
  END IF;

  INSERT INTO public.app_analytics_frontend_errors (
    page_path,
    module_name,
    user_id,
    company_id,
    session_id,
    anonymous_id,
    error_name,
    error_message,
    error_stack,
    component_stack,
    metadata,
    user_agent
  )
  VALUES (
    public._app_analytics_safe_text(p_page_path, 500),
    public._app_analytics_safe_text(p_module_name, 100),
    v_user_id,
    v_company_id,
    public._app_analytics_safe_text(p_session_id, 100),
    public._app_analytics_safe_text(p_anonymous_id, 100),
    public._app_analytics_safe_text(p_error_name, 200),
    public._app_analytics_safe_text(p_error_message, 500),
    public._app_analytics_safe_text(p_error_stack, 8000),
    public._app_analytics_safe_text(p_component_stack, 8000),
    public._app_analytics_safe_jsonb(p_metadata),
    public._app_analytics_safe_text(p_user_agent, 500)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: insert_app_analytics_feature_feedback
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_app_analytics_feature_feedback(
  p_page_path text DEFAULT NULL,
  p_module_name text DEFAULT NULL,
  p_feature_name text DEFAULT NULL,
  p_feedback_type text DEFAULT NULL,
  p_rating integer DEFAULT NULL,
  p_comment text DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_user_id uuid := auth.uid();
  v_company_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    v_company_id := NULL;
  ELSE
    v_company_id := p_company_id;
  END IF;

  INSERT INTO public.app_analytics_feature_feedback (
    page_path,
    module_name,
    feature_name,
    feedback_type,
    rating,
    comment,
    user_id,
    company_id,
    session_id,
    metadata
  )
  VALUES (
    public._app_analytics_safe_text(p_page_path, 500),
    public._app_analytics_safe_text(p_module_name, 100),
    public._app_analytics_safe_text(p_feature_name, 200),
    public._app_analytics_safe_text(p_feedback_type, 100),
    p_rating,
    public._app_analytics_safe_text(p_comment, 2000),
    v_user_id,
    v_company_id,
    public._app_analytics_safe_text(p_session_id, 100),
    public._app_analytics_safe_jsonb(p_metadata)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_app_analytics_event FROM PUBLIC;
REVOKE ALL ON FUNCTION public.insert_app_analytics_page_view FROM PUBLIC;
REVOKE ALL ON FUNCTION public.insert_app_analytics_form_event FROM PUBLIC;
REVOKE ALL ON FUNCTION public.insert_app_analytics_frontend_error FROM PUBLIC;
REVOKE ALL ON FUNCTION public.insert_app_analytics_feature_feedback FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.insert_app_analytics_event TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_app_analytics_page_view TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_app_analytics_form_event TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_app_analytics_frontend_error TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_app_analytics_feature_feedback TO anon, authenticated;
