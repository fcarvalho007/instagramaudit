
# Refine Block 01 — Engagement Rate Card & Benchmark Chart

## Files to edit

1. `src/components/report-redesign/v2/report-overview-cards.tsx` — EngagementRateCard only
2. `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx` — chart sizing, tooltips, source refs, PRO slot

No other files changed. No locked files, schema, admin, PDF, or provider changes.

---

## Changes

### 1. Headline comparison block (report-overview-cards.tsx)

Replace the current big number + subtitle in `EngagementRateCard` with a structured comparison:

```
Atual: 0,11%        Referência do escalão: 4,80%        Gap: −4,7 p.p.
```

- Three inline items using a flex row, wrapping on mobile.
- "Atual" value keeps `font-mono` large style (slightly reduced from 3.25rem to ~2.5rem to make room for the pair).
- "Referência" and "Gap" use `font-mono` at ~1.1rem, muted colors.
- Gap gets tone-colored text (emerald/rose/slate).
- Remove the current subtitle "gostos e comentários face à dimensão do perfil" — the info tooltip already explains this.

### 2. Larger chart (report-engagement-benchmark-chart.tsx)

- Increase `VB_H` from 340 to 420 (taller bars, more visual weight).
- Adjust `PAD_T` and `PAD_B` proportionally to keep label space.
- The chart already uses `w-full` so it scales responsively. No width changes needed.

### 3. Remove the gap pill from chart component

The gap pill inside the chart component duplicates the new headline comparison. Remove the `{/* Gap pill */}` section from `ReportEngagementBenchmarkChart`. The gap information now lives in the card header.

### 4. Tooltips (already partially implemented)

The chart already has hover/focus tooltips (`ChartTooltip` component) with keyboard accessibility (`tabIndex`, `onFocus`/`onBlur`). Current tooltip content matches requirements (tier label, benchmark value, profile value for active tier, gap). Minor refinements:

- Add "Referência de mercado por escalão" as a short footer line in tooltip.
- Ensure `max-w-[180px] sm:max-w-[220px]` doesn't clip at 375px — already has `clampedPct` logic; verify it's sufficient.

### 5. Source references — numeric only

In the chart's source references section, the current code already renders `[1] [2] [3]` as clickable links with no brand names visible. However, source `name` values are passed from the parent. Changes:

- Keep clickable `[1] [2] [3]` links (already implemented).
- Add a compact descriptive line below: `"[1] Envolvimento por formato · [2] referência por dimensão · [3] contexto de mercado"` as plain text (no clickable brand names).
- Remove the existing `ReportSourceLabel` context line at the bottom that repeats similar info, consolidating into one compact reference block.

### 6. PRO competitor slot — improved copy

Update the PRO slot text:
- Title: "Comparar com concorrente direto" (already correct)
- Subtitle: change from "Adiciona um perfil concorrente para ver o resultado lado a lado." to "Vê se o teu perfil está abaixo do mercado ou apenas abaixo dos teus concorrentes."

### 7. Reduce duplicated text

Remove the bottom `ReportSourceLabel` context line (`<p>` with "Instagram · contas X · referência por dimensão e formato") since the new numeric references section covers this. The card hierarchy becomes:

1. Card header (icon + title + info tooltip)
2. Comparison headline (Atual / Referência / Gap)
3. Large chart
4. Legend
5. Compact numeric references with descriptors
6. PRO slot

---

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
- Visual check at desktop and 375px
- Confirm no locked files touched
