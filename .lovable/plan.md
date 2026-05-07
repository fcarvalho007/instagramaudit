
# Admin "Gerar Relatório" — UI Integration Plan

## Current State

The backend is **already fully implemented**:

- `POST /api/admin/generate-beta-report` — admin-only endpoint that:
  - Validates admin session
  - Checks execution mode (must be `fresh`)
  - Checks `APIFY_ENABLED` kill switch
  - Checks allowlist (testing mode)
  - Calls `/api/analyze-public-v1?refresh=1` with `INTERNAL_API_TOKEN`
  - Updates `report_requests.request_status`: `processing → completed | failed`
  - Links `analysis_snapshot_id` to the report request
  - Records `report_generated` product event
  - Stores error details in `metadata` on failure

**What's missing**: the UI trigger in the Lead Detail Sheet and the `report_request_id` field in the data model.

## Implementation

### 1. Add `report_request_id` to the data flow

**`src/lib/admin/kanban-columns.ts`** — add `report_request_id: string | null` to `EnrichedLead`.

**`src/routes/api/admin/leads-kanban.ts`** — return `report_request_id: req?.id ?? null` in the enriched lead object.

### 2. Add "Gerar relatório" button to the Lead Detail Sheet

**`src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`** — in the Relatório section:

- Add a "Gerar relatório" `AdminActionButton` (visible only when `report_request_id` exists and `report_status` is `approved`, `pending_review`, or `failed`)
- Before calling the endpoint, show a **confirmation dialog** with:
  - Cost warning: "Esta ação consome créditos Apify (~€0.05–0.10 por perfil)."
  - Handle being analyzed
  - Current execution mode status
- On click → `POST /api/admin/generate-beta-report` with `{ report_request_id }`
- Show loading state on the button during generation
- On success → toast + auto-refresh lead data (call parent callback)
- On failure → toast with error message from API

### 3. Pre-flight status indicators

In the confirmation dialog, show:
- Execution mode: green check if `fresh`, red warning if `cache_only`
- Provider status: visual indicator based on response from endpoint's pre-flight checks
- Allowlist status: warning if handle is not on allowlist in testing mode

These are handled server-side — the UI only needs to display error responses from the 409 pre-flight blocks.

### 4. Status lifecycle (already implemented server-side)

```text
approved/pending_review
    ↓ (admin clicks "Gerar relatório")
processing
    ↓
completed ←→ failed
```

No DB schema changes needed — all fields exist.

## Files to modify

1. **`src/lib/admin/kanban-columns.ts`** — add `report_request_id` to `EnrichedLead`
2. **`src/routes/api/admin/leads-kanban.ts`** — return `report_request_id` in enriched data
3. **`src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`** — add generate button + confirmation dialog

## Files NOT touched

- No backend endpoint changes (already complete)
- No DB migrations
- No public report changes
- No provider/cost/PDF logic changes
- `COMMENT_SCRAPER_ENABLED` remains untouched

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
