-- Smoke test: invalidate current snapshot for frederico.m.carvalho so the
-- next /api/analyze-public-v1 call performs a fresh provider run.
DELETE FROM public.analysis_snapshots
WHERE instagram_username = 'frederico.m.carvalho';
