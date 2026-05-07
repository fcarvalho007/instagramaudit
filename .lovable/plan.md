
# Admin Beta Request Queue

## Data Model Audit

No schema changes needed. Everything required already exists:

- `report_requests`: `request_status`, `request_source`, `lead_id`, `instagram_username`, `analysis_snapshot_id`, `metadata` (contains `user_type`, `purpose`, `profile_ownership` from beta submissions)
- `leads`: `email`, `name`, `user_type`, `purpose`, `profile_ownership`, `commercial_status`, `internal_notes`, `contacted_at`

The existing `GET /api/admin/report-requests` already queries this data with pagination, filters, and lead joins. However it only returns `lead.id`, `lead.name`, `lead.email` — we need to extend the select to include the beta fields (`user_type`, `purpose`, `profile_ownership`, `source`).

## API Plan

### Extend existing `GET /api/admin/report-requests`

Add `user_type`, `purpose`, `profile_ownership`, `source` to the lead join select. Add `request_source` filter param so we can filter to `beta_form` requests only.

### Add `PATCH /api/admin/report-requests/$id`

New handler on the existing `report-requests.$id.ts` route. Accepts:
- `request_status` — approve/reject/archive
- Server-side validation of allowed transitions

Also updates `leads.contacted_at` if action is "mark contacted", and fires a `product_event` for audit.

No new API files — extend the two existing ones.

## UI Structure

### Route: `src/routes/admin.beta-requests.tsx`

New admin tab page. Structure:

```text
┌───────────────────────────────────────────────────────┐
│  Beta Requests        [Filtro status ▾] [Pesquisar]   │
│  12 pendentes · 3 aprovados · 1 rejeitado             │
├───────────────────────────────────────────────────────┤
│  Tabela                                               │
│  ┌─────┬──────┬──────┬──────┬──────┬──────┬────────┐  │
│  │ Data│Handle│Email │Tipo  │Obj.  │Status│ Ações  │  │
│  ├─────┼──────┼──────┼──────┼──────┼──────┼────────┤  │
│  │ ... │ ...  │ ...  │ ...  │ ...  │ ...  │ ...    │  │
│  └─────┴──────┴──────┴──────┴──────┴──────┴────────┘  │
│  [← Anterior]                    [Seguinte →]         │
└───────────────────────────────────────────────────────┘
```

### Components (new, under `src/components/admin/v2/beta-requests/`)

1. **`beta-requests-table.tsx`** — Table with columns: data, handle (link to IG), email (copy button), nome, tipo utilizador, objetivo, propriedade do perfil, status (badge), ações (dropdown)
2. **`beta-request-actions.tsx`** — DropdownMenu with: aprovar, rejeitar, marcar contactado, arquivar, abrir Instagram, copiar email, copiar handle, notas (opens sheet)
3. **`beta-request-filters.tsx`** — Pill/select filters for status + source

### Detail sheet

Reuse the existing `RequestDetailSheet` pattern but enriched with beta fields. Or, for simplicity in phase 1, the actions dropdown handles everything inline without a separate sheet.

### Navigation

Add "Beta Requests" tab to `AdminTabsNav` at `/admin/beta-requests`.

## Files to Create

| File | Purpose |
|------|---------|
| `src/routes/admin.beta-requests.tsx` | Route page |
| `src/components/admin/v2/beta-requests/beta-requests-table.tsx` | Table component |
| `src/components/admin/v2/beta-requests/beta-request-actions.tsx` | Actions dropdown |
| `src/components/admin/v2/beta-requests/beta-request-filters.tsx` | Status filter pills |

## Files to Modify

| File | Change |
|------|--------|
| `src/routes/api/admin/report-requests.ts` | Extend lead join to include beta fields; add `request_source` filter |
| `src/routes/api/admin/report-requests.$id.ts` | Add PATCH handler for status changes |
| `src/components/admin/v2/admin-tabs-nav.tsx` | Add "Beta Requests" tab |

## Files NOT to Touch

- `src/routes/analyze.$username.tsx` (locked)
- `src/lib/beta.functions.ts` (no changes needed)
- `src/lib/tracking.functions.ts` / `src/lib/tracking.server.ts`
- `src/styles/tokens.css` / `src/styles/tokens-light.css` (locked)
- `src/integrations/supabase/client.ts` / `types.ts` (auto-generated)
- Any provider logic (Apify, OpenAI, DataForSEO)
- PDF pipeline files
- Cost/revenue admin files

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| PATCH on report_requests could accidentally trigger analysis | PATCH only updates `request_status` field — no analysis pipeline call. Report generation will be a separate, explicit future prompt |
| Extending the lead join select could break existing cockpit consumers | The existing cockpit `RequestsPanel` uses the same endpoint but only reads `id`, `name`, `email` from the lead — additional fields are ignored by existing consumers |
| Adding a tab to AdminTabsNav changes a shared component | Low risk — only adds one entry to the TABS array, no layout changes |
| Large number of requests could slow the table | Already paginated (existing API supports `page` + `pageSize`). Default 25 rows |

## Implementation Order

1. Extend `GET /api/admin/report-requests` (lead join + source filter)
2. Add `PATCH` to `report-requests.$id.ts`
3. Create filter pills component
4. Create actions dropdown component
5. Create table component
6. Create route page
7. Add tab to nav
