-- One-off cache invalidation for OpenAI insights smoke test.
-- Removes the cached snapshot for `frederico.m.carvalho` so the next
-- /api/analyze-public-v1 call falls through to the fresh path and
-- exercises the OpenAI insights generation code path end-to-end.
-- Reversible: the next fresh analysis will re-create the snapshot.
DELETE FROM public.analysis_snapshots
WHERE id = '311067c4-7de3-44e0-b0ee-d20c3a2d5004';
