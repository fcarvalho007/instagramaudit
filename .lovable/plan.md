
# Refactoring: 6-Card Summary Grid

## Current Architecture

### Row 1 — "PONTUAÇÃO GLOBAL" (3 score cards)

Rendered by `ScoreGrid` → `ScoreCard` in `report-overview-block.tsx` (line 65).

| File | Role |
|---|---|
| `src/components/report-redesign/v2/overview/score-grid.tsx` | Grid wrapper, "PONTUAÇÃO GLOBAL" label, legend |
| `src/components/report-redesign/v2/overview/score-card.tsx` | Individual card with ScoreRing |
| `src/components/report-redesign/v2/overview/score-ring.tsx` | SVG ring gauge |
| `src/components/report-redesign/v2/overview/score-utils.ts` | Score functions, definitions (3 keys: envolvimento, frequencia, interaccao) |

Cards rendered: **Taxa de Engagement**, **Frequência de Posts**, **Interação nos Posts**.
No "Mensagem" card exists — it was already removed in a previous edit. Only 3 cards.

**Clickability**: Cards are plain `<div>` elements. No onClick, href, button role, cursor-pointer, or keyboard handlers. Already non-clickable.

**Visual effects to remove**: `score-card.tsx` uses `shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_-4px_rgba(15,23,42,0.06)]` — a subtle shadow, acceptable for Iconosquare style. No glow, blur, ring shadow, hover elevation, or animated arrows exist. The `score-grid.tsx` legend and divider line should be evaluated for removal in the merged layout.

### Row 2 — Diagnostic Summary (3 cards)

Rendered by `OverviewDiagnosticSummary` in `report-overview-block.tsx` (line 68).

| File | Role |
|---|---|
| `src/components/report-redesign/v2/overview/diagnostic-summary.tsx` | 3-card grid: Tipo de conteúdo, Papel do conteúdo, Objetivo deste perfil |

**Note**: There is also `src/components/report-redesign/v2/report-diagnostic-summary-cards.tsx` which renders 4 cards (adds "Resposta do público") for Block 02. This file is NOT part of the overview block and must NOT be touched.

**Clickability**: Cards are `<article>` elements. No onClick, href, or interactive affordances. Already non-clickable.

**Visual effects**: `shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_-4px_rgba(15,23,42,0.06)]` — same subtle shadow. Pastel icon circles with `ring-1`. No glow.

### Data Sources (confirmed)

| Card | Source |
|---|---|
| Taxa de Engagement | `k.engagementRate` vs `k.engagementBenchmark` → `computeEnvolvimento()` |
| Frequência de Posts | `k.postingFrequencyWeekly` → `computeFrequencia()` |
| Interação nos Posts | `avgComments` from `enriched.topPosts` → `computeInteraccao()` |
| Tipo de conteúdo | `classifyContentType(posts)` from `block02-diagnostic` |
| Papel do conteúdo | `classifyFunnelStage(posts)` from `block02-diagnostic` |
| Objetivo deste perfil | `inferProbableObjective(...)` from `block02-diagnostic` |

All data comes from the cached snapshot payload — no external calls needed.

### "Mensagem" card

Does not exist in the current implementation. Nothing to remove.

## Proposed Changes

Merge the two separate grids into a single unified 6-card grid with consistent card design.

### Files to EDIT (3 files)

1. **`src/components/report-redesign/v2/report-overview-block.tsx`**
   - Remove separate `ScoreGrid` and `OverviewDiagnosticSummary` renders
   - Replace with a single unified component
   - Keep all data computation (scores, classifier calls) in this file

2. **`src/components/report-redesign/v2/overview/score-grid.tsx`**
   - Refactor into a unified 6-card grid component
   - Remove the "PONTUAÇÃO GLOBAL" eyebrow label (the Block title/subtitle remain untouched)
   - Remove the color legend
   - Remove the bottom divider
   - Accept both score cards and diagnostic cards as children or props
   - Grid layout: `grid-cols-2 sm:grid-cols-3` (2 per row mobile, 3 per row desktop)

3. **`src/components/report-redesign/v2/overview/score-card.tsx`**
   - Unify card design: same visual treatment for score cards (row 1) and diagnostic cards (row 2)
   - Keep ScoreRing for row 1 cards, pastel icon circle for row 2 cards
   - Ensure no clickable affordances

### Files to POTENTIALLY SIMPLIFY

4. **`src/components/report-redesign/v2/overview/diagnostic-summary.tsx`**
   - May be inlined into the unified grid, or kept as a data-building helper
   - The component's rendering would be absorbed into the unified grid

### Files that MUST NOT be touched

- `src/styles/tokens.css`, `src/styles/tokens-light.css` (locked)
- `src/styles.css` (locked)
- `src/components/report-redesign/v2/report-diagnostic-summary-cards.tsx` (Block 02 — separate)
- `src/components/report-redesign/v2/report-diagnostic-block.tsx` (Block 02)
- `src/lib/report/block02-diagnostic.ts` (classifier logic)
- `src/lib/report/snapshot-to-report-data.ts` (adapter)
- All locked files in LOCKED_FILES.md
- Backend, database, auth, PDF, admin, loading screen
- Block 02 title/subtitle

### Risk

**Low**. Pure visual refactor of 3-4 component files. No data model, backend, or classifier changes. Score computation functions in `score-utils.ts` remain unchanged. Block 02's own diagnostic cards are a separate component and unaffected.
