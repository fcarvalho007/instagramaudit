## Refactor `/report/example` to a unified Iconosquare-pure light dashboard with AI insight boxes

Decisions confirmed by user:
1. Unlock `/src/components/report/*` and `/src/routes/report.example.tsx` for this prompt (`LOCKED_FILES.md` will be updated).
2. Add semantic tokens to `tokens-light.css` and consume them — no hardcoded hex in components.
3. Demote Fraunces (serif italic) to the report H1 only; all section titles become Inter 22px / weight 500. Update project memory accordingly.

Out of scope (do not touch): `/src/admin/*`, `/src/components/admin/*`, dark theme, `tokens.css`, header/nav, PDF export, real AI generation (Prompt R2).

---

### 1. Tokens — `src/styles/tokens-light.css` (extend, do not replace)

Add a "Report v2" block under the existing `[data-theme="light"]` selector with semantic names. Keep all current variables intact so nothing else breaks.

New tokens (RGB triplets, consumed via `rgb(var(--name))` like the rest of the file):

```text
/* Surface + cards */
--report-bg:               250 251 253   /* #FAFBFD page background          */
--report-card-bg:          255 255 255   /* #FFFFFF unified card             */
--report-card-border:      232 237 245   /* #E8EDF5 hairline                 */

/* Text */
--report-text-primary:      15  27  61   /* #0F1B3D editorial navy           */
--report-text-secondary:    90 107 140   /* #5A6B8C                          */

/* Semantic accents */
--report-accent-blue:       37  99 217   /* #2563D9                          */
--report-signal-positive:   29 158 117   /* #1D9E75                          */
--report-signal-negative:  163  45  45   /* #A32D2D                          */
--report-signal-warning:   186 117  23   /* #BA7517                          */

/* Insight box variants — each with bg, border, icon, text */
--insight-default-bg:      239 244 251
--insight-default-border:  181 212 244
--insight-default-icon:     24  95 165
--insight-default-text:     12  68 124

--insight-positive-bg:     239 248 244
--insight-positive-border: 159 225 203
--insight-positive-icon:    15 110  86
--insight-positive-text:     8  80  65

--insight-negative-bg:     251 239 239
--insight-negative-border: 240 149 149
--insight-negative-icon:   163  45  45
--insight-negative-text:   121  31  31

--insight-neutral-bg:      241 239 232
--insight-neutral-border:  211 209 199
--insight-neutral-icon:     95  94  90
--insight-neutral-text:     68  68  65

/* Card shadow (override of --shadow-card for report only) */
--report-card-shadow: 0 1px 3px rgb(15 27 61 / 0.04),
                      0 4px 16px rgb(15 27 61 / 0.04);
```

Override `--surface-base` inside the same `[data-theme="light"]` block to `var(--report-bg)` so the existing `bg-surface-base` Tailwind utility (already used by `ReportPage`) automatically picks up the new background — no need to change every component's wrapper class.

---

### 2. Two new shared building blocks (additive files)

#### `src/components/report/ai-insight-box.tsx` (new)

Props: `{ insight: string; emphasis?: 'default' | 'positive' | 'negative' | 'neutral' }`.
Renders a rounded box with: small star icon (lucide `Sparkles`), eyebrow `LEITURA IA` (mono uppercase), then the insight body. All colors via the `--insight-{variant}-*` tokens — no hex literals.

#### `src/components/report/sparkline.tsx` (new)

Props: `{ data: number[]; width?: number; height?: number; tone?: 'accent' | 'positive' | 'negative' }`.
SVG with: linear gradient area fill (10% → 0% opacity) + 1.5px polyline. Uses `--report-accent-blue` (or signal tokens) — no hardcoded `#2563D9`. Renders nothing and returns `null` when `data` is empty so the KPI for "Estado do benchmark" can simply omit `sparklineData`.

#### `src/lib/report/ai-insights-mock.ts` (new)

Exports a typed const with the 9 hand-written Portuguese insights from the prompt, keyed by section:

```text
hero | marketSignals | temporal | benchmark | format | topPosts |
heatmap | bestDays | hashtagsKeywords
```

Shape: `{ emphasis: AIInsightEmphasis; text: string }`. Re-exports the `AIInsightEmphasis` type so future Prompt R2 can swap the import for a server-fn fetch without touching the section components.

---

### 3. Section-by-section refactor

Every component currently uses Tailwind classes plus `bg-surface-secondary`, `border-border-subtle`, `text-text-primary`, `font-display italic`, etc. The pattern below applies to all of them:

- Wrapper: `bg-[rgb(var(--report-card-bg))] border border-[rgb(var(--report-card-border))] rounded-2xl p-7 md:p-8 shadow-[var(--report-card-shadow)]` (single utility class set, defined once via a small `cardClass` helper exported from `report-section.tsx` so it's not duplicated).
- Section spacing: bump `space-y-10 md:space-y-12` in `report-page.tsx` to `space-y-14`.
- Titles: replace every `font-display italic` H2/H3/H4 with `font-sans text-[22px] font-medium tracking-[-0.01em] text-[rgb(var(--report-text-primary))]`. Subtitles become `text-[13px] text-[rgb(var(--report-text-secondary))]`.
- Eyebrows stay as mono uppercase — only swap the color token to `--report-text-secondary`.
- Remove every nested colored panel (`bg-surface-muted` / `bg-tint-*`) inside cards. KPIs render directly on the card surface; chips become outlined pills using `border-[rgb(var(--report-card-border))]`.

Per-component changes (locked files unlocked):

| File | Change |
|---|---|
| `report-page.tsx` | Bump section spacing. Pass `data` through unchanged. Add the 9 `<AIInsightBox>` calls at the bottom of each section (see #4). |
| `report-section.tsx` | Export a single `reportCard` className constant. Apply unified card style. Drop the optional creme variant. |
| `report-header.tsx` | Keep `@frederico.m.carvalho` H1 as `font-display italic` — this is the one allowed serif. Demote its inner subtitle/labels to Inter. |
| `report-key-metrics.tsx` | Re-layout the 5 hero KPIs as a 2-column grid inside each card: left = value + delta + sub, right = `<Sparkline>`. The 5th KPI ("Estado do benchmark") omits sparkline and shows a small outlined badge "Ligado". |
| `report-kpi-card.tsx` | Add optional `sparklineData?: number[]` and `highlighted?: boolean` props. Internal layout switches to flex row when sparkline is present. Highlighted variant adds a thin top accent border in `--report-accent-blue`. |
| `report-temporal-chart.tsx` | Remove italic title. Keep chart. Strip any nested panel backgrounds. |
| `report-benchmark-gauge.tsx` | **Replace** the current 3-point line with a horizontal gauge: full-width track 8px tall using `linear-gradient(90deg, --signal-negative → --signal-warning → --signal-positive)` plus 2 absolute-positioned markers (Atual at `(actual/benchmark)*100%`, capped at 100; Benchmark at 100% reference). Each marker has a mono uppercase label above and the percentage below. A dashed connector + arrow shows the gap. Status badge top-right ("Abaixo do benchmark" / "No benchmark" / "Acima do benchmark") tinted by sign of gap. |
| `report-format-breakdown.tsx` | Drop nested colored backgrounds; use outlined pills. Keep 3-card grid. |
| `report-competitors.tsx` | Same card unification. No content change. |
| `report-top-posts.tsx` | Top-5 cards: remove inner colored panels, use white inner with border. |
| `report-posting-heatmap.tsx` | Strip italic title. Keep heatmap colors but remap to a single blue ramp `0 → --report-accent-blue` to match the new palette. |
| `report-best-days.tsx` | Bars use `--report-accent-blue` solid. Title to Inter. |
| `report-hashtags-keywords.tsx` | Card unification. Tag pills outlined. |
| `report-ai-insights.tsx` | This existing section becomes a higher-level "Síntese IA" block. Style aligned to the new AIInsightBox visuals but at section width. (The 9 per-section AIInsightBox calls in #4 are separate inline annotations.) |
| `report-footer.tsx` | No structural change; align typography. |
| `report-mock-data.ts` | **Add** `heroSparklines` arrays (the 5 mock series from the prompt). No removal. |

#### 4. Insertion of `<AIInsightBox>` in `report-page.tsx`

After each of the 9 sections listed in the prompt, render `<AIInsightBox insight={AI_INSIGHTS_MOCK.<key>.text} emphasis={AI_INSIGHTS_MOCK.<key>.emphasis} />`. Keys map: hero → after `ReportKeyMetrics`; temporal → after `ReportTemporalChart`; benchmark → after `ReportBenchmarkGauge`; format → after `ReportFormatBreakdown`; topPosts → after `ReportTopPosts`; heatmap → after `ReportPostingHeatmap`; bestDays → after `ReportBestDays`; hashtagsKeywords → after `ReportHashtagsKeywords`. The `marketSignals` entry annotates the temporal/market block above; placement TBC at implementation if there is no dedicated market signals section in the example route — if absent, it goes right after the temporal chart, sharing real estate.

---

### 5. Bookkeeping

- `LOCKED_FILES.md` — remove the entire "Report Components (Sprint 1, Prompt 1.10)" block AND `tokens-light.css` from the locked list, since this prompt is the redesign that supersedes the v1 lock. Add a one-line comment noting the new lock will be reapplied after Prompt R2 ships.
- `mem://index.md` Core — replace "Fraunces display, Inter sans, JetBrains Mono mono. Cyan accent #06B6D4." with a more accurate line: "Light report theme: Inter for all titles except the H1 of the report header; Fraunces reserved for that single editorial signature. Cyan accent stays for dark surfaces (admin)."
- Add `mem://design/report-light` describing the new `--report-*` and `--insight-*` token system, so future prompts don't reintroduce hex literals.

---

### 6. Verification (matches the prompt's own checks, adapted to reality)

After the edits, `bunx tsc --noEmit` will be run automatically. Manual greps to confirm:

```text
# Background token reachable via existing utility
grep -n "report-bg\|--surface-base" src/styles/tokens-light.css

# AIInsightBox usage count >= 9
grep -rn "AIInsightBox" src/components/report/ src/routes/report.example.tsx

# Sparkline file present
test -f src/components/report/sparkline.tsx

# Mock present
test -f src/lib/report/ai-insights-mock.ts

# Italic remaining only in the header H1
grep -rEn "font-display\s+italic|font-style:\s*italic" src/components/report/
# Expected: a single occurrence in report-header.tsx

# No hardcoded hex literals introduced in components
grep -rEn "#([0-9a-fA-F]{3}){1,2}\b" src/components/report/ src/lib/report/ai-insights-mock.ts
# Expected: empty (all colors via tokens)
```

### Files added
- `src/components/report/ai-insight-box.tsx`
- `src/components/report/sparkline.tsx`
- `src/lib/report/ai-insights-mock.ts`

### Files modified
- `src/styles/tokens-light.css` (extend)
- `src/components/report/*.tsx` (all 14 components — card unification, typography, palette)
- `src/components/report/report-mock-data.ts` (add hero sparkline arrays)
- `src/routes/report.example.tsx` (no logic change; only verifies it still mounts)
- `LOCKED_FILES.md` (unlock the report block)
- `mem://index.md` + new `mem://design/report-light`

### Risks / what I'll watch for
- Light mode is shared across the report; if any other route already mounts `<ReportPage>` in the wild it will inherit the new look. I'll grep for `ReportPage` usages before editing and flag if there are surprises.
- The benchmark gauge currently has fixed numerical assumptions (actual/benchmark from mock data). I'll preserve the same data flow; only the visual changes.
- `tokens-light.css` was locked specifically because tweaks here change the entire light theme. The user explicitly approved unlocking it, so this is in scope — but I will only **add** new variables and override `--surface-base`, leaving every other token untouched so the v1 visuals can be A/B'd if needed.