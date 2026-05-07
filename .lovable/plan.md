
# Admin Commercial Kanban — Beta Leads

## Data Model Changes

### New columns on `leads` table

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `commercial_status` | text | `'novo_pedido'` | Kanban column position |
| `internal_notes` | text | `NULL` | Free-text admin notes |
| `contacted_at` | timestamptz | `NULL` | When admin marked as contacted |
| `archived_at` | timestamptz | `NULL` | Soft archive timestamp |

**Allowed values for `commercial_status`:**
`novo_pedido`, `em_analise`, `relatorio_gerado`, `relatorio_visto`, `feedback_pedido`, `interessado`, `potencial_cliente`, `convertido`, `arquivado`

### Migration

```sql
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS commercial_status text NOT NULL DEFAULT 'novo_pedido',
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_commercial_status ON public.leads (commercial_status);
```

No new tables needed. All card data is assembled by joining `leads` + `report_requests` + `product_events` (aggregated) + `analysis_snapshots` (for cost).

---

## API Endpoints

### 1. `GET /api/admin/leads-kanban`

Returns all non-archived leads enriched with:
- Latest `report_requests` row (status, snapshot_id, pdf_status)
- Report view count from `product_events` WHERE `event_type = 'report_viewed'` AND `handle` matches
- Estimated cost from `analysis_snapshots` or `provider_call_logs`
- Last interaction = MAX of (lead.updated_at, last product_event.created_at)

Response shape per lead:
```json
{
  "id": "uuid",
  "email": "...",
  "handle": "...",
  "user_type": "...",
  "purpose": "...",
  "commercial_status": "novo_pedido",
  "internal_notes": "...",
  "report_status": "pending",
  "report_cost_usd": 0.12,
  "report_views": 3,
  "feedback_score": null,
  "last_interaction": "2026-05-07T...",
  "created_at": "..."
}
```

### 2. `PATCH /api/admin/leads-kanban/$id`

Body: `{ commercial_status?, internal_notes?, contacted_at? }`

Updates the lead row. Fires `product_event` with type `lead_status_changed` for audit.

---

## UI Structure

### Route: `src/routes/admin.beta-leads.tsx`

Replaces or sits alongside `admin.clientes` (the current clientes page is mock-only). New dedicated page for real beta lead management.

### Layout

```text
┌─────────────────────────────────────────────────────┐
│  Beta Leads · Kanban          [Pesquisar] [Filtrar]  │
├─────────────────────────────────────────────────────┤
│  Novo │ Análise │ Gerado │ Visto │ Feedback │ ...   │
│  ┌──┐ │  ┌──┐   │  ┌──┐  │       │          │       │
│  │  │ │  │  │   │  │  │  │       │          │       │
│  └──┘ │  └──┘   │  └──┘  │       │          │       │
│  ┌──┐ │         │        │       │          │       │
│  │  │ │         │        │       │          │       │
│  └──┘ │         │        │       │          │       │
└─────────────────────────────────────────────────────┘
```

- Horizontal scroll for 9 columns
- Each column has a header with count badge
- Cards are vertically stacked within each column

### Card Content

Each card shows:
- **Email** (truncated)
- **@handle** (link to public report)
- **User type** badge (e.g. "Marca", "Freelancer")
- **Purpose** (one-liner)
- **Report status** badge (pending / generated / viewed)
- **Cost** if available (e.g. "€0.12")
- **Views** count
- **Last interaction** relative time
- **Internal notes** preview (first line, expandable)

### Card Actions (dropdown or icon row)

- **Abrir relatório** — opens `/analyze/{handle}` in new tab
- **Copiar link** — copies public report URL
- **Marcar contactado** — sets `contacted_at = now()`
- **Arquivar** — moves to `arquivado` column
- **Editar notas** — inline textarea or sheet

### Drag-and-drop

Not in phase 1. Status changes via a dropdown select on each card or via the detail sheet. Drag can be added later with `@hello-pangea/dnd`.

---

## Admin Workflow

1. New beta request arrives → card appears in **Novo pedido**
2. Admin reviews → moves to **Em análise** (manual)
3. Admin triggers analysis → system moves to **Relatório gerado** (can be automated later via `report_requests.request_status`)
4. User views report → system could auto-advance to **Relatório visto** (via `report_viewed` event count > 0)
5. Admin requests feedback → **Feedback pedido**
6. Lead shows interest → **Interessado** / **Potencial cliente** / **Convertido** (manual)
7. Dead leads → **Arquivado**

---

## Implementation Phases

### Phase 1 — Schema + API (this prompt)
- Migration adding 4 columns to `leads`
- Server route `GET /api/admin/leads-kanban` with joined query
- Server route `PATCH /api/admin/leads-kanban/$id` for status/notes updates

### Phase 2 — Kanban UI
- Route `admin.beta-leads.tsx`
- Kanban column layout with horizontal scroll
- Lead cards with badges, actions dropdown
- Status change via select dropdown
- Notes editing via sheet/dialog
- Quick actions (open report, copy link, mark contacted, archive)

### Phase 3 — Automation (future)
- Auto-advance status based on product events
- Drag-and-drop reordering
- Filters by date, status, user_type
- Export CSV

---

## Technical Notes

- No new npm dependencies in phase 1-2 (uses existing shadcn components: Card, Badge, Select, Sheet, DropdownMenu, ScrollArea)
- Admin auth gate already exists via `AdminGate` component
- Design tokens from `tokens.css` — admin surfaces use `--admin-*` variables
- All queries use `supabaseAdmin` (server-side, bypasses RLS)
- `product_events` query is aggregated server-side to avoid N+1
