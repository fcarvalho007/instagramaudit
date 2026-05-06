
# QA Plan — Admin Execution Mode (UI + Backend)

This is a read-only validation. No code changes unless issues are found.

## What will be validated

### 1. UI state consistency (3 surfaces share the same query key)

All three surfaces use `queryKey: ["admin", "execution-mode"]`:
- **Sistema card** (`execution-mode-card.tsx`) — segmented control + status badge
- **Admin header badge** (`admin.tsx` → `ExecutionModeBadge`)
- **Visao Geral strip** (`admin.visao-geral.tsx` → `ExecutionModeStrip`)

**Test**: Toggle mode in Sistema, navigate to Visao Geral, confirm all three update. Fresh activation must open the `AlertDialog` confirmation.

### 2. Backend protection in cache_only

**Test**: With mode set to `cache_only`, trigger an analysis for a profile with an existing snapshot via the `/api/analyze-public-v1` endpoint.

- Confirm the response uses cached/stale data (`data_source=cache` or `stale`)
- Query `provider_call_logs` before and after — confirm zero new rows
- Query `analysis_events` — confirm `outcome=blocked_cache_only` or `data_source=cache`, `estimated_cost_usd=0`

### 3. No snapshot case

**Test**: In `cache_only`, request analysis for a non-existent profile.

- Confirm response error code is `CACHE_ONLY_NO_DATA` (HTTP 503)
- Confirm zero new `provider_call_logs`

### 4. Cache maintenance safety

**Test**: Click "Expirar cache" in the cache-maintenance card.

- Confirm it only runs an `UPDATE analysis_snapshots SET expires_at = now()` (code already verified in `expireSnapshotForHandle`)
- Confirm no provider calls are triggered
- Confirm next analysis only calls APIs if mode is `fresh`

### 5. Fresh mode

**Test**: Switch to Fresh, expire cache for a test profile, run analysis.

- Confirm new `provider_call_logs` are created
- Confirm `analysis_event_id` linkage on provider calls where supported

## Execution method

- Use browser tools to navigate to the admin area and toggle modes
- Use `supabase--read_query` to check `provider_call_logs` and `analysis_events` counts before/after
- Use browser network inspection to verify API responses

## Deliverables

- PASS/FAIL table for all 5 test cases
- `provider_call_logs` evidence (row counts before/after)
- `analysis_events` evidence
- Files changed (if any fixes needed)
- `tsc --noEmit` and `vitest run` results
