# Block 1 — Final Consistency Smoke Test

Read-only verification pass. No code changes unless a regression is found (in which case I stop and report before fixing).

## 1. Pick the two fixtures

Query the DB for one cached snapshot that contains pinned posts and one regular snapshot (no pinned, healthy date distribution):

```sql
-- candidates with pinned
select profile_username, captured_at, jsonb_array_length(payload->'posts') as n
from public.profile_snapshots
where exists (
  select 1 from jsonb_array_elements(payload->'posts') p
  where (p->>'isPinned')::bool = true
)
order by captured_at desc limit 5;

-- candidates without pinned
select profile_username, captured_at, jsonb_array_length(payload->'posts') as n
from public.profile_snapshots
where not exists (
  select 1 from jsonb_array_elements(payload->'posts') p
  where (p->>'isPinned')::bool = true
)
order by captured_at desc limit 5;
```

Pick one of each (prefer `frederico.m.carvalho` for the pinned case if present).

## 2. Headless adapter check (no UI)

Write a throwaway script in `/tmp/block1-smoke.ts` that:

1. Loads each snapshot payload via `supabase--read_query`.
2. Runs `snapshotToReportData(payload)` and `buildBlock01Sample(payload.posts)`.
3. Asserts and prints:
   - `averages.likes` / `averages.comments` recomputed from `sample.performancePosts` match the values exposed to the UI.
   - `best.id` and `worst.id` are members of `eligiblePosts` (= `performancePosts`) and are NOT in `pinnedExcluded` nor `dateOutliersExcluded`.
   - `cadence.method`, `cadence.windowDays`, `cadence.sampleSize`, `performancePosts.length`.
   - `pickSubtitleKey(method, count)` returns the expected variant key.

Output a compact table per fixture so we can eyeball it.

## 3. UI copy check

For each fixture, render via the dev preview (`/analyze/$username` with `?snapshot=<id>` if supported, otherwise the live route after confirming cache hit) and capture screenshots desktop (1440) + mobile (375):

- `posts.subtitle` reflects the right variant (no "últimos 30 dias" unless `method === 'window_30d'`).
- `MethodologyLine` shows `count` + observed `days`, singular/plural correct.
- Exclusions hint appears (native `title`) when `pinnedExcluded > 0` or `dateOutliersExcluded > 0`.
- "Amostra reduzida" copy only when `method === 'insufficient'`.

Grep guard for stray hardcoded strings:

```bash
rg -n "últimos 30 dias|last 30 days" src/components/report-redesign/v2 src/i18n/locales
```

Expect zero hits outside the `window_30d` i18n keys.

## 4. Type + test gates

- `bunx tsc --noEmit`
- `bunx vitest run` (full suite). Confirm the 12 Block 1 tests still pass and that the 9 pre-existing email/follow-up failures are unchanged (no new failures introduced).

## 5. Deliverable

A short report containing:

- The two fixture IDs used (profile + captured_at).
- Per-fixture: method, windowDays, sampleSize, performancePosts.length, pinnedExcluded, dateOutliersExcluded, averages parity (pass/fail), best/worst membership (pass/fail), selected subtitle key, methodology line text PT+EN.
- Screenshots: 2 fixtures × 2 viewports = 4 images under `/mnt/documents/block1-smoke/`.
- `tsc` result, `vitest` summary (passed/failed counts with diff vs baseline).
- Any regression found, with file + line, and a proposed minimal fix (NOT applied in this pass).

## Files touched

None expected. Only `/tmp/block1-smoke.ts` (throwaway) and `/mnt/documents/block1-smoke/*` (artifacts).

## Checkpoint

- ☐ Approve fixture selection criteria (latest pinned + latest non-pinned snapshot)
- ☐ Approve running full `vitest` (≈ pre-existing 9 failures will still show)
- ☐ Approve writing screenshots to `/mnt/documents/block1-smoke/`
- ☐ Approve "report only, do not fix" policy if a regression is found
