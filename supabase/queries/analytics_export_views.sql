-- Optional read-only views for Supabase SQL editor / CSV export (Option A).
-- Run manually after applying migration 20260521120000_app_analytics.sql.
-- Not applied automatically by Supabase CLI migrations.

-- Daily page view counts (last 30 days)
CREATE OR REPLACE VIEW public.app_analytics_daily_page_views AS
SELECT
  (created_at AT TIME ZONE 'UTC')::date AS day,
  page_path,
  module_name,
  COUNT(*)::bigint AS view_count,
  COUNT(*) FILTER (WHERE exit_page)::bigint AS exit_count,
  ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL))::integer AS avg_duration_ms
FROM public.app_analytics_page_views
WHERE created_at >= (timezone('utc', now()) - interval '30 days')
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

-- Top custom events (last 7 days)
CREATE OR REPLACE VIEW public.app_analytics_top_events_7d AS
SELECT
  event_name,
  event_type,
  module_name,
  COUNT(*)::bigint AS event_count
FROM public.app_analytics_events
WHERE created_at >= (timezone('utc', now()) - interval '7 days')
GROUP BY 1, 2, 3
ORDER BY 4 DESC
LIMIT 100;

-- Form funnel: starts vs submits vs validation errors
CREATE OR REPLACE VIEW public.app_analytics_form_abandonment AS
SELECT
  form_name,
  module_name,
  COUNT(*) FILTER (WHERE form_action = 'start')::bigint AS starts,
  COUNT(*) FILTER (WHERE form_action = 'submit')::bigint AS submits,
  COUNT(*) FILTER (WHERE form_action = 'validation_error')::bigint AS validation_errors,
  CASE
    WHEN COUNT(*) FILTER (WHERE form_action = 'start') > 0 THEN
      ROUND(
        100.0 * (
          1.0 - (
            COUNT(*) FILTER (WHERE form_action = 'submit')::numeric
            / COUNT(*) FILTER (WHERE form_action = 'start')::numeric
          )
        ),
        1
      )
    ELSE NULL
  END AS abandon_pct
FROM public.app_analytics_form_events
WHERE created_at >= (timezone('utc', now()) - interval '30 days')
GROUP BY 1, 2
ORDER BY starts DESC;

-- Repeated frontend errors (last 7 days)
CREATE OR REPLACE VIEW public.app_analytics_repeated_errors_7d AS
SELECT
  error_name,
  error_message,
  module_name,
  page_path,
  COUNT(*)::bigint AS occurrence_count,
  MAX(created_at) AS last_seen_at
FROM public.app_analytics_frontend_errors
WHERE created_at >= (timezone('utc', now()) - interval '7 days')
GROUP BY 1, 2, 3, 4
ORDER BY 5 DESC
LIMIT 50;

-- Grant admin read via underlying table RLS when querying as authenticated admin.
-- Service role bypasses RLS for Hermes export script.
