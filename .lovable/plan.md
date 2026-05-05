
## Problem

The KPI card "Distancia a media" shows **202% superior** because it calculates the distance against `engagementBenchmark = 1.80%` (from the benchmark engine/DB), while the chart below shows **5.10%** as the benchmark for the same tier (from a hardcoded consolidated series in `benchmark-context.ts`). The user sees 5.43% vs 5.10% on screen but reads "202% superior" — misleading.

There are two separate benchmark data sources that disagree:
1. **Engine** (`benchmark_references` table / fallback): gives ~1.80% for this tier
2. **Consolidated series** (hardcoded in `getConsolidatedBenchmarkSeries()`): gives 5.10% for the 20K-100K tier

## Root cause

The KPI row uses `k.engagementBenchmark` (engine value: 1.80%) but the chart uses `getConsolidatedBenchmarkSeries()` (hardcoded: 5.10%). Both claim to represent the benchmark for the same tier but show very different numbers.

## Plan

### 1. Align KPI card 2 and KPI card 3 with the chart's benchmark value

In `report-overview-engagement.tsx`, instead of using `k.engagementBenchmark` for the "Outros perfis semelhantes" KPI and the "Distancia a media" percentage calculation, use `activeTier.engagementRatePct` from the consolidated series (the same source the chart uses). This ensures:
- KPI 2 shows 5.10% (matches the chart's benchmark line)
- KPI 3 shows ~6% superior (correct: (5.43 - 5.10) / 5.10 * 100)
- The p.p. line shows +0.33 p.p. acima da referencia

The diagnostic reading text (multiples) will also use the chart-aligned value.

### 2. Style "Fontes" label

In `report-engagement-benchmark-chart.tsx` (line ~315), change "Fontes:" to "FONTES" with a slightly darker grey — use `text-content-secondary` instead of `text-content-tertiary`.

### Files to edit
- `src/components/report-redesign/v2/report-overview-engagement.tsx` — swap benchmark source for KPI calculations
- `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx` — style "FONTES" label

### Validation
- `bunx tsc --noEmit` and `bunx vitest run`
- Visual check that KPI 2, KPI 3, and chart benchmark line all show consistent values
- No locked files touched
