-- Fix analytics text sanitizer: avoid chr(0) which causes "null character not permitted".

CREATE OR REPLACE FUNCTION public._app_analytics_safe_text(p_value text, p_max integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_trimmed text;
BEGIN
  IF p_value IS NULL THEN
    RETURN NULL;
  END IF;

  v_trimmed := trim(p_value);

  IF v_trimmed = '' THEN
    RETURN NULL;
  END IF;

  IF p_max IS NULL OR p_max <= 0 THEN
    RETURN v_trimmed;
  END IF;

  RETURN left(v_trimmed, p_max);
END;
$$;
