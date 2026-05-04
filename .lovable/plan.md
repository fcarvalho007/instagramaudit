
# Freeze Test Snapshots — Dev Cache Lock

## Current state

| Profile | Snapshot ID | created_at | expires_at | status | payload |
|---------|-------------|------------|------------|--------|---------|
| frederico.m.carvalho | `683e4c21-60e0-4045-b43a-dfcd85fe9896` | 2026-04-29 | 2026-05-04 18:56 | ready | 35 KB object |
| martimsilvai | `883cf964-fb76-4237-bc0a-8924ec901c1f` | 2026-05-04 | 2026-05-05 10:13 | ready | 25 KB object |

Both have `analysis_status = 'ready'`, valid `normalized_payload` (object type), and `provider = 'apify'`.

## How cache prevents Apify calls

`src/lib/analysis/cache.ts` → `isFresh(snapshot)` returns `true` when `expires_at > now()`. If a fresh snapshot exists for the cache key, the analyzer serves it directly — no Apify actor is called. Setting `expires_at` far in the future guarantees zero Apify calls for these profiles.

## Operation (2 UPDATE statements via insert tool)

```sql
-- Freeze frederico.m.carvalho
UPDATE analysis_snapshots
SET expires_at = '2027-01-01T00:00:00+00',
    updated_at = now()
WHERE id = '683e4c21-60e0-4045-b43a-dfcd85fe9896';

-- Freeze martimsilvai
UPDATE analysis_snapshots
SET expires_at = '2027-01-01T00:00:00+00',
    updated_at = now()
WHERE id = '883cf964-fb76-4237-bc0a-8924ec901c1f';
```

## Rollback SQL (restore 24h TTL from original creation)

```sql
-- Unfreeze frederico.m.carvalho (restore normal expiry)
UPDATE analysis_snapshots
SET expires_at = created_at + interval '24 hours',
    updated_at = now()
WHERE id = '683e4c21-60e0-4045-b43a-dfcd85fe9896';

-- Unfreeze martimsilvai
UPDATE analysis_snapshots
SET expires_at = created_at + interval '24 hours',
    updated_at = now()
WHERE id = '883cf964-fb76-4237-bc0a-8924ec901c1f';
```

## What changes

- `expires_at` for 2 rows → `2027-01-01`
- `updated_at` → `now()`

## What does NOT change

- No schema changes, no migrations
- No code changes to cache.ts or analyzer logic
- No other snapshots affected
- No Apify calls triggered
- No new tables or columns
- No locked files touched

## Risk level

**Zero.** Two field updates on existing rows. Fully reversible. No side effects.
