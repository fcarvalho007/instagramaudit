UPDATE public.analysis_snapshots
SET normalized_payload = jsonb_set(
      jsonb_set(
        COALESCE(normalized_payload, '{}'::jsonb),
        '{analysis_window}',
        '"30d"'::jsonb,
        true
      ),
      '{analysis_window_label}',
      '"Últimos 30 dias"'::jsonb,
      true
    ),
    updated_at = now()
WHERE id = '3f8b1dcf-618f-43d6-ada3-4841d2b04620'
  AND cache_key = 'v1:frederico.m.carvalho|:w=30d'
  AND COALESCE(normalized_payload ? 'analysis_window', false) = false;