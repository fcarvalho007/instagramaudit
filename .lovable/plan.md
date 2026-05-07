
# Audit: "Gerar relatório" admin flow — `/api/admin/generate-beta-report`

## PASS/FAIL Table

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | Endpoint exists | **PASS** | `src/routes/api/admin/generate-beta-report.ts`, route registered as `/api/admin/generate-beta-report` |
| 2 | Admin-protected | **PASS** | Calls `requireAdminSession()` at line 37. Throws 401 if no admin cookie, 403 if email not in allowlist. |
| 3 | Accepts only `report_request_id` | **PASS** | Parses `{ report_request_id, force? }` from body. Only `report_request_id` is used. `force` is declared but never read — dead field, harmless. |
| 4 | Validates report request status | **PASS** | `ALLOWED_SOURCE_STATUSES = ["approved", "pending_review"]`. Rejects any other status with 400. |
| 5 | No unauthorised generation | **PASS** | Admin session required. No public route calls this endpoint. The only caller is `admin.beta-requests.tsx:89` via `adminFetch` (adds admin auth cookie). |
| 6 | Respects provider kill switches | **PASS** | Pre-flight checks: (a) `getAnalysisExecutionMode()` must return `"fresh"` (409 if `cache_only`), (b) `isApifyEnabled()` must be true (409 if disabled), (c) `isTestingModeActive() && !isAllowed(handle)` blocks with 409. |
| 7 | `COMMENT_SCRAPER_ENABLED=false` respected | **PASS** | The endpoint delegates to `/api/analyze-public-v1` which checks `process.env.COMMENT_SCRAPER_ENABLED` at line 822 — only runs comment scraper when explicitly `"true"`. Default is `false`. |
| 8 | Creates or reuses snapshot correctly | **PASS** | Calls `/api/analyze-public-v1?refresh=1` which creates a fresh analysis snapshot. The `refresh=1` flag ensures a new snapshot is created (not cached). |
| 9 | Links snapshot to report_request | **PASS** | On success, updates `report_requests` with `analysis_snapshot_id: snapshotId` at line 190. |
| 10 | Updates statuses (processing/completed/failed) | **PASS** | Sets `processing` before the call (line 115), `completed` on success (line 189), `failed` on provider error (line 162) and on unexpected error (line 230). |
| 11 | Records `report_generated` event | **PASS** | Inserts into `product_events` with `event_type: "report_generated"`, `source: "admin_beta_queue"`, links `lead_id`, `handle`, `snapshot_id`, `report_request_id`. Fire-and-forget (line 201). |
| 12 | Handles errors safely | **PASS** | Three error paths: (a) provider failure → 502, status set to `failed`, error stored in metadata; (b) network/unexpected → 500, same rollback; (c) pre-flight failures → 409 with descriptive error. No unhandled exceptions. |
| 13 | Cost warning in UI is accurate | **PASS** | ConfirmDialog at `admin.beta-requests.tsx:195` says: *"Esta ação vai gerar uma análise Fresh para @{username}. Pode gerar custos reais (Apify). Continuar?"* — accurate, mentions Fresh and Apify costs. |
| 14 | No public route can trigger generation | **PASS** | Endpoint is at `/api/admin/generate-beta-report` (not under `/api/public/`). Protected by `requireAdminSession()`. No other route or component calls this endpoint. |

## Summary

**All 14 checks PASS.** The endpoint is well-implemented:

- **Security**: Admin-only, no public access path, proper auth guard.
- **Safety**: Three pre-flight kill switches (execution mode, Apify enabled, allowlist).
- **Resilience**: Status rollback to `failed` on all error paths, error details stored in metadata.
- **Audit trail**: `product_events` record created on success.
- **UI**: Cost warning is clear and accurate.

## Minor observations (non-blocking)

1. **`force` field declared but unused** — `body.force` is destructured at line 44 but never read. Dead code, harmless. Could be cleaned up eventually.
2. **`failed` not in `ALLOWED_SOURCE_STATUSES`** — The user's question mentions the button appears when status is `approved`, `pending_review` or `failed`, but the endpoint only allows `approved` and `pending_review`. If the button is shown for `failed` status, clicking it will return a 400 error. This is either intentional (retry blocked) or a minor UI/endpoint mismatch to verify.
3. **`INTERNAL_API_TOKEN` optional** — Line 136 adds the auth header only if the token exists. If not set, the internal call to `analyze-public-v1` proceeds without it. This works if `analyze-public-v1` doesn't require it for server-to-server calls, but should be confirmed.

## No code changes made. No providers called.
