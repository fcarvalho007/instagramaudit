
# Quality verification — fixes found

## Verification results

All major components are correctly wired:

| Area | Status |
|------|--------|
| Comment scraper budget (10/post, $0.25 cap) | Done |
| Comment intelligence aggregator | Done |
| UI component (TransparencyStrip, signals, unavailable) | Done |
| Diagnostic block wiring (Q05 audience card) | Done |
| Snapshot adapter (comment_intelligence field) | Done |
| Event attribution in pipeline (linkProviderCallsToEvent) | Done |
| Admin cost breakdown (SectionSkeleton/Error/Empty + mobile) | Done |
| Sync cron (sync-apify-costs) | Done |
| Tests: 78/78, typecheck: 0 errors | Pass |

## Issue found

**`as never` type casts in `src/lib/analysis/events.ts`** — lines 185 and 211 use `as never` to bypass type checking on `analysis_event_id`. The column IS in the generated Supabase types, so these casts are unnecessary. While they shouldn't cause runtime failures, they mask potential type issues and make the code less maintainable.

DB check: 66 provider_call_logs exist, 0 are linked to events. The `linkProviderCallsToEvent` function runs correctly in the code path (line 450 of analyze-public-v1.ts) but the `as never` casts should be cleaned up for clarity.

## Changes

### `src/lib/analysis/events.ts`

1. Line 185: Remove `as never` from `.update({ analysis_event_id: analysisEventId } as never)` — change to `.update({ analysis_event_id: analysisEventId })`
2. Line 211: Remove `as never` from `.is("analysis_event_id" as never, null)` — change to `.is("analysis_event_id", null)`

### Validation

- `bunx tsc --noEmit` — must pass (confirms the column is properly typed)
- `bunx vitest run` — all 78 tests pass
