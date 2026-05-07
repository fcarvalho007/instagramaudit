
# Admin Visual UX/UI Audit — Typography, Density and Consistency

## Overall Assessment: FAIL (conditional)

The admin has strong design bones (light theme, glassmorphism tabs, accent system, editorial page headers) but suffers from **micro-typography compression** and **density inconsistency** that erode the premium cockpit feel. Fixable without structural rewrites.

---

## 1. Typography Problems

### 1.1 Dangerously small text (`text-[10px]` — 19 occurrences)

10px is below WCAG readability for body/metadata. Worst offenders:

| File | Element | Current | Impact |
|---|---|---|---|
| `lead-card.tsx` L166 | Purpose text | `text-[10px]` | Unreadable on 1080p |
| `lead-card.tsx` L175 | Stats row (cost, views, time) | `text-[10px]` | Critical metadata invisible |
| `lead-card.tsx` L189 | Internal notes preview | `text-[10px]` | Italics + 10px = blur |
| `lead-card.tsx` L203 | Status selector trigger | `text-[10px]` | Interactive element too small |
| `kanban-board.tsx` L68 | Column count badge | `text-[10px]` | Acceptable for counter pill |
| `kanban-board.tsx` L82 | Empty column placeholder | `text-[10px]` | Minor |
| `visual-cover-debug-card.tsx` (5x) | Debug data | `text-[10px]` | Acceptable for dev-only debug |
| `test-profiles-card.tsx` (3x) | Status badges | `text-[10px]` | Should be 11px min |
| `suggestions-section.tsx` L76,83 | Timestamp + JSON pre | `text-[10px]` | Hard to read |
| `waterfall-section.tsx` L195 | Waterfall note | `text-[10px]` | Should be 11px |

### 1.2 Overuse of `text-[11px]` (20+ occurrences)

11px is the current floor for badges and eyebrows. This is acceptable for labels but too small when used as body text or interactive elements:

- `AdminBadge` at 11px — acceptable
- `AdminActionButton` sm at 11px — borderline; md at 12px is also tight
- `admin-eyebrow` class at 11px — acceptable for eyebrow role
- `profiles-table-section.tsx` body cells at 11px — too tight for data tables

### 1.3 Section headers too small

`AdminSectionHeader` h2 is `fontSize: 13` with uppercase. While the uppercase treatment adds visual weight, 13px for an h2 creates a flat hierarchy — barely distinguishable from body text.

### 1.4 Cockpit data-table header

`data-table.tsx` uses `text-[0.6875rem]` (11px) for th — acceptable for table headers but inconsistent with the admin v2 `admin-eyebrow` at 11px (they should share the same class).

### 1.5 `text-xs` (12px) used 78 times

Many of these are appropriate (dropdowns, secondary info). But there is no consistent separation between "small metadata" (should be 11px eyebrow) and "secondary body" (should be 13px). The same `text-xs` class serves both roles, flattening hierarchy.

### 1.6 Missing mid-range (14px)

Almost nothing in the admin uses 14px (`text-sm`). The jump goes from 12px (`text-xs`) straight to `text-base` (16px). This leaves a gap for comfortable body text, table cells, and card descriptions.

---

## 2. Density Problems

### 2.1 Kanban cards too compressed

`LeadCard` sets `style={{ fontSize: 12 }}` as a blanket override and then goes even smaller with 10px children. Combined with `!p-3` padding override, cards feel like developer debug output, not a business pipeline view.

- Card padding: 12px (from `!p-3`) — should be 16px minimum
- Vertical gaps between sections: 6px (`mb-1.5`) — should be 8-10px
- Email/handle: 11px — should be 13px for the primary identifier
- Badge gap: 4px — acceptable
- Status select height: 24px (`h-6`) — too small for a touch/click target

### 2.2 Kanban columns too narrow

Column width is hardcoded at 240px. At desktop resolution this feels cramped. Should be 260-280px for comfortable reading.

### 2.3 AdminCard padding inconsistency

`AdminCard` base padding is 24px. But `KPICard` overrides with `!p-4` (16px) through `!p-8` (32px). `LeadCard` uses `!p-3` (12px). These `!important` overrides bypass the design system.

### 2.4 Table row density

The cockpit `DataTable` uses `px-3.5 py-3` for cells — comfortable. But `beta-requests-table.tsx` and `profiles-table-section.tsx` use shadcn's default TableCell padding which may differ. This creates density mismatch between tabs.

---

## 3. Consistency Problems

### 3.1 Two parallel design systems

The cockpit panels (under `cockpit/`) use dark theme tokens (`text-content-primary`, `bg-surface-elevated`, `border-border-subtle`) while admin v2 components use light theme tokens (`text-admin-text-primary`, `bg-admin-surface`, `border-admin-border`). The cockpit renders inside `.admin-cockpit-legacy` wrapper which partly bridges this, but the typography scales diverge.

### 3.2 Hardcoded colors in AdminCard and AdminPageHeader

`AdminCard` uses inline hex (`#FFFFFF`, `#D3D1C7`, `#2C2C2A`) instead of CSS variables. `AdminPageHeader` does the same (`#5F5E5A`, `#2C2C2A`). This was an emergency fix (documented in the file) but should be migrated to admin tokens.

### 3.3 Font-family inconsistency

`AdminPageHeader` eyebrow hardcodes `fontFamily: '"JetBrains Mono"...'` while `admin-eyebrow` class in CSS uses the same font. Should use the shared class.

### 3.4 Tab navigation size

Tab pills at `text-[13px]` are appropriate but there are 10 tabs now. At this count, the row wraps on smaller desktops. Consider grouping or a scrollable approach.

---

## 4. Proposed Admin Typography Scale

```text
Role              Current        Proposed     Class/Token
─────────────────────────────────────────────────────────
Page title (h1)   36px           36px         (keep)
Section h2        13px upper     14px upper   admin-section-title
Card title        13px (varies)  14-15px      admin-card-title
Body text         12px (text-xs) 13-14px      admin-body / text-[13px]
Table cell        12px / 11px    13px         admin-table-cell
Metadata          10-11px        12px         admin-meta
Eyebrow/label     11px upper     11px upper   admin-eyebrow (keep)
Badge             11px           11px         AdminBadge (keep)
Button sm         11px           12px         AdminActionButton sm
Button md         12px           13px         AdminActionButton md
Stat sub-line     11px           12px         admin-stat-sub
Interactive min   10px           12px         (enforced floor)
```

**Key rule: Nothing interactive or informational below 12px.** The 11px floor is reserved exclusively for decorative eyebrows and badge pills.

---

## 5. Proposed Density Rules

```text
Element               Padding/Gap    Min height
────────────────────────────────────────────────
Card (default)        24px           -
Card (compact/kanban) 16px           -
Card title            mb-8px         -
Section title         mb-16px        -
Body paragraph        mb-6px         -
Metadata line         mb-4px         -
Badge                 px-8 py-3px    20px
Button sm             px-10 py-4px   28px
Button md             px-12 py-6px   32px
Table th              px-16 py-12px  -
Table td              px-16 py-10px  -
Kanban column         width 270px    -
Kanban card gap       8px            -
Select trigger (min)  -              28px
```

---

## 6. Components to Refactor (priority order)

### Tier 1 — High impact, high frequency

| # | Component | Issue | Effort |
|---|---|---|---|
| 1 | `lead-card.tsx` | 10px text, cramped density, unreadable metadata | Small |
| 2 | `kanban-board.tsx` | Narrow columns, tiny counters, small empty state | Small |
| 3 | `admin-action-button.tsx` | sm size too small (11px, h-26px) | Trivial |
| 4 | `admin-section-header.tsx` | h2 at 13px too flat | Trivial |

### Tier 2 — Consistency pass

| # | Component | Issue | Effort |
|---|---|---|---|
| 5 | `admin-stat.tsx` | sub-line at 11px, delta at text-xs | Trivial |
| 6 | `admin-badge.tsx` | 11px is fine, but consider 12px for better readability | Trivial |
| 7 | `admin-card.tsx` | Migrate from hardcoded hex to CSS vars | Small |
| 8 | `admin-page-header.tsx` | Migrate from inline styles to CSS vars/classes | Small |

### Tier 3 — Tab-specific fixes

| # | Component | Issue | Effort |
|---|---|---|---|
| 9 | `beta-request-filters.tsx` | Filter pills at 11px — should use FilterPills | Small |
| 10 | `beta-requests-table.tsx` | Audit cell sizes vs new scale | Small |
| 11 | `profiles-table-section.tsx` | 11px body cells | Small |
| 12 | `test-profiles-card.tsx` | 10px badges | Trivial |
| 13 | `suggestions-section.tsx` | 10px timestamps | Trivial |

### Tier 4 — Optional polish

| # | File | Issue |
|---|---|---|
| 14 | `visual-cover-debug-card.tsx` | 10px debug data (acceptable if dev-only) |
| 15 | `admin-tabs-nav.tsx` | 10 tabs may need grouping at smaller desktops |
| 16 | `cockpit/parts/data-table.tsx` | Align header class with admin-eyebrow |

---

## 7. Files NOT to Touch

- `src/components/report/` (all report rendering)
- `src/lib/report/variant-overrides.server.ts`
- `src/server/admin/variant-overrides.functions.ts`
- `src/routes/analyze.$username.tsx` (public route)
- `src/routes/admin.report-preview.$username.tsx` (uses report components)
- `src/integrations/supabase/client.ts` / `types.ts`
- `src/styles/tokens.css` / `tokens-light.css` (dark/report tokens)
- PDF pipeline files
- Provider/Apify/DataForSEO files
- Any file listed in LOCKED_FILES.md

---

## 8. Recommended Implementation Sequence

1. **Define admin typography scale in `admin-tokens.css`** — add utility classes (`admin-body`, `admin-meta`, `admin-card-title`, `admin-section-title`) so components can adopt them incrementally.
2. **Tier 1 refactors** — Lead card + kanban board + action button + section header. Highest visual return.
3. **Tier 2 consistency** — AdminStat sub-lines, AdminCard/PageHeader token migration.
4. **Tier 3 tab fixes** — Beta requests, profiles table, test profiles.
5. **QA pass** — Visual browser check of each admin tab at 1460px and 1024px.

Each tier is a separate prompt. No tier should exceed 6-8 files.

---

## 9. Risks

- **Cockpit legacy divergence**: The cockpit panels use dark-theme tokens inside a light wrapper. Touching cockpit typography requires care to avoid breaking the embedded dark panel rendering.
- **`!important` overrides**: Several KPICard/LeadCard overrides use `!p-*` which fight the base AdminCard padding. Refactoring should replace overrides with proper card size variants.
- **10 tabs**: At current count the tab bar wraps on 1280px screens. Not a typography issue but affects admin density perception. Consider addressing after typography is settled.
