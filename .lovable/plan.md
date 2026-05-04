
# Block 1 Overview — Editorial Identity Card Refactor

## Audit Answers

### 1. Files that render the 6-card overview block
- `src/components/report-redesign/v2/report-overview-block.tsx` — orchestrator (Zona B, lines 86-98)
- `src/components/report-redesign/v2/overview/score-grid.tsx` — the 2×3 grid wrapper

### 2. Circular score card components
- `src/components/report-redesign/v2/overview/score-card.tsx` — card with ring
- `src/components/report-redesign/v2/overview/score-ring.tsx` — SVG animated ring
- `src/components/report-redesign/v2/overview/score-utils.ts` — score calculations + definitions

### 3. Lower editorial KPI cards
- `src/components/report-redesign/v2/overview/diagnostic-summary.tsx` — `DiagnosticCard` + `buildDiagnosticCards`
- Data: `classifyContentType`, `classifyFunnelStage`, `inferProbableObjective` from `src/lib/report/block02-diagnostic.ts`

### 4. Score calculations
All in `score-utils.ts`:
- `computeEnvolvimento(engagementRate, tierBenchmark)` → 0-100
- `computeFrequencia(postsPerWeek)` → 0-100
- `computeInteraccao(avgComments, postCount, tierCommentRate, brandResponseRate)` → 0-100

### 5. Global score
No. There is no pre-computed global/overall score. It would need to be derived (e.g. weighted average of the 3 scores).

### 6. AI/editorial summary sentence
No single-line summary exists. `aiInsightsV2` has per-section text blocks but no profile-level one-liner. The diagnostic cards produce labels like "Atrai mais do que converte" and "Crescimento de audiência" which are the closest editorial summaries available.

### 7. Labels and subtitles
- Score labels: `SCORE_DEFINITIONS` in `score-utils.ts` (static strings)
- Score subtitles: `envolvimentoSubtitle()`, `frequenciaSubtitle()`, `interaccaoSubtitle()` (computed)
- Diagnostic labels/headlines: `buildDiagnosticCards()` in `diagnostic-summary.tsx` (humanization lookups from classification results)

### 8. Data fields powering each element

| Element | Source |
|---------|--------|
| Engagement score | `keyMetrics.engagementRate`, `keyMetrics.engagementBenchmark` |
| Frequency score | `keyMetrics.postingFrequencyWeekly` |
| Interaction score | `avgComments` (derived from `enriched.topPosts`), `keyMetrics.postsAnalyzed` |
| Content type | `classifyContentType(payload.posts)` |
| Funnel/role | `classifyFunnelStage(payload.posts)` |
| Objective | `inferProbableObjective(...)` combining content type, funnel, integration, bio, audience |

### 9. Safe to edit
All of these are unlocked:
- `report-overview-block.tsx` (orchestrator)
- `overview/score-grid.tsx`
- `overview/score-card.tsx`
- `overview/score-ring.tsx`
- `overview/score-utils.ts`
- `overview/diagnostic-summary.tsx`

### 10. Locked — must not touch
- All files in `LOCKED_FILES.md` and `.lovable/memory/constraints/locked-files.md`
- `src/lib/report/block02-diagnostic.ts` (data logic — out of scope per constraints)
- `src/lib/report/snapshot-to-report-data.ts` (adapter — out of scope)
- Block 2 (`report-diagnostic-block.tsx`, `report-diagnostic-card.tsx`)

---

## Implementation Plan

### What to build

Replace the 6-card `SummaryGrid` in `report-overview-block.tsx` (Zona B) with a single **Editorial Identity Card** that contains:

1. **Global Score Ring** — weighted average of the 3 scores, displayed as a single large ring
2. **Score strip** — the 3 individual scores shown as compact inline indicators (small rings or bars) with labels
3. **Editorial headline** — derived from the diagnostic classifications (content type + funnel + objective), e.g. "Perfil educativo · Topo do funil · Crescimento de audiência"
4. **Subtitle/context** — the engagement rate vs benchmark one-liner

### Files to change

| File | Change |
|------|--------|
| `report-overview-block.tsx` | Replace `SummaryGrid` + 6 children with new `EditorialIdentityCard` |
| New: `overview/editorial-identity-card.tsx` | Single cohesive card component |
| `overview/score-utils.ts` | Add `computeGlobalScore()` (weighted average, pure function) |
| `overview/score-grid.tsx` | No change needed (can be left for future use or removed from imports) |
| `overview/score-card.tsx` | No change (kept for potential reuse) |
| `overview/diagnostic-summary.tsx` | No change to builders; card component may become unused in this view |

### Data flow (no backend changes)

```text
keyMetrics ──► computeEnvolvimento() ──┐
keyMetrics ──► computeFrequencia()  ──┤──► computeGlobalScore() ──► ring
topPosts   ──► computeInteraccao()  ──┘
posts/bio  ──► classifyContentType()  ──┐
posts      ──► classifyFunnelStage()  ──┤──► editorial headline
all        ──► inferProbableObjective()─┘
```

### Risk level
**Low.** All changes are presentational. Score calculations stay in `score-utils.ts`. Diagnostic classification stays in `block02-diagnostic.ts`. No backend, no data, no PDF touched.

### Steps

1. Add `computeGlobalScore(envolvimento, frequencia, interaccao)` to `score-utils.ts`
2. Create `overview/editorial-identity-card.tsx` with the unified layout
3. Update `report-overview-block.tsx` Zona B to render the new card instead of `SummaryGrid` + 6 children
4. Verify `tsc --noEmit` and `vitest run`
5. Visual QA at desktop and 375px
