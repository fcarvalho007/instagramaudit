
# Admin Report Generation for Beta Requests

## Architecture

The action triggers a **server-to-server call** to the existing `/api/analyze-public-v1` endpoint, which already handles:
- Apify calls with cost guards
- Kill-switch checks (`APIFY_ENABLED`, allowlist, `execution_mode`)
- Snapshot creation/caching
- Provider call logging + analysis event recording

This avoids duplicating any provider logic. The new code only orchestrates the request lifecycle around it.

```text
Admin UI (button)
  → POST /api/admin/generate-beta-report
    → Pre-flight checks (status, kill switches)
    → POST /api/analyze-public-v1 (server-to-server, with INTERNAL_API_TOKEN + ?refresh=1)
    → Link snapshot_id to report_request
    → Update request_status (processing → completed / failed)
    → Record product_event (report_generated)
  ← Response with result
```

## Cost-Control Plan

1. **Execution mode guard** — if `cache_only`, block with clear error message.
2. **APIFY_ENABLED** — checked by `analyze-public-v1`; if disabled, the call returns `PROVIDER_DISABLED` and the admin sees an explicit error.
3. **Allowlist** — if testing mode is active and the handle is not allowlisted, the call returns `PROFILE_NOT_ALLOWED`.
4. **Confirmation dialog** — UI shows a warning before triggering: "Esta acao pode gerar custos reais (Apify). Confirmar?"
5. **No PDF/email** — this action only generates the analysis snapshot. PDF and email remain separate admin actions.

## Status Lifecycle

```text
pending_review → (admin approves) → approved
approved → (admin clicks "Gerar relatório") → processing
processing → completed (snapshot linked)
processing → failed (error recorded in metadata)
```

Also allowed: `pending_review` + explicit confirmation → `processing` (skip approval step).

## DB Fields Needed

No schema changes. Existing fields suffice:
- `report_requests.analysis_snapshot_id` — links to the generated snapshot
- `report_requests.request_status` — lifecycle transitions
- `report_requests.metadata` — store generation errors, cost info
- `product_events` — `report_generated` event type

## Files to Create

| File | Purpose |
|---|---|
| `src/routes/api/admin/generate-beta-report.ts` | POST endpoint: validates request, calls analyze-public-v1, updates report_request |

## Files to Modify

| File | Change |
|---|---|
| `src/components/admin/v2/beta-requests/beta-request-actions.tsx` | Add "Gerar relatório" menu item (only for approved/pending_review) |
| `src/routes/admin.beta-requests.tsx` | Add `handleGenerateReport` callback with confirmation dialog |
| `src/routes/api/admin/report-requests.$id.ts` | Add `failed` to VALID_STATUSES |

## Files NOT to Touch

- `src/routes/api/analyze-public-v1.ts` (provider logic)
- Any locked file in `LOCKED_FILES.md`
- PDF pipeline (`generate-report-pdf`, `run-report-pipeline`)
- Email pipeline (`send-report-email`)
- Public routes (`/beta/request`, `/analyze/$username`)
- `src/integrations/supabase/client.ts`, `types.ts`

## Implementation Detail

**POST `/api/admin/generate-beta-report`:**
1. `requireAdminSession()`
2. Read `report_request` by ID, validate status is `approved` or `pending_review`
3. Pre-flight: check `getAnalysisExecutionMode()` is `fresh`, check `isApifyEnabled()`
4. Set `request_status = 'processing'`
5. Call `POST /api/analyze-public-v1` with `{ instagram_username, competitor_usernames }` and `Authorization: Bearer $INTERNAL_API_TOKEN` + `?refresh=1` (force fresh)
6. On success: extract `snapshot_id` from response, update `report_requests.analysis_snapshot_id` and `request_status = 'completed'`
7. On failure: set `request_status = 'failed'`, store error in `metadata`
8. Insert `product_event` with type `report_generated`

**UI confirmation dialog:**
- Uses existing `ConfirmDialog` component (`src/components/admin/v2/confirm-dialog.tsx`)
- Title: "Gerar relatório"
- Body: "Esta acao vai gerar uma analise Fresh para @{handle}. Pode gerar custos reais (Apify). Continuar?"
- Destructive styling on confirm button

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Apify cost from accidental double-click | Processing status blocks re-entry; analyze-public-v1 has its own cache |
| analyze-public-v1 timeout (60s Apify) | Admin endpoint has 90s timeout; failure status recorded |
| Kill switches bypass | Pre-flight checks in admin endpoint + analyze-public-v1's own checks = double layer |
| Allowlist blocks the handle | Pre-flight warning if testing mode active and handle not in allowlist |
