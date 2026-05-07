
# Admin Typography and Density System — Audit and Plan

## Typography Audit Summary

### Current State

The admin already has a well-defined typography scale in `admin-tokens.css` with utility classes (`.admin-section-title`, `.admin-card-title`, `.admin-body`, `.admin-table-cell`, `.admin-meta`, `.admin-eyebrow`), plus the hard rule: **nothing interactive/informational below 12px; 11px only for decorative eyebrows and badge pills.**

**Problem:** the rule is widely violated. **39 files** contain **~170 occurrences** of `text-[10px]` or `text-[11px]` used on operational/interactive text (table cells, button labels, status badges inline, metadata rows, action buttons, code blocks, pipeline counters, etc.).

### Violation Breakdown by Severity

**Heavy violators (6+ sub-12px occurrences):**

| File | Count | What's wrong |
|---|---|---|
| `visao-geral/expense-section.tsx` | 29 | Table cells, row labels, all at 10-11px |
| `sistema/visual-cover-debug-card.tsx` | 12 | Debug grid all at 10-11px |
| `module-visibility-matrix.tsx` | 12 | Toggle buttons, column headers at 10px |
| `sistema/test-profiles-card.tsx` | 9 | Table rows at 11px |
| `clientes/customers-table-section.tsx` | 9 | Table cells at 11px |
| `report-drawer.tsx` | 8 | Detail rows at 11px |
| `sistema/costs-detail-section.tsx` | 7 | Cost table at 10-11px |
| `sistema/analysis-cost-breakdown.tsx` | 6 | Breakdown table at 10px |

**Medium violators (3-5):** 12 files (pipeline, charts, reconciliation, notes, profiles, etc.)

**Light violators (1-2):** 19 files (scattered eyebrow misuse or single labels)

Additionally, **inline `fontSize` at 10-11px** exists in 8 files (waterfall, funnel, revenue, charts sections).

### Also Noted

- The legacy cockpit (`src/components/admin/cockpit/`) uses `text-xs` / `text-sm` Tailwind utilities rather than the admin token classes — inconsistent with v2 but lower priority since it's being wrapped/replaced.
- `AdminBadge` at 11px is correct per the design rule.
- `.admin-eyebrow` at 11px is correct per the design rule.

---

## Recommended Typography Scale (confirmed, already in tokens)

The existing scale is correct and complete. No new sizes needed.

| Role | Size | Weight | Class |
|---|---|---|---|
| Page title | 36px | 600 | Inline in `AdminPageHeader` |
| Section title | 14px | 500 uppercase | `.admin-section-title` |
| Card title | 15px | 500 | `.admin-card-title` |
| Body / card content | 13px | 400 | `.admin-body` |
| Table cell | 13px | 400 | `.admin-table-cell` |
| Metadata | 12px | 400 | `.admin-meta` |
| Eyebrow (decorative only) | 11px | 400 uppercase mono | `.admin-eyebrow` |
| Badge pill (decorative only) | 11px | 400 | `AdminBadge` component |

**New utility class to add:**

| Class | Size | Purpose |
|---|---|---|
| `.admin-code` | 12px | Inline code/mono snippets (replaces `font-mono text-[10px]` / `text-[11px]` patterns) |
| `.admin-table-header` | 12px | Table `th` — uppercase, medium weight, tertiary color |

---

## Components/Classes to Create or Update

### In `admin-tokens.css` — add 2 classes:

```css
.admin-v2 .admin-code {
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
}

.admin-v2 .admin-table-header {
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--admin-neutral-600));
  line-height: 1;
}
```

### No new React components needed
The existing `AdminBadge`, `AdminActionButton`, `AdminCard`, `AdminStat`, `AdminSectionHeader`, `AdminPageHeader` are sufficient.

---

## Files to Touch

**39 files** in `src/components/admin/v2/` (listed above in audit).

## Files NOT to Touch

- `src/styles/tokens.css`, `tokens-light.css` (public report)
- `src/components/report/` (public report rendering)
- `src/components/admin/v2/admin-badge.tsx` (11px is correct for badge)
- All provider/cost/PDF pipeline logic
- `LOCKED_FILES.md` files
- `src/integrations/supabase/client.ts`, `types.ts`

---

## Implementation Phases

### Phase 1 — Token additions (1 file)
Add `.admin-code` and `.admin-table-header` to `admin-tokens.css`. Update `mem://design/admin-typography.md`.

### Phase 2 — Heavy violators (8 files, ~90 occurrences)
Fix the 8 files with 6+ violations: `expense-section`, `visual-cover-debug-card`, `module-visibility-matrix`, `test-profiles-card`, `customers-table-section`, `report-drawer`, `costs-detail-section`, `analysis-cost-breakdown`.

### Phase 3 — Medium violators (12 files, ~48 occurrences)
Fix files with 3-5 violations across pipeline, charts, reconciliation, notes, profiles sections.

### Phase 4 — Light violators + inline fontSize (19 files + 8 files, ~32 occurrences)
Fix remaining scattered 1-2 violation files and convert inline `fontSize: 10/11` to token classes.

### Phase 5 — Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
- Visual review of each admin tab

---

## Transformation Rules (for implementation)

| Current pattern | Replace with |
|---|---|
| `text-[10px]` on table cells / data | `admin-table-cell` class or `text-[12px]` min |
| `text-[10px]` on buttons / actions | `text-[12px]` minimum |
| `text-[10px]` on `<code>` / mono | `admin-code` class |
| `text-[11px]` on table headers | `admin-table-header` class |
| `text-[11px]` on metadata / timestamps | `admin-meta` class |
| `text-[11px]` on interactive labels | `text-[12px]` or `admin-meta` |
| `font-mono text-[10px]` | `admin-code` |
| `fontSize: 10` / `fontSize: 11` inline | Remove, use token class |

All phases can be done in a single implementation prompt if approved.
