-- Invalidate snapshot for frederico.m.carvalho controlled smoke test (OpenAI evidence allowlist fix)
DELETE FROM public.analysis_snapshots WHERE instagram_username = 'frederico.m.carvalho';
