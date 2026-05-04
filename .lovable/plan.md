
## Audit Results

| # | Question | Answer |
|---|----------|--------|
| 1 | Route convention | Flat dot-separated: `app.reports.$id.tsx` → `/app/reports/$id` ✅ Already exists |
| 2 | Route param = `report_requests.id` | Yes, uses `$id` → `getOwnedReport({ reportId: id })` ✅ |
| 3 | Signed PDF URL function exists | Yes: `getReportPdfUrl` in `reports.functions.ts` ✅ |
| 4 | Storage bucket + method | `report-pdfs` (private), `createSignedUrl(path, 60)` via `supabaseAdmin` ✅ |
| 5 | Safe fields exposed | ✅ `pdf_storage_path` never sent to client; `pdf_error_message` / `email_error_message` replaced with boolean + generic hint |

### What already works

- Header with username, date, status badge, competitor list
- Timeline with 3 steps (Pedido criado, PDF gerado, Email enviado)
- PDF card with download / generating / failed / not_generated states
- Error info card
- Back link to `/app/reports`
- Ownership check (`user_id = userId`) on both server functions

### Gaps vs. spec

| Gap | Detail |
|-----|--------|
| **Timeline missing "Análise ligada ao snapshot"** | Spec requires 4 steps; current has 3. Need step between "Pedido recebido" and "PDF gerado" showing snapshot linkage (`analysis_snapshot_id` presence). |
| **Timeline labels differ** | Spec: "Pedido recebido" (not "Pedido criado"). Minor copy fix. |
| **Delivery card missing** | Spec requires a separate delivery card showing `delivery_status` (sent / sending / failed / not_sent). Currently only shown as error info. |
| **`pdf_generated_at` not exposed** | `getOwnedReport` selects it from DB but doesn't return it. Timeline uses `updated_at` as proxy — should use `pdf_generated_at`. |
| **"Analyze another profile" action missing** | Spec requires a CTA linking to `/` alongside the back link. |

## Plan

### 1. Extend `getOwnedReport` return shape
**File:** `src/server/reports.functions.ts`

- Add `pdf_generated_at` to the select query (already selected, just not returned)
- Add it to the return object

### 2. Refine `app.reports.$id.tsx`
**File:** `src/routes/app.reports.$id.tsx`

- **Timeline:** 4 steps — "Pedido recebido", "Análise ligada", "PDF gerado" (use `pdf_generated_at`), "Email enviado"
- **Delivery card:** New card below PDF card showing delivery status with appropriate icon/copy for each state
- **Actions:** Add "Analisar outro perfil" link to `/` below the back link
- **Copy fix:** "Pedido recebido" instead of "Pedido criado"

### Security confirmation

- Ownership enforced via `.eq("user_id", userId)` on both `getOwnedReport` and `getReportPdfUrl`
- `pdf_storage_path` never leaves the server
- Error messages sanitized to generic hints
- `supabaseAdmin` used server-side only (`.server.ts`-imported client)
- RLS policy on `report_requests` adds defence-in-depth (`user_id = auth.uid()`)

### Edge cases

- `analysis_snapshot_id` is null → timeline step shows "Pendente"
- `pdf_generated_at` is null but `pdf_status = "generated"` → fallback to `updated_at`
- Report not found → existing NOT_FOUND error handling
- Legacy reports (matched via `lead_id`) → `getOwnedReport` currently only checks `user_id`, not `lead_id` — this is a known limitation but matches the list page behavior for owned reports

### Validation plan

- `bunx tsc --noEmit` — zero errors
- `bunx vitest run` — all pass
- Manual: open `/app/reports/{valid-id}` authenticated → see 4-step timeline, delivery card, both actions
- Manual: open `/app/reports/{other-user-id}` → NOT_FOUND error
- Manual: open `/app/reports/$id` unauthenticated → redirect to `/login`

### Files to edit

1. `src/server/reports.functions.ts` — add `pdf_generated_at` to return
2. `src/routes/app.reports.$id.tsx` — timeline, delivery card, action CTA, copy fixes
