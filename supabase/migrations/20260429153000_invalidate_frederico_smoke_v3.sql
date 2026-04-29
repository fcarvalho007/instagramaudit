-- Smoke test prep: invalidate cached snapshot for frederico.m.carvalho
-- so the next /api/analyze-public-v1 call performs a fresh end-to-end run
-- through Apify + DataForSEO + OpenAI Insights (gpt-5.4-mini).
DELETE FROM public.analysis_snapshots
WHERE instagram_username = 'frederico.m.carvalho';
