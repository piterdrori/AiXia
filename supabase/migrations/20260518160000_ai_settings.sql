-- Runtime AI configuration key/value store (used by AI management pages and FloatingAIChat).

CREATE TABLE IF NOT EXISTS public.ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_settings_setting_key_key UNIQUE (setting_key)
);

CREATE OR REPLACE FUNCTION public.finance_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_settings_updated_at ON public.ai_settings;

CREATE TRIGGER trg_ai_settings_updated_at
BEFORE UPDATE ON public.ai_settings
FOR EACH ROW
EXECUTE FUNCTION public.finance_set_updated_at();

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.ai_settings TO authenticated;

DROP POLICY IF EXISTS "allow read ai_settings" ON public.ai_settings;
DROP POLICY IF EXISTS "allow insert ai_settings" ON public.ai_settings;
DROP POLICY IF EXISTS "allow update ai_settings" ON public.ai_settings;

CREATE POLICY "allow read ai_settings"
ON public.ai_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "allow insert ai_settings"
ON public.ai_settings
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "allow update ai_settings"
ON public.ai_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
