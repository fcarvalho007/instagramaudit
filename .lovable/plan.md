
# Premium Lead Detail Sheet — Upgrade Plan

## Current State

The `LeadDetailSheet` already exists with 6 sections (Header, Perfil, Relatório, Inteligência comercial, Timeline, Notas & Ações). It covers most of the requested fields. This plan focuses on **visual polish, density improvements, and minor data enrichments** — not a rebuild.

## Data Availability

| Requested field | Available in `EnrichedLead`? | Source |
|---|---|---|
| Name | Yes | `lead.name` |
| Email | Yes | `lead.email` |
| Instagram handle | Yes | `lead.handle` |
| User type | Yes | `lead.user_type` |
| Purpose | Yes | `lead.purpose` |
| Profile ownership | Yes | `lead.profile_ownership` |
| Commercial status | Yes | `lead.commercial_status` |
| Request status | Yes | `lead.report_status` |
| Report status (PDF) | Yes | `lead.pdf_status` |
| Report views | Yes | `lead.report_views` |
| Report cost | Yes | `lead.report_cost_usd` |
| Last interaction | Yes | `lead.last_interaction` |
| Product events timeline | Yes | fetched via `/api/admin/lead-timeline` |
| Internal notes | Yes | `lead.internal_notes` |
| Quick actions | Yes | already implemented |

**Missing fields**: None. All requested data is already available. No DB migration needed.

## Visual Upgrade Plan

### 1. Header — Premium profile hero
- Add a large avatar placeholder (initials circle, 48px, using lead name initials)
- Make name 22px semibold (upgrade from `admin-panel-title` 20px)
- Email as a clickable `mailto:` link with subtle hover
- Handle as a clickable Instagram link
- Status badge with column color — already present, keep

### 2. KPI summary strip (NEW)
- Add a horizontal 3-column KPI row below the header: **Views**, **Custo**, **Dias desde criação**
- Use `admin-code` for numbers, `admin-eyebrow` for labels
- Subtle card background with rounded corners

### 3. Perfil section
- Increase `DetailRow` vertical padding from `py-1.5` to `py-2.5` (audit fix already recommended)
- Add icons to each row (User, Target, Globe, Shield) for scanability

### 4. Relatório section
- Show badges inline with labels instead of a separate badge row
- Add progress indicator: a simple 3-step tracker (Pedido → Geração → Entrega) with active state

### 5. Inteligência comercial
- Intent signal box: upgrade to a card with colored left border accent
- Suggested step box: add a subtle icon (Lightbulb)
- Status selector: increase height to `h-10` for touch targets

### 6. Timeline
- Add event-type-specific icons (Eye for viewed, FileText for generated, etc.)
- Add relative time ("há 2h") alongside absolute date
- Limit to 10 events with "Ver mais" expansion

### 7. Notas & Ações
- Upgrade textarea with a counter (chars used)
- Group action buttons in a 2x2 grid instead of flex-wrap for cleaner layout
- Add WhatsApp action button (opens `wa.me/` if phone available — future-proof)

### 8. Sheet chrome
- Increase sheet width from `sm:max-w-[480px]` to `sm:max-w-[520px]`
- Add a subtle top-border accent line using the column color
- Smooth scroll with `scroll-smooth` class
- Add a sticky header with lead name visible while scrolling

## Files to modify

1. **`src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`** — all visual upgrades above
2. **`src/styles/admin-tokens.css`** — add `.admin-kpi-strip` utility if needed

## Files NOT touched
- No DB migrations
- No public report changes
- No provider/cost/PDF logic
- No kanban-board.tsx changes (card already opens the sheet)

## Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
