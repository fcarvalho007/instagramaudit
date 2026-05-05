
# Block 2 Refactor — Audit & Implementation Plan

## Current Block 2 Architecture

**Orchestrator:** `src/components/report-redesign/v2/report-diagnostic-block.tsx`
Called from `report-shell-v2.tsx` line 156.

**Render order (lines 138-219):**

```text
<div space-y-10>
  1. ReportDiagnosticVerdict    ← "Veredicto editorial" callout (blue box with Bot icon)
  2. ReportDiagnosticSummaryCards ← 4 KPI cards (Tipo de conteúdo, Papel do conteúdo, Resposta do público, Objetivo)
  3. Group A: "Identidade editorial" (P01 + P02)
  4. Group B: "Como comunica" (P03 hashtags + caption intelligence)
  5. Group C: "Resposta do público" (P05 audience)
  6. Group D: "Contexto estratégico" (P06 integration + P07 objective)
  7. ReportDiagnosticPriorities
  8. ReportDiagnosticCta
</div>
```

## Files Involved

| File | Role | Action |
|------|------|--------|
| `report-diagnostic-block.tsx` | Orchestrator | **Edit** — remove verdict + summary card calls, keep everything else |
| `report-diagnostic-verdict.tsx` | Verdict callout | **No edit** — just stop importing/rendering it |
| `report-diagnostic-summary-cards.tsx` | 4 KPI cards | **No edit** — just stop importing/rendering it |
| `report-diagnostic-group.tsx` | Group header (A/B/C/D) | **No edit** — keep as-is |
| `report-diagnostic-card.tsx` | Card component for P01-P07 | **No edit** — used by P01/P02 already |

**None of these files are in LOCKED_FILES.md.**

## What Gets Removed (UI only)

1. **`ReportDiagnosticVerdict`** — the blue "Veredicto editorial" callout box at the top of Block 2. This is purely visual. The `buildVerdictText()` helper and its import of `classifyContentType` etc. can stay (it's cheap and harmless), but the rendered `<ReportDiagnosticVerdict>` element is removed.

2. **`ReportDiagnosticSummaryCards`** — the 4 compact KPI cards (Tipo de conteúdo, Papel do conteúdo, Resposta do público, Objetivo deste perfil). Also purely visual. The data they depend on (`contentType`, `funnel`, `audience`, `objective`) is still needed by the P01-P07 cards below.

**No data logic, classifier calls, or scoring is affected.** All classifiers (`classifyContentType`, `classifyFunnelStage`, etc.) are still needed for the group cards.

## What Gets Kept

- Group A: "Identidade editorial" with P01 (Tipo de conteúdo) and P02 (Funil)
- Groups B, C, D unchanged
- Priorities section unchanged
- CTA unchanged

## P01 and P02 Current Structure

Both cards use `ReportDiagnosticCard` — a shared component. They differ only in props:

- **P01** (`renderContentTypeCard`): number="01", label="Tipo de conteúdo · Classificação", tone="emerald" or "slate", span="full", uses `DiagnosticDistributionBar`
- **P02** (`renderFunnelCard`): number="02", label="Funil · Mapeamento", tone="blue" or "amber", uses `DiagnosticFunnelStack`

Both currently render inside `ReportDiagnosticGroup` letter="A", which places them in a `grid grid-cols-1 md:grid-cols-2` layout — **they already sit side-by-side on desktop.**

## Proposed Implementation (3 steps)

### Step 1: Remove verdict + summary cards from orchestrator

In `report-diagnostic-block.tsx`:
- Remove the `<ReportDiagnosticVerdict>` render call (line 140)
- Remove the `<ReportDiagnosticSummaryCards>` render call (lines 142-147)
- Keep all imports and classifier calls (still needed by P01-P07)
- Optionally remove unused imports for `ReportDiagnosticVerdict` and `ReportDiagnosticSummaryCards` for cleanliness

### Step 2: Refine P01 and P02 visual consistency

Both cards already use `ReportDiagnosticCard`. Adjustments:
- P01 currently uses `span="full"` — change to `span="half"` so it takes exactly one column (matching P02)
- Ensure both use comparable tone accents: P01 = blue family, P02 = green family (currently emerald/blue — may swap to match mockup)
- Both should show the same card size, question typography, answer block styling — already handled by the shared component

### Step 3: Verify side-by-side layout

`ReportDiagnosticGroup` already renders children in `grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6`. With both cards as `span="half"`, they will sit side-by-side on desktop and stack on mobile. No grid changes needed.

## Risks

- **P01 currently uses `span="full"`**, which makes it span 2 columns. Changing to "half" will make its internal horizontal layout (question left, distribution bar right) stack vertically instead. The `ReportDiagnosticCard` already handles this via the `isFull` conditional — half-width cards use vertical stack layout. This is safe but the distribution bar will appear below the answer instead of beside it.
- **No data dependency risk.** The verdict text and summary cards are display-only wrappers over the same classifier outputs used by the group cards.

## Files That Must Not Be Touched

- All files in LOCKED_FILES.md
- Block 1 components
- Backend/auth/admin
- Global tokens (tokens.css, tokens-light.css)
- PDF generation
- Report pipeline / adapters

## Confirmation

No code was changed in this audit. All findings are from read-only inspection.
