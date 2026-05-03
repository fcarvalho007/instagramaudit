
# Smoke Test Results — Comment Intelligence

## What happened

1. **Force-refresh**: SUCCESS. The snapshot for `frederico.m.carvalho` was expired (1 snapshot affected).
2. **Fresh analysis**: SUCCESS. A new fresh analysis ran at 18:28 UTC (event `adb8392d`, data_source=`fresh`, cost $0.011, duration 19.8s).
3. **Comment enrichment**: SKIPPED. No `comment_enrichment_jobs` row was created. No `comment_intelligence` field exists in the snapshot payload.

## Root cause

The comment scraper gate in `analyze-public-v1.ts` (line 1046-1055) checks two env vars:
- `COMMENT_SCRAPER_ENABLED` — must be `"true"` (exists in secrets but likely set to `"false"` or empty)
- `COMMENT_SCRAPER_INTERNAL_TEST` — not present in secrets at all

Both are `false`, so `shouldRunCommentScraper()` returns `false` and the entire enrichment block is skipped.

## What needs to happen

**One action**: Set `COMMENT_SCRAPER_ENABLED` to `"true"` (or alternatively set `COMMENT_SCRAPER_INTERNAL_TEST` to `"true"` for a safer test-only run).

Then re-run the smoke test:
1. Force-refresh `frederico.m.carvalho` again
2. Trigger one fresh analysis
3. Validate all 15 checkpoints

## Security finding (non-blocking)

`/api/admin/force-refresh` uses `requireAdminSession()` which relies **solely on the `X-Admin-Email` header** checked against `ADMIN_ALLOWED_EMAILS`. There is no JWT, session cookie, password, or 2FA. Anyone who knows the allowed email can forge the header.

This is acknowledged in the code comments as "risco aceite pelo owner durante a fase de testes" — acceptable risk for private testing, but must be upgraded before public launch.

**Mark as security follow-up. Do not fix in this task.**

## Status

**FAIL — keep disabled until the gate secret is activated and the full async flow is validated end-to-end.**

**Smallest next fix**: Set the `COMMENT_SCRAPER_ENABLED` secret to `"true"`, then re-run this exact smoke test.
