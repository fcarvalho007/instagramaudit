
# Design System Audit — Typography, Fonts & Consistency

## 1. Font Definitions (Confirmed)

**Loading** — `src/styles.css` lines 6-16: all three fonts loaded via `@fontsource` with correct weights.

| Font | Weights | CSS variable | Tailwind class |
|------|---------|-------------|----------------|
| Fraunces | 400, 500, 600, 700 | `--font-display` | `font-display` |
| Inter | 400, 500, 600, 700 | `--font-sans` | `font-sans` |
| JetBrains Mono | 400, 500, 600 | `--font-mono` | `font-mono` |

**Token registration** — defined in both `src/styles/tokens.css` (lines 53-55) and `src/styles.css` `@theme inline` (lines 88-90). No conflict.

**Base application** — `html` element uses `var(--font-sans)` (Inter). Admin v2 wrapper `.admin-v2` also sets Inter explicitly. Correct.

---

## 2. Font Usage Map

### Fraunces (Display Serif)

| Area | Usage | Verdict |
|------|-------|---------|
| Landing page | H1, section headings, step titles | Correct |
| Report public | H1 (`report-header.tsx`), section h2/h3 via `report-tokens.ts` | Correct |
| Report redesign v2 | All card/section headings (14 files) | Correct |
| Auth card | H1 | Correct |
| Admin cockpit (legacy) | Section h2/h3 in cockpit panels (6 files) | Debatable — serif in light CRM |
| Admin v2 | NOT used | Correct for CRM context |

### Inter (Sans Body/UI)

Used everywhere as default base. Admin v2 utility classes (`.admin-body`, `.admin-meta`, `.admin-card-title`, `.admin-section-title`, `.admin-table-cell`, `.admin-table-header`) all use Inter correctly.

**Report redesign**: `text-eyebrow` and `text-eyebrow-sm` classes correctly use Inter for labels.

### JetBrains Mono (Monospace)

| Context | Pattern | Verdict |
|---------|---------|---------|
| `.admin-eyebrow` — section labels, eyebrows | JBM 11px uppercase | **VIOLATION** — memory rule: "Eyebrows = Inter uppercase, nunca font-mono" |
| `.admin-code` — numeric KPIs | JBM 12px | Correct — raw numbers |
| `admin.report-preview.*.tsx` — 10+ section labels | `font-mono text-[12px] uppercase` | **VIOLATION** — labels, not numbers |
| `admin.sistema.tsx` — status text | `font-mono text-[12px]` | **VIOLATION** — text label |
| `report-drawer.tsx` — report handle heading | `font-mono text-[18px]` | **VIOLATION** — title, not raw number |
| `report-drawer.tsx` — provider costs, numeric values | `font-mono` | Correct — numbers |
| `expense-section.tsx` — large stat values | `font-mono text-[2rem]`/`text-[2.5rem]` | Correct — raw numbers |
| `top-profiles-section.tsx` — metric values | `font-mono` | Correct — numbers |
| `metrics-section.tsx` — stat values | `font-mono` | Correct — numbers |
| `error-investigation-modal.tsx` — error ID | `font-mono` | Correct |
| Report public — numeric values, chart labels | `font-mono` | Correct — all numbers |
| Report public — `text-[10px]` in `report-block-nav`, `report-diagnostic-grid-v2` | `font-mono text-[10px]` | Acceptable — decorative micro-labels |
| Report public — `text-[11px]` in 8 components | `font-mono text-[11px]` | Acceptable — numeric data badges |

---

## 3. Typography Inconsistencies — By Severity

### Critical (violates project 2-font rule)

1. **`.admin-eyebrow`** (`admin-tokens.css:186-193`) — JetBrains Mono instead of Inter. Used by 15+ admin v2 components.
2. **Report preview routes** (`admin.report-preview.snapshot.$snapshotId.tsx`, `admin.report-preview.$username.tsx`) — ~15 instances of `font-mono text-[12px] uppercase tracking-*` for section labels/eyebrows.
3. **`admin.sistema.tsx:132`** — `font-mono text-[12px]` on status label.
4. **`report-drawer.tsx:146`** — `font-mono text-[18px]` on report handle heading (this is a title, not a number).

### Medium (missing token definitions / fallthrough)

5. **`admin-eyebrow-sm`** class used in `lead-detail-sheet.tsx` (lines 392, 398, 404) but **NOT defined in `admin-tokens.css`** — falls through to global `.text-eyebrow-sm` (10px Inter). Works but fragile.
6. **Admin cockpit legacy** (6+ panel files) uses `font-display` (Fraunces) for headings. If the admin is fully migrating to the light Inter-based v2 style, these will clash when cockpit is eventually absorbed.

### Low (sub-12px text audit)

7. **`text-[9px]`** found in 3 admin files (11 instances):
   - `analysis-cost-breakdown.tsx` (2) — cost warnings
   - `execution-mode-card.tsx` (2) — decorative labels
   - `expense-section.tsx` (3) — micro badges
   - `module-visibility-matrix.tsx` (3) — status chips

   These are decorative/micro-labels — acceptable per rules but worth reviewing for readability.

8. **`text-[11px]`** in non-admin areas:
   - `pro-tracking-teaser.tsx`, `report-card.tsx`, `analysis-skeleton.tsx` — borderline; consider 12px.

---

## 4. Hardcoded Colors vs Tokens

**Admin report-preview routes** contain hardcoded colors (e.g., `style={{ color: "#888780" }}` in `admin.sistema.tsx:132`). These should use admin token classes.

---

## 5. Recommended Token Consolidation

### Admin Typography (update `admin-tokens.css`)

```text
Current                              Proposed change
─────────────────────────────────    ──────────────────────────────────
.admin-eyebrow: JBM 11px            → Inter 11px (match global .text-eyebrow)
(missing) .admin-eyebrow-sm         → Add: Inter 10px (match global .text-eyebrow-sm)
.admin-code: JBM 12px               → Keep (numbers only)
```

### Standardize Admin Scale

```text
Token class         Size   Font     Weight  Use for
────────────────    ────   ──────   ──────  ────────────────────
admin-panel-title   20px   Inter    500     Sheet/drawer titles
admin-section-title 15px   Inter    500     Section headings (uppercase)
admin-card-title    15px   Inter    500     Card headings
admin-body          13px   Inter    400     Body text
admin-table-cell    13px   Inter    400     Table data
admin-table-header  12px   Inter    500     Table column headers (uppercase)
admin-meta          12px   Inter    400     Secondary/timestamp text
admin-code          12px   JBM      400     Raw numbers/IDs only
admin-eyebrow       11px   Inter    500     Section labels (uppercase)
admin-eyebrow-sm    10px   Inter    500     KPI micro-labels (uppercase)
admin-badge         12px   Inter    500     AdminBadge component
```

### Report Typography (no changes needed)

Report area correctly uses `font-display` (Fraunces) for headings, `font-mono` for numeric values, and `text-eyebrow`/`text-eyebrow-sm` (Inter) for labels. The `report-tokens.ts` system is consistent.

---

## 6. Files to Touch (by implementation pass)

### Pass 1 — Fix 2-font rule violations (highest priority)
| File | Change |
|------|--------|
| `src/styles/admin-tokens.css` | Change `.admin-eyebrow` to Inter; add `.admin-eyebrow-sm` |
| `src/routes/admin.report-preview.snapshot.$snapshotId.tsx` | Replace `font-mono` eyebrow patterns with `text-eyebrow` or `admin-eyebrow` |
| `src/routes/admin.report-preview.$username.tsx` | Same |
| `src/routes/admin.sistema.tsx` | Replace `font-mono` + hardcoded color on status label |
| `src/components/admin/v2/report-drawer.tsx` | Fix handle heading (line 146): replace `font-mono` with `admin-panel-title` |

### Pass 2 — Consolidate sub-12px text in admin
| File | Change |
|------|--------|
| `src/components/admin/v2/sistema/analysis-cost-breakdown.tsx` | Review `text-[9px]` — promote to `admin-eyebrow-sm` or `admin-meta` |
| `src/components/admin/v2/sistema/execution-mode-card.tsx` | Same |
| `src/components/admin/v2/visao-geral/expense-section.tsx` | Review 9px micro-badges |
| `src/components/admin/v2/module-visibility-matrix.tsx` | Review 9px status chips |
| `src/routes/admin.tsx` | ExecutionModeBadge `text-[11px]` — promote to `admin-eyebrow` class |

### Pass 3 — Migrate legacy cockpit typography (optional, low priority)
| File | Change |
|------|--------|
| `src/components/admin/cockpit/panels/*.tsx` (6 files) | Replace `font-display` headings with Inter if migrating to v2 style |
| `src/components/admin/cockpit/parts/stat-card.tsx` | Keep `font-mono` for numbers (correct) |
| `src/components/admin/cockpit/parts/empty-state.tsx` | Replace `font-display` with Inter |

---

## 7. Files NOT to Touch

| Category | Files |
|----------|-------|
| Foundation tokens | `src/styles/tokens.css`, `src/styles/tokens-light.css`, `src/styles.css` |
| Auto-generated | `src/integrations/supabase/*`, `src/routeTree.gen.ts` |
| Provider/pipeline | `src/lib/orchestration/*`, `src/lib/analysis/*`, `src/lib/pdf/*` |
| Server routes | `src/routes/api/*` |
| Public report | `src/components/report/*`, `src/components/report-redesign/*`, `src/components/report-tier/*` |
| Landing page | `src/components/landing/*` |
| Cost/schema | No DB migrations, no cost formula changes |

---

## 8. Implementation Prompts

### Prompt 1 — Fix admin-eyebrow font + add admin-eyebrow-sm
> In `src/styles/admin-tokens.css`, change `.admin-v2 .admin-eyebrow` font-family from JetBrains Mono to Inter (var(--font-sans)). Add `.admin-v2 .admin-eyebrow-sm` with font-family Inter, font-size 10px, font-weight 500, text-transform uppercase, letter-spacing 0.14em, line-height 1, color rgb(var(--admin-neutral-600)). This enforces the 2-font rule: Inter for all labels/eyebrows/badges, JetBrains Mono only for raw numbers. Do not touch any other file.

### Prompt 2 — Fix report-preview eyebrow patterns
> In `src/routes/admin.report-preview.snapshot.$snapshotId.tsx` and `src/routes/admin.report-preview.$username.tsx`, replace all `font-mono text-[12px] uppercase tracking-*` patterns used as section labels (e.g. "VISÃO GERAL", "SECÇÃO X") with the `text-eyebrow` utility class. Keep `font-mono` only where the content is a raw number, hash, or ID. Do not change the report content or data logic.

### Prompt 3 — Fix report-drawer handle heading + sistema label
> In `src/components/admin/v2/report-drawer.tsx` line 146, replace `font-mono text-[18px]` on the report handle heading with `admin-panel-title`. In `src/routes/admin.sistema.tsx` line 132, replace `font-mono text-[12px]` and the hardcoded `style={{ color: "#888780" }}` with `admin-meta text-admin-text-secondary`.

### Prompt 4 — Consolidate 9px micro-text in admin v2
> Review all `text-[9px]` instances in `analysis-cost-breakdown.tsx`, `execution-mode-card.tsx`, `expense-section.tsx`, and `module-visibility-matrix.tsx`. Promote informational text to `admin-eyebrow-sm` (10px) or `admin-meta` (12px). Keep `text-[9px]` only for purely decorative elements where space is extremely tight. Also promote the `text-[11px]` ExecutionModeBadge in `admin.tsx` to use the `admin-eyebrow` class.

### Prompt 5 (optional) — Legacy cockpit serif migration
> In `src/components/admin/cockpit/panels/*.tsx` and `cockpit/parts/empty-state.tsx`, replace `font-display` (Fraunces) headings with `font-sans font-medium` (Inter) to align with the admin v2 visual system. Keep `font-display` only in `stat-card.tsx` for large numbers if desired, or convert to `font-mono` for consistency. This pass is optional and depends on whether the legacy cockpit will be kept or deprecated.
