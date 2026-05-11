UPDATE public.analysis_snapshots
SET expires_at = created_at + INTERVAL '15 days'
WHERE expires_at < created_at + INTERVAL '15 days'
  AND created_at + INTERVAL '15 days' > now();