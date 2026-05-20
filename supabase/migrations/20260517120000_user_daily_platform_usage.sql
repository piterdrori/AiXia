-- Daily aggregated active time on the app (UTC calendar days).
-- Updated by record_platform_usage_delta() from authenticated clients while the tab is visible.

CREATE TABLE IF NOT EXISTS public.user_daily_platform_usage (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  active_seconds integer NOT NULL DEFAULT 0,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_daily_platform_usage_active_seconds_chk CHECK (
    active_seconds >= 0
    AND active_seconds <= 86400
  ),
  CONSTRAINT user_daily_platform_usage_pkey PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_platform_usage_date
  ON public.user_daily_platform_usage (usage_date);

ALTER TABLE public.user_daily_platform_usage ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.user_daily_platform_usage TO authenticated;

DROP POLICY IF EXISTS "user_daily_platform_usage_select_own_or_admin" ON public.user_daily_platform_usage;

CREATE POLICY "user_daily_platform_usage_select_own_or_admin"
ON public.user_daily_platform_usage
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND lower(trim(p.role::text)) = 'admin'
  )
);

-- No direct INSERT/UPDATE for clients; only via SECURITY DEFINER RPC.

CREATE OR REPLACE FUNCTION public.record_platform_usage_delta(p_delta_seconds integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d integer;
  cap integer := 120;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF p_delta_seconds IS NULL OR p_delta_seconds <= 0 THEN
    RETURN;
  END IF;

  d := LEAST(p_delta_seconds, cap);

  INSERT INTO public.user_daily_platform_usage (
    user_id,
    usage_date,
    active_seconds,
    last_updated_at
  )
  VALUES (
    auth.uid(),
    (timezone('utc', now()))::date,
    d,
    now()
  )
  ON CONFLICT (user_id, usage_date) DO UPDATE SET
    active_seconds = LEAST(
      86400,
      public.user_daily_platform_usage.active_seconds + EXCLUDED.active_seconds
    ),
    last_updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_platform_usage_delta(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_platform_usage_delta(integer) TO authenticated;
