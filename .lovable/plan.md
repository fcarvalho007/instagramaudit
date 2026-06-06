## Goal

Refactor `FrequencyCard` so it reads as an editorial report block, not a dashboard. One chart, three breathing inline metrics, one conclusion paragraph.

## Target file (single)

- `src/components/report-redesign/v2/overview/frequency-card.tsx`

No i18n keys are added or removed (we reuse existing strings: `frequency.title`, `frequency.status.high`, `frequency.subtitle`, `frequency.weekly_rhythm.*`, `frequency.weekday_short/long`, `frequency.kpi.cadence_*`, `frequency.kpi.consistency_*`, `frequency.kpi.peak_*`, `frequency.verdict.*`). No data, score, calc, snapshot, or report-generation logic is touched.

## What gets removed

1. **30-day calendar block** (eyebrow + legend + weekday headers + week grid) — the entire `weeks.length > 0` branch and its helpers usages.
2. **`FrequencyKpiStrip` boxed component** — replaced by clean inline metrics (no borders, no card).
3. **Peak/gap chips** above bars in `WeeklyRhythm` and the surrounding card chrome (`rounded-xl border bg-surface-muted/60`).
4. **`InsightCallout` "Cadência forte…" boxed container** — replaced by an inline conclusion line with a subtle check icon.
5. Two-column `md:grid-cols-5` split (rhythm + calendar) collapses to a single full-width chart.

Dead helpers (`buildWeekGrid`, `cellStyle`, `legendBg`, `fmtLocaleDate`, `PT_MONTHS`, `EN_MONTHS`, `backFillToWindow` if unused elsewhere) will be removed from this file. `FrequencyKpiStrip` function will be removed. `InsightCallout` import dropped if unused.

## What stays

- Section header via `ReportCardSectionHeader` (title + green "Alta" qualifier + subtitle "1 post a cada 2–3 dias · 12 publicações em 30 dias"). No change to header component.
- `aggregateByWeekday`, `pickMostActive`, `pickQuietest` helpers — reused by the bar chart and the conclusion sentence.
- `WeeklyRhythm` interpretation sentence logic (the i18n strings already say "Publicação concentrada à Terça…").
- `ExternalReferenceNote` and `ExternalSourceNote` blocks at the bottom (Socialinsider attribution) — unchanged.

## New layout

```text
┌── article (rounded-2xl, border, bg-surface-secondary, px-6/8 py-7/8) ─────┐
│  Frequência de publicação   Alta                                          │
│  1 post a cada 2–3 dias · 12 publicações em 30 dias                       │
│                                                                           │
│  2,8            33%            Terça                                      │
│  posts/semana   dias c/ publ.  dia de pico                                │
│                                                                           │
│  RITMO POR DIA DA SEMANA                                                  │
│  [bars: S T Q Q S S D — Tuesday peak in primary blue, zeros = thin line]  │
│                                                                           │
│  ──────────────────────────────────────────────                           │
│  Publicação concentrada à Terça. A Quarta é o ponto mais fraco — 4 dias… │
│  ✓ Cadência forte e consistente. Publica mais que a média…                │
│                                                                           │
│  [Socialinsider note, unchanged]                                          │
└───────────────────────────────────────────────────────────────────────────┘
```

### Inline metrics row

- `<div class="mt-6 flex flex-wrap gap-x-10 gap-y-5 sm:gap-x-14">`, one `<div>` per metric.
- Number: Fraunces-friendly via `font-sans text-[2rem] md:text-[2.25rem] font-medium tabular-nums leading-none text-content-primary`.
- Label: `mt-2 text-xs text-content-tertiary`.
- Values: cadence `formatNumber(postingFrequencyWeekly, lang, {1,1})` + small `%` for consistency rendered as superscript-sized secondary, peak weekday from `pickMostActive` (`weekdayLong[top.weekday]`). Same data sources `FrequencyKpiStrip` used today.

### Single chart `WeeklyRhythmEditorial` (replaces `WeeklyRhythm`)

- Eyebrow `RITMO POR DIA DA SEMANA` via `frequency.weekly_rhythm.title`.
- 7-column grid, `min-h` ~110px so values can sit above bars.
- Value label above each bar (e.g. `2`, `4`, `0`) — `text-[11px] font-semibold text-content-secondary tabular-nums`, peak day uses `text-content-primary`.
- Bar styling:
  - Peak (Tuesday in mock): `bg-[var(--accent-blue,#3772E5)]` solid, full height (~56px).
  - Other days with posts: `bg-[#3772E5]/20` (calm light blue), height proportional, min ~12px.
  - Zero days: render as 2px tall `bg-content-tertiary/25` line (no full empty bar).
- Weekday labels below in `text-xs text-content-tertiary`, peak in `text-content-primary font-medium`.
- No peak/gap chips. No card border. Just the chart sitting on the section surface.

### Conclusion area (replaces `InsightCallout`)

- Spacing `mt-7 pt-5 border-t border-border-default/70 space-y-2`.
- First line: existing `WeeklyRhythm` `interpretation` string (with `<b>` HTML kept via `dangerouslySetInnerHTML`) — `text-[14px] text-content-secondary leading-relaxed`.
- Second line: `<p class="flex items-start gap-2 text-[14px] text-content-secondary leading-relaxed">` with a tiny `CheckCircle2` lucide icon at `size-4 mt-[2px] text-[hsl(var(--signal-success))]` (or whatever success token exists; falls back to `text-emerald-600` only if no token), then `<strong class="font-semibold text-content-primary">{verdict.strong}</strong> {verdict.rest}`.
- No tinted background, no card.

### Insufficient-cadence branch

Keep the existing guard: when `isInsufficient`, skip metrics + chart + conclusion (same as today), still render Socialinsider notes. Just no boxed pieces remain.

## Out of scope (explicit)

- No changes to `score-utils`, `computeFrequencia`, scoring thresholds.
- No changes to subtitle copy, headline copy, or any `report.json` keys.
- No changes to `ReportCardSectionHeader`, `InsightCallout` (file untouched; just unused here).
- No changes to other overview cards (`format-card`, etc.) or report shell.
- No new dependencies (lucide-react `CheckCircle2` is already used elsewhere in the codebase).

## Validation checklist

- Desktop 1440: metrics in one row, chart spans full width, Tuesday bar dominant, zero days appear as thin line, conclusion sits under a hairline divider.
- Mobile 375: metrics wrap into 2 rows or stack cleanly via `flex-wrap`, chart remains 7 columns (bars narrower), conclusion reflows.
- Insufficient-cadence profile: only header + Socialinsider note render (no orphan empty chart).
- No TypeScript errors from removed helpers/imports.
- Snapshot data unchanged; only JSX/CSS in this one file changed.
