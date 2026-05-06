
UPDATE analysis_snapshots
SET expires_at = now() - interval '1 hour'
WHERE instagram_username = 'frederico.m.carvalho';
