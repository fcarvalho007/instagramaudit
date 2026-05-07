
# Admin & CRM Visual Audit — Typography, Readability, Consistency

## 1. Typography Issues Found

### 1.1 Sub-12px Violations (Hard Rule Breach)

**AdminBadge** (`admin-badge.tsx` line 22): `text-[11px]` — this is the global badge component used across all admin areas. It is technically an eyebrow-class element, but at 11px with `font-normal` weight it often feels too small for status information that users need to scan quickly (e.g. "completed", "Marca", "pending").

**Report Lab** (`admin.report-lab.tsx`): 11 instances of `text-[10px]` and `text-[11px]` — override badges, readiness checklist items, variant diff table badges. These are functional status indicators, not decorative eyebrows.

**Report Preview** (2 route files): ~18 instances of `text-[10px]` and `text-[11px]` in admin toolbar overlays.

**Visao Geral** (`admin.visao-geral.tsx`): `text-[11px]` on the demo-mode badge and the "Carregar dados reais" button — both interactive elements.

**Sistema** (`admin.sistema.tsx`): `text-[10px]` on a mono span and `text-[11px]` on an info box.

### 1.2 `text-xs` Usage (Borderline)

7 files use `text-xs` (= 12px in Tailwind v4). These are technically compliant but often feel tight when paired with mono weights or uppercase tracking. The worst offender is `report-lab.tsx` with 7 occurrences, mostly on labels and timestamp metadata.

### 1.3 Missing Typography Token Usage

- **Lead Detail Sheet** (`lead-detail-sheet.tsx` lines 348, 352): raw `font-mono` instead of `.admin-code` class — inconsistent size/weight.
- **Kanban Board** (`kanban-board.tsx` line 86): hardcoded hex `#D3D1C7` for empty state border instead of admin token.
- **Report Lab** action buttons (lines 488-494): local `AdminActionButton` component with `text-xs` that duplicates and diverges from the shared `admin-action-button.tsx`.

---

## 2. Density Issues

### 2.1 Lead Card (`lead-card.tsx`)

- **Good**: padding increased to 16px, card title at 15px, meta at 12px.
- **Issue**: 7 distinct content zones (header, badges, purpose, stats, notes, status selector) in a narrow 290px card creates visual clutter. The `gap-1.5` on badge row and `mb-3` repetition produces a slightly mechanical stacking rhythm.
- **Recommendation**: Group badges + purpose into one zone with `mb-4`. Use `gap-2` for badge row. Remove notes preview from card (it's already in the detail sheet). This would cut the card height by ~20px and reduce information density.

### 2.2 Lead Detail Sheet (`lead-detail-sheet.tsx`)

- **Good**: Clear 6-section structure, section titles using `.admin-section-title`.
- **Issue**: `DetailRow` component uses `py-1.5` (6px vertical) — too tight for a "premium cinematic CRM." The label-value pairs feel like a debug inspector, not a client portfolio.
- **Recommendation**: Increase `DetailRow` to `py-2.5` (10px). Consider a stacked label-value layout instead of inline justify-between for key fields.

### 2.3 Kanban Column Headers

- **Good**: 290px width, 13px label, left accent bar.
- **Issue**: `py-1.5` on header is too tight. The count badge sits inline and gets lost.
- **Recommendation**: `py-2.5` + count badge on new line or visually stronger.

### 2.4 Notes Sheet

- **Issue**: The notes editing sheet (`kanban-board.tsx` lines 111-136) is minimal — just a title, textarea, and button. No metadata context about the lead. The `admin-card-title` class on the sheet title works but feels generic.
- **Recommendation**: Add lead name + handle + status badge above the textarea. Use a slightly larger heading.

---

## 3. Visual Hierarchy Problems

### 3.1 Admin Navigation (`admin-tabs-nav.tsx`)

- **Good**: Glassmorphism styling, 13px labels.
- **Issue**: 10 tabs at 13px with `px-4 py-2` are too uniform — no hierarchy between primary sections (Visão geral, Beta Leads) and secondary ones (Sistema, Conhecimento). All tabs look identical.
- **Recommendation**: Consider grouping or adding subtle section dividers. Or differentiate primary tabs with slightly bolder weight.

### 3.2 Section Headers (`admin-section-header.tsx`)

- **Good**: Accent bar + uppercase title.
- **Issue**: `admin-section-title` is only 14px uppercase — it reads as a label, not a section header. Inside the lead detail sheet, `SectionTitle` reuses this class, which means every section header across kanban, detail, and report-lab looks the same despite different hierarchy levels.
- **Recommendation**: Consider 15-16px for major section headers, keeping 14px for sub-sections.

### 3.3 Page Header vs Section Header Contrast

The page title is 36px and the next heading level drops to 14px — a 2.57x ratio. That gap is too steep. There is no intermediate heading (e.g. 20-24px) for card titles or panel headings.

---

## 4. Components to Improve First (Priority Order)

| Priority | Component | Impact | Effort |
|----------|-----------|--------|--------|
| 1 | `AdminBadge` | Global — every card, sheet, table | Small |
| 2 | `lead-detail-sheet.tsx` — DetailRow density | CRM feel | Small |
| 3 | Report Lab sub-12px violations | 11+ instances | Medium |
| 4 | Lead card notes preview removal | Card clarity | Small |
| 5 | Notes sheet enrichment | CRM context | Small |
| 6 | Report Preview admin toolbar | 18 violations | Medium |
| 7 | `admin-section-title` scale | Global hierarchy | Small |

---

## 5. Recommended Admin Typography Scale (Revised)

```text
Page title (h1) ......... 36px  Inter 500  -0.02em  (unchanged)
Panel heading ........... 20px  Inter 500  -0.01em  (NEW — for sheets, modals)
Section title (h2) ...... 15px  Inter 500  uppercase 0.05em  (was 14px)
Card title .............. 15px  Inter 500  -0.01em  (unchanged)
Body text ............... 13px  Inter 400  (unchanged)
Table cell .............. 13px  Inter 400  (unchanged)
Metadata ................ 12px  Inter 400  (unchanged)
Badge ................... 12px  Inter 500  (was 11px normal)
Code / mono ............. 12px  JBM  400   (unchanged)
Eyebrow ................. 11px  JBM  400   uppercase (unchanged, decorative only)
```

Key changes:
- **Badge**: 11px → 12px, weight 400 → 500 (better legibility at small size)
- **Section title**: 14px → 15px (less gap from card title, more weight as header)
- **Panel heading** (new): 20px for sheet/modal titles (fills the 36→14 gap)

---

## 6. Implementation Prompts (Copy-Paste Ready)

### Prompt 1 — Badge and Section Title Scale
```
Upgrade AdminBadge from text-[11px] font-normal to text-[12px] font-medium.
Upgrade .admin-section-title from 14px to 15px.
Add .admin-panel-title class at 20px 500 weight to admin-tokens.css.
Apply admin-panel-title to LeadDetailSheet main heading (h2).
Do not touch public report. bunx tsc --noEmit. bunx vitest run.
```

### Prompt 2 — Lead Detail Sheet Density
```
In lead-detail-sheet.tsx:
- Increase DetailRow vertical padding from py-1.5 to py-2.5.
- Replace raw font-mono on report_views and cost with admin-code class.
- Add lead name + handle context to the notes editing sheet in kanban-board.tsx.
Do not touch public report. bunx tsc --noEmit. bunx vitest run.
```

### Prompt 3 — Report Lab Sub-12px Cleanup
```
In admin.report-lab.tsx:
- Replace all text-[10px] with text-[12px].
- Replace all text-[11px] with text-[12px].
- Replace the local AdminActionButton with the shared one from admin-action-button.tsx.
Do not touch public report. bunx tsc --noEmit. bunx vitest run.
```

### Prompt 4 — Report Preview Toolbar Cleanup
```
In admin.report-preview.$username.tsx and admin.report-preview.snapshot.$snapshotId.tsx:
- Replace all text-[10px] with text-[12px].
- Replace all text-[11px] with text-[12px].
Do not touch public report. bunx tsc --noEmit. bunx vitest run.
```

### Prompt 5 — Lead Card Simplification
```
In lead-card.tsx:
- Remove the notes preview line (it's already visible in the detail sheet).
- Increase badge row gap from gap-1.5 to gap-2.
- Group badges + purpose with mb-4 instead of mb-3.
Do not touch public report. bunx tsc --noEmit. bunx vitest run.
```

---

## Files That Would Be Touched

| File | Prompts |
|------|---------|
| `src/styles/admin-tokens.css` | 1 |
| `src/components/admin/v2/admin-badge.tsx` | 1 |
| `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` | 1, 2 |
| `src/components/admin/v2/beta-leads/kanban-board.tsx` | 2, 5 |
| `src/components/admin/v2/beta-leads/lead-card.tsx` | 5 |
| `src/routes/admin.report-lab.tsx` | 3 |
| `src/routes/admin.report-preview.$username.tsx` | 4 |
| `src/routes/admin.report-preview.snapshot.$snapshotId.tsx` | 4 |
| `src/routes/admin.sistema.tsx` | 3 (bonus) |
| `src/routes/admin.visao-geral.tsx` | 3 (bonus) |
