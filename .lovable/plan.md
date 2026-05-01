
# Benchmark Gap Card — Engagement Rate (Block 01)

Replace the current Engagement Rate card (linear bar + text) with a premium "Benchmark Gap Card" featuring a vertical bar chart, provenance labels, source references, and a Pro competitor slot.

No locked files are affected.

---

## 1. Benchmark tier series helper

**File:** `src/lib/knowledge/benchmark-context.ts` (edit — add helper, not modify existing data)

Add a new type and builder function:

```ts
export interface BenchmarkTierPoint {
  tierLabel: string;        // "1K–5K"
  minFollowers: number;
  maxFollowers: number | null;
  engagementRatePct: number;
  sourceLabel: string;      // "Buffer · Socialinsider"
  sourceUrl?: string;
}
```

Add `getConsolidatedBenchmarkSeries(): BenchmarkTierPoint[]` that returns 5 consolidated tiers by averaging/weighting the existing Buffer tiers:
- 1K–5K → Buffer 1-5K (4.4%)
- 5K–20K → average of Buffer 5-10K and 10-50K
- 20K–100K → average of Buffer 10-50K and 50-100K  
- 100K–1M → average of Buffer 100-500K and 500K-1M
- +1M → extrapolated from 500K-1M with decay

Also add `getActiveTierIndex(followers: number, series: BenchmarkTierPoint[]): number` to find which tier the profile belongs to.

The user-provided example values (6.08, 4.80, etc.) are treated as illustrative — the real values come from the existing Buffer dataset with simple averaging. This keeps data provenance honest.

Add source reference URLs as typed constants (Socialinsider, Buffer, Hootsuite) — reuse the existing `INSTAGRAM_BENCHMARK_CONTEXT.sources` array rather than hardcoding new URLs.

---

## 2. Benchmark bar chart component

**New file:** `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`

Pure SVG bar chart (no new dependencies). Receives all data via props:

```ts
interface Props {
  profileEngagementRatePct: number;
  followersCount: number;
  benchmarkSeries: BenchmarkTierPoint[];
  activeTierIndex: number;
  sourceReferences: Array<{ name: string; url: string }>;
  showProSlot?: boolean;
  competitor?: { handle: string; engagementRatePct: number } | null;
  onProSlotClick?: () => void;
}
```

**Chart spec:**
- Height: ~170px
- 5 vertical bars, one per tier
- Inactive bars: `bg-slate-200` at ~40% opacity, rounded top
- Active tier bar: accent blue, full opacity, slightly wider
- Profile value: small rose/danger marker overlaid on the active bar (min 4px height for very low values)
- Dashed horizontal reference line at active tier benchmark value
- Labels: "Referência do escalão · X,X%" and "O teu perfil · X,XX%"
- X-axis: tier labels; no visible Y-axis numbers, 3 subtle grid lines
- Gap message: "Gap face à referência: −X,X p.p." / "Acima da referência: +X,X p.p." / "Em linha com a referência"

**Provenance markers** (inline, discreet):
- `⬡ Dados` near profile value
- `◈ Mercado` near benchmark reference
- Uses `text-eyebrow-sm`, ~60% opacity, no bold

**Source references footer** inside the card:
- "◈ Referências de mercado: Socialinsider [1], Buffer [2], Hootsuite [3]"
- Numeric footnote links, `target="_blank" rel="noreferrer noopener"`
- Names from the existing `INSTAGRAM_BENCHMARK_CONTEXT.sources` array

**Pro competitor slot** at the bottom:
- Lock icon + "Comparar com concorrente direto" + `PRO` badge
- Helper: "Adiciona um perfil concorrente para ver o teu resultado lado a lado."
- Calls `onProSlotClick` if provided
- If `competitor` is passed: shows `@handle · X%` with accent-gold marker (future state — not wired in this task)

---

## 3. Refactor EngagementRateCard

**File:** `src/components/report-redesign/v2/report-overview-cards.tsx`

- Replace the body of `EngagementRateCard` to use the new chart component
- Keep the `PremiumCard` wrapper, title, icon, interpretation chip, and source slot
- Remove `EngagementDistanceBar` (dead code after replacement)
- Keep `computeEngagementStatus` (used by the interpretation chip)
- Wire `getConsolidatedBenchmarkSeries()` and `getActiveTierIndex()` to pass data as props
- Keep the existing `ReportBenchmarkEvidence` component below the chart for the full provenance line
- Keep the italic methodology disclaimer

---

## 4. Responsive

- Mobile 375px: bars shrink, tier labels abbreviate ("1K–5K" → stays short enough), no horizontal overflow
- Pro slot becomes full-width row
- Chart SVG uses `viewBox` + percentage widths for fluid sizing

---

## Files changed

| File | Action |
|------|--------|
| `src/lib/knowledge/benchmark-context.ts` | Add `BenchmarkTierPoint`, `getConsolidatedBenchmarkSeries()`, `getActiveTierIndex()` |
| `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx` | **New** — SVG chart + provenance + source refs + Pro slot |
| `src/components/report-redesign/v2/report-overview-cards.tsx` | Refactor `EngagementRateCard`, remove `EngagementDistanceBar` |

No changes to: tokens.css, providers, OpenAI, Supabase schema, PDF, admin, `/report/example`, other blocks.

---

## Validation

- `bunx vitest run` passes (existing benchmark tests unaffected)
- `bunx tsc --noEmit` passes
- Mobile 375px: no horizontal overflow
