
# Harden `generate-beta-report`: Remove Global Fresh Mode Dependency

## Problem

`generate-beta-report` (L79-87) blocks unless `executionMode === "fresh"`, forcing the admin to manually toggle the global mode. But the endpoint already calls `analyze-public-v1?refresh=1` with `Authorization: Bearer ${INTERNAL_API_TOKEN}` (L146-151), which bypasses `cache_only` server-side. The execution mode check is redundant and forces the risky global toggle.

## Old Behavior

1. Admin must go to `/admin/sistema` and switch global mode to "fresh"
2. Call `generate-beta-report`
3. Go back and switch to "cache_only"
4. Risk: forgetting step 3 exposes public users to provider calls

## New Behavior

1. Admin calls `generate-beta-report` directly
2. Internal token auth bypasses `cache_only` inside `analyze-public-v1`
3. Global mode stays `cache_only` throughout
4. Zero risk window

## Changes

### `src/routes/api/admin/generate-beta-report.ts`

1. **Remove** the `getAnalysisExecutionMode` import (L14)
2. **Remove** the execution mode pre-flight block (L79-87)
3. **Move** the `INTERNAL_API_TOKEN` check (currently L125-139) up to the pre-flight section (before setting status to "processing"), so it fails fast before any DB mutation
4. Keep everything else unchanged: admin auth, status validation, APIFY kill-switch, allowlist check, status transitions, failure handling, product event logging

One file changed. No schema changes. No public route changes. No PDF changes. No provider calls triggered.

## Validation

- `tsc --noEmit`
- `vitest run`
- Confirm no `getAnalysisExecutionMode` import remains
- Confirm `INTERNAL_API_TOKEN` is still required (409 if missing)
- Confirm public users cannot reach this endpoint

## Remaining Risks

- **Low**: The execution mode toggle UI in `/admin/sistema` is now only useful for the manual `analyze-public-v1` flow (direct browser testing). Consider removing it entirely in a future pass, since both admin refresh endpoints now use internal token auth.
