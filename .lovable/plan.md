
## Refactor Block 1 Engagement Benchmark Card

### Files involved

| File | Role | Action |
|------|------|--------|
| `src/components/report-redesign/v2/report-overview-engagement.tsx` | Card wrapper, header, hero numbers | **Rewrite** — new 3-column hero layout + horizontal chart |
| `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx` | SVG vertical bar chart (540 lines) | **Replace** — horizontal bar chart with tier rows |
| `src/lib/knowledge/benchmark-context.ts` | Data source (tiers, benchmark values) | **Read-only** — no changes needed |
| `src/lib/report/snapshot-to-report-data.ts` | Adapter producing `keyMetrics` | **Read-only** — no changes needed |

### Files that must NOT be touched

- Backend / API routes / Supabase / admin
- PDF generation logic
- Report hero (`report-hero-v2.tsx`), profile header, Block 2+
- Global tokens (`tokens.css`, `tokens-light.css`)
- All files in `LOCKED_FILES.md`

---

### Available data (all fields exist)

| Field | Source | Value example |
|-------|--------|---------------|
| `k.engagementRate` | `result.data.keyMetrics` | `5.43` |
| `k.engagementBenchmark` | `result.data.keyMetrics` | `1.80` |
| `result.data.profile.followers` | adapter | `9500` |
| `benchmarkSeries[i].tierLabel` | `getConsolidatedBenchmarkSeries()` | `"20K–100K"` |
| `benchmarkSeries[i].engagementRatePct` | same | `5.10` |
| `benchmarkSeries[i].minFollowers / maxFollowers` | same | `20000 / 100000` |
| `activeTierIndex` | `getActiveTierIndex(followers, series)` | `2` |
| `sourceReferences` | `INSTAGRAM_BENCHMARK_CONTEXT.sources` | `[{name, url}]` |

**Missing data: none.** All values needed for the mockup layout are already available.

### Gap calculations

Already computed in the current code. Safe formulas:

```
gapPp = profileEngagementRate - tierBenchmark
gapPct = tierBenchmark > 0 ? ((profileEngagementRate / tierBenchmark) - 1) * 100 : 0
```

### Edge cases

| Case | Handling |
|------|----------|
| benchmark = 0 | gapPct = 0, show "—" instead of percentage |
| engagement = 0 | Show "0,00%", gap negative |
| series missing (length 0) | Return null (already handled) |
| activeTier missing | `getActiveTierIndex` always returns valid index (clamped) |
| profile below benchmark | Gap negative, red tint, "abaixo da média" label |
| profile above benchmark | Gap positive, green tint, "acima da média" label |

### Design tokens available

All needed tokens exist in `tokens-light.css`:

- Surfaces: `surface-secondary` (white card), `surface-muted`, `tint-primary`
- Borders: `border-default`, `border-subtle`
- Text: `content-primary`, `content-secondary`
- Accent: `accent-primary` (blue)
- Signals: `signal-success`, `signal-danger`, `tint-success`, `tint-danger`

### Local decorative colours

The current SVG chart hardcodes gradients (`#3B82F6`, `#2563EB`, `#E8EDF4`, `#D4DBE8`, `#A32D2D`). The new horizontal chart will use semantic tokens exclusively. Only the active-tier bar gradient (blue) and the profile overlay segment (green-to-blue) may need inline gradient definitions inside the SVG/CSS, which is acceptable for chart-specific decoration.

### Dynamic axis scaling

Already implemented in the current chart (`rawMax * 1.2`, `niceStep`, `scaleMax`). The horizontal chart will use the same approach: axis from 0% to `ceil(max(allValues) * 1.2)` rounded to a nice step.

---

### Implementation plan

#### 1. New card structure (`report-overview-engagement.tsx`)

Replace the current compact header + hero numbers with a 3-zone layout:

```text
┌─────────────────────────────────────────────────────────┐
│ [icon] Taxa de envolvimento          ◆ MERCADO  SOURCE  │  ← header
│         posição face ao mercado por escalão              │
├───────────────┬─────────────────┬────────────────────────┤
│ O TEU PERFIL  │ REFERÊNCIA DO   │ GAP FACE À REFERÊNCIA  │  ← hero row
│   5,43 %      │ ESCALÃO         │   ~+3,63 p.p.          │
│ envolvimento  │ 1,80 %          │  +201% acima da média   │
│ médio         │ tier 20K–100K   │                         │
├───────────────┴─────────────────┴────────────────────────┤
│ COMPARAÇÃO ENTRE ESCALÕES          eixo: 0% → 8%        │  ← chart
│ 01  1K–5K   nano    ████████████████████████████  6,08%  │
│ 02  5K–20K  micro   ██████████████████            4,80%  │
│ 03  20K–100K mid    ██████████████████████ 5,43%  5,43%  │  ← active
│ 04  100K–1M macro   █████████████                 3,78%  │
│ 05  +1M     mega    ████████████                  2,66%  │
├──────────────────────────────────────────────────────────┤
│ ● O teu escalão  ● Outros escalões  | Benchmark do tier │  ← legend
│ Fontes: [1] Socialinsider · [2] Buffer · [3] Hootsuite  │
└──────────────────────────────────────────────────────────┘
```

#### 2. Hero row (3 columns)

- **Column 1** — "O teu perfil": `engagementRate` in large display type, light blue tint background card
- **Column 2** — "Referência do escalão": `engagementBenchmark` + tier label
- **Column 3** — "Gap face à referência": `gapPp` in p.p. + `gapPct` with "acima/abaixo da média", green or red tint

#### 3. Horizontal bar chart (replaces 540-line SVG)

- Pure HTML/CSS with Tailwind (no SVG needed for horizontal bars)
- Each tier row: index number, tier label, sub-label (nano/micro/mid/macro/mega), horizontal bar, value
- Active tier: highlighted with blue bar + green overlay segment showing profile value, bordered card, "O TEU ESCALÃO" badge
- Inactive tiers: grey bars
- Benchmark reference line: vertical dashed line at benchmark value with label
- Axis label top-right: "eixo: 0% → {max}%"
- Bar widths calculated as percentage of dynamic max

#### 4. Legend + sources

- Horizontal legend with dot indicators
- Source references with numbered links (already implemented, can reuse)

### Risk level

**Low.** All data exists. The change is purely visual — two component files, no backend or data model changes. The current chart is self-contained with no external consumers beyond `report-overview-engagement.tsx`.

### Estimated scope

- `report-overview-engagement.tsx`: ~120 lines (rewrite)
- `report-engagement-benchmark-chart.tsx`: ~200 lines (rewrite, down from 540 — simpler horizontal bars)
- Total: ~320 lines replacing ~625 lines
