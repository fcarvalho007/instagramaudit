
# Public MVP Report Copy Cleanup — Audit and Plan

## Assessment: CONDITIONAL PASS

The public_mvp report is mostly clean. The variant system already suppresses detailed comment intelligence. However, there are **4 visible issues** that need fixing before beta users see the report.

---

## Findings

### PASS — No issues found

| String searched | Result |
|---|---|
| `"payload"` | Only in code-level prop names (`SnapshotPayload`), never rendered as visible text |
| `"debug"` | Not found in any rendered string |
| `"missing"` | Used as internal status value (`"missing"`), renders as "Ausente" — clean |
| `"enrichment"` | Not found in any rendered string |
| `"comment_intelligence"` | Only in code-level variable names, never rendered |
| Q05 post-level fallback | Already works — `classifyAudienceResponse()` uses likes/comments data |
| `CommentIntelligenceUnavailable` default copy | Already updated: "Análise detalhada de comentários não incluída neste relatório beta..." |

### FAIL — Issues to fix

| # | File | Line(s) | Visible string | Problem | Variant affected |
|---|------|---------|----------------|---------|-----------------|
| F1 | `caption-diagnostics-card.tsx` | 482 | "Evidência detalhada em desenvolvimento." | Technical/internal — suggests unfinished feature | public_mvp |
| F2 | `caption-diagnostics-card.tsx` | 697 | "Evidência detalhada em desenvolvimento." | Same string, second occurrence | public_mvp |
| F3 | `visual-cover-analysis-card.tsx` | 211 | "Análise visual indisponível — aguarda processamento IA." | Exposes internal pipeline state | public_mvp |
| F4 | `visual-cover-analysis-card.tsx` | 353 | "Score visual indisponível" + "Será calculado automaticamente quando a análise por visão computacional estiver ativa." | Technical description of unreleased capability | public_mvp |

### BORDERLINE — Review but likely acceptable

| # | File | String | Assessment |
|---|------|--------|-----------|
| B1 | `report-comment-intelligence.tsx:249` | "A aguardar análise de comentários" | Only shown when `reason === "processing"` — unlikely in public_mvp since scraper is disabled, but could appear in edge cases with stale data |
| B2 | `report-comment-intelligence.tsx:253-258` | Various technical reasons (budget_blocked, failed, timeout) | Only shown when cached data contains those specific reason codes — rare in public_mvp |

---

## Recommended copy replacements (pt-PT)

### F1 + F2 — Caption evidence fallback

**Current:** "Evidência detalhada em desenvolvimento."

**Proposed:** In `public_mvp`, hide the collapsible evidence section entirely (it has no content to show). In `internal_lab`, keep the current string.

**Alternative (if hiding is too invasive):** Replace with "Consulta a versão Pro para ver a evidência por publicação."

### F3 — Visual analysis diagnostic fallback

**Current:** "Análise visual indisponível — aguarda processamento IA." + "Os thumbnails acima serão analisados por visão computacional numa próxima atualização."

**Proposed for public_mvp:** "Análise visual disponível na versão Pro." + "As capas dos posts são avaliadas por inteligência artificial para consistência visual, presença de texto e diversidade de formatos."

### F4 — Visual score panel fallback

**Current:** "Score visual indisponível" + "Será calculado automaticamente quando a análise por visão computacional estiver ativa."

**Proposed for public_mvp:** "Score visual · Pro" + "Disponível na versão completa do relatório."

### B1 + B2 — Comment intelligence edge cases

**Proposed:** Gate `CommentIntelligenceUnavailable` to skip rendering entirely in `public_mvp` when the reason is a technical one (processing, budget_blocked, failed, timeout). The current default fallback ("Análise detalhada de comentários não incluída") is already correct for the normal case.

---

## Files to touch

| File | Change type |
|------|------------|
| `src/components/report-redesign/v2/caption-diagnostics-card.tsx` | Replace "em desenvolvimento" fallback with variant-aware copy or hide in public_mvp |
| `src/components/report-redesign/v2/visual-cover-analysis-card.tsx` | Replace both unavailable states with Pro teaser copy in public_mvp |
| `src/components/report-redesign/v2/report-comment-intelligence.tsx` | Gate technical reason codes in public_mvp (optional, low risk) |

## Files NOT to touch

- `report-diagnostic-block.tsx` — variant suppression already works correctly
- `report-diagnostic-card.tsx` — "missing"/"Ausente" is clean user copy
- `report-shell-v2.tsx` — no changes needed
- `report-variant.ts` — locked, no changes needed
- Any provider, admin, cost, or PDF files

---

## Ordered implementation prompts

**Prompt 1 — Caption evidence fallback (F1 + F2)**
In `caption-diagnostics-card.tsx`, import `useVariantFeatures` and hide the "Evidência detalhada em desenvolvimento" fallback paragraph in `public_mvp`. In `internal_lab`, keep the current text. Two occurrences: lines ~482 and ~697.

**Prompt 2 — Visual cover analysis fallbacks (F3 + F4)**
In `visual-cover-analysis-card.tsx`, import `useVariantFeatures`. For the diagnostic unavailable state (line ~211) and `ScorePanelUnavailable` (line ~348), show Pro teaser copy in `public_mvp` and keep technical copy in `internal_lab`.

**Prompt 3 (optional) — Comment intelligence edge case reasons (B1 + B2)**
In `report-comment-intelligence.tsx`, gate technical reason labels (processing, budget_blocked, failed, timeout) so they render the generic default in `public_mvp` instead of exposing pipeline state. Low priority — these are unlikely to appear with the scraper disabled.

Each prompt should end with `tsc --noEmit` and `vitest run` validation.
