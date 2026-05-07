
# Premium Lead Detail Sheet — "Ficha de Cliente"

## UX Structure

A right-side `Sheet` (matching the existing `ReportDrawer` pattern) that opens when clicking a kanban card. Width: 480px. Scroll-contained. Structured in 6 visual sections separated by subtle dividers.

```text
┌─────────────────────────────────────────────┐
│  HEADER                                      │
│  Name · email · @handle · user_type badge    │
│  Commercial status pill · created date       │
├─────────────────────────────────────────────┤
│  PERFIL                                      │
│  Handle · ownership · purpose · source       │
│  Beta consent status                         │
├─────────────────────────────────────────────┤
│  RELATÓRIO                                   │
│  Request status badge · PDF status badge     │
│  Views · Cost · Last interaction             │
│  [Abrir relatório] [Copiar link]             │
├─────────────────────────────────────────────┤
│  INTELIGÊNCIA COMERCIAL                      │
│  Lead type · Intent signal · Suggested step  │
│  Status selector (full kanban stages)        │
├─────────────────────────────────────────────┤
│  TIMELINE                                    │
│  product_events for this lead/handle         │
│  (chronological, most recent first)          │
├─────────────────────────────────────────────┤
│  NOTAS & AÇÕES                               │
│  Internal notes (editable textarea)          │
│  [Marcar contactado] [Arquivar]              │
│  [Abrir Instagram] [Copiar email]            │
└─────────────────────────────────────────────┘
```

## Data Requirements — What's Available

| Field | Source | Available |
|---|---|---|
| name, email | `leads` | Yes |
| handle | `report_requests.instagram_username` (via kanban enrichment) | Yes |
| user_type, purpose, profile_ownership | `leads` | Yes |
| source | `leads.source` | Yes |
| beta_consent, beta_consent_at | `leads` | Yes |
| commercial_status | `leads.commercial_status` | Yes |
| created_at | `leads.created_at` | Yes |
| request_status | `report_requests.request_status` | Yes |
| pdf_status | `report_requests.pdf_status` | Yes |
| analysis_snapshot_id | `report_requests` | Yes |
| report_views | `product_events` (count where handle matches) | Yes (already enriched) |
| report_cost_usd | `analysis_events.estimated_cost_usd` (via snapshot) | Yes (already enriched) |
| last_interaction | `product_events` (latest event) | Yes (already enriched) |
| contacted_at | `leads.contacted_at` | Yes |
| internal_notes | `leads.internal_notes` | Yes |
| company | `leads.company` | Yes |
| timeline events | `product_events` (by lead_id or handle) | Yes |

### Fields to add to the enriched API response

The current `/api/admin/leads-kanban` GET returns `EnrichedLead` but is missing a few fields needed for the detail sheet:

- `profile_ownership` — exists in `leads`, not passed through
- `source` — exists in `leads`, not passed through
- `beta_consent` — exists in `leads`, not passed through
- `beta_consent_at` — exists in `leads`, not passed through
- `company` — already passed through

No new DB columns needed. No schema changes.

### Timeline data

A new lightweight API call (or expand the existing enrichment) to fetch `product_events` for a specific `lead_id` + `handle`. This is best done as a separate on-demand fetch when the sheet opens, not pre-loaded for all leads.

## Commercial Intelligence (derived, no new fields)

All computed client-side from existing data:

| Signal | Logic |
|---|---|
| Lead type | `user_type` mapped to label (Marca / Agência / Freelancer / Criador / Estudante) |
| Intent signal | Derived: has report + viewed = "Alto"; has report not viewed = "Médio"; no report = "Baixo" |
| Suggested next step | Based on `commercial_status` + report state (e.g. "Enviar email de follow-up", "Aguardar visualização") |

## Files to Create

| File | Purpose |
|---|---|
| `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` | Main Sheet component (~300 lines) |

## Files to Modify

| File | Change |
|---|---|
| `src/components/admin/v2/beta-leads/lead-card.tsx` | Add `onClick` to open detail sheet |
| `src/components/admin/v2/beta-leads/kanban-board.tsx` | Add state for selected lead, render `LeadDetailSheet` |
| `src/routes/api/admin/leads-kanban.ts` | Pass through `profile_ownership`, `source`, `beta_consent`, `beta_consent_at` in enriched response |
| `src/lib/admin/kanban-columns.ts` | Extend `EnrichedLead` type with the 4 new fields |

## Files NOT to Touch

- `src/components/report/` — all report rendering
- `src/routes/analyze.$username.tsx` — public route
- PDF pipeline files
- Provider/Apify/DataForSEO files
- `src/integrations/supabase/client.ts` / `types.ts`
- LOCKED_FILES.md protected files
- `src/styles/tokens.css` / `tokens-light.css`

## New API Endpoint (optional, recommended)

`GET /api/admin/lead-timeline/$id` — returns `product_events` for a lead (by `lead_id` and `handle`). Admin-protected. Loaded on-demand when the sheet opens. Keeps the kanban list endpoint fast.

## Implementation Scope (first pass)

1. Extend `EnrichedLead` type with 4 missing fields
2. Update `/api/admin/leads-kanban` to pass them through
3. Create `lead-detail-sheet.tsx` with all 6 sections
4. Wire click-to-open from `LeadCard` → `KanbanBoard` → `LeadDetailSheet`
5. Timeline section: fetch on-demand via inline fetch or new endpoint
6. Commercial intelligence: pure client-side derivation
7. Notes editing + status change: reuse existing `onUpdate` callback

## Typography and Design

- Uses the new admin typography scale (`.admin-section-title`, `.admin-body`, `.admin-meta`, `.admin-eyebrow`)
- Sheet header: 20px name, 13px email/handle
- Section titles: `.admin-section-title` (14px uppercase)
- Body: `.admin-body` (13px)
- Metadata: `.admin-meta` (12px)
- Badges: `AdminBadge` component
- All admin v2 tokens, no hardcoded colors
- Generous padding (24px sections), 16px vertical gaps between items
