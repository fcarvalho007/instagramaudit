## Goal

Add a **Comparison Hero** at the very top of the Pro Overview block so that, whenever the report has a `firstCompetitor`, it opens as a side-by-side "Profile A vs Profile B" duel — primary in blue, competitor in indigo/purple — before any single-profile cards render.

Read-only and presentation-only. No providers, credits, schema, entitlements, Free/Public flows or PDF pipeline touched.

## Where it mounts

`src/components/report-redesign/v2/report-overview-block.tsx`, inside the `mode === "all"` branch, **as the first child of the returned `<div>`**, gated by `firstCompetitor`.

When the hero renders, suppress the existing single-profile `EditorialIdentityCard` + `MethodologyLine` block that currently opens the report in compare mode — they re-introduce the "single-profile + appended compare cards" feeling the user wants gone. The downstream sibling cards (`CompetitorOverviewCompare scope="identity"`, `CompetitorBioCompare`, engagement/cadence/format compares) all remain — they are the per-metric deep-dives the hero summarises.

In `mode === "free"` and `mode === "free_with_engagement"` (Free/Public + lead-capture): unchanged. Hero never renders there.

In `mode === "locked"`: unchanged.

## New component

`src/components/report-redesign/v2/overview/comparison-hero.tsx`

Editorial duel layout:

```text
┌──────────────────────────────────────────────────────────────┐
│  COMPARAÇÃO PRO · janela: últimos 30 dias                    │
│                                                              │
│  ┌─────────┐                              ┌─────────┐        │
│  │ avatar  │  @primary           VS       │ avatar  │        │
│  │  blue   │  Nome próprio                │ indigo  │        │
│  │  ring   │                              │  ring   │        │
│  └─────────┘                              └─────────┘        │
│                                                              │
│  Seguidores              1,1 M    ·    523 k                 │
│  Envolvimento médio       2,84%   ·    1,92%                 │
│  Publicações / semana      4,2    ·     6,1                  │
│  Formato dominante       Reels    ·   Carousels              │
│  Score editorial            82    ·      71                  │
└──────────────────────────────────────────────────────────────┘
```

Style commitments:
- Fraunces title ("Perfil vs Concorrente"), Inter for handles, labels, numbers (tabular-nums).
- White card surface, generous padding (`p-8 md:p-12`), `rounded-2xl`, soft border (`border-border-default`), subtle shadow — heavier than a standard card.
- Avatars: 72–88 px circular, with a 2 px coloured ring (primary = `--accent-primary` blue `#3772E5`, competitor = `--accent-secondary` indigo `#7664E4`). Reuse the avatar pattern from `report-hero-v2.tsx` (img + fallback initials + verified check overlay).
- "VS" treatment: Fraunces, large (`text-4xl md:text-5xl`), `text-content-tertiary`, centred between the two identity blocks; subtle horizontal divider line behind it on `md:` and up.
- Metric rows: 5 rows, each a 3-column grid `[label | primary value | competitor value]`. Winner side highlighted with the side's accent colour (only when the metric has a clear "higher is better" + meaningful delta — followers, ER, posts/week, score). Format row shows both names, no winner.
- Responsive: on mobile, identity blocks stack with "VS" between them; metric rows become two-column with the label as an eyebrow above the value pair.
- Window/baseline hint chip ("Concorrente em janela baseline") when `competitor.windowAligned === false` — same copy already used by `CompetitorOverviewCompare`.

## Metrics shown (5)

| # | Label                | Primary source                                | Competitor source                              | Higher-is-better |
|---|----------------------|-----------------------------------------------|------------------------------------------------|------------------|
| 1 | Seguidores           | `result.data.profile.followers`               | `firstCompetitor.followers`                    | yes              |
| 2 | Envolvimento médio   | `keyMetrics.engagementRate` (%)               | `firstCompetitor.averageEngagementRate`        | yes              |
| 3 | Publicações por semana | `keyMetrics.postingFrequencyWeekly`         | `firstCompetitor.estimatedPostsPerWeek`        | yes              |
| 4 | Formato dominante    | `keyMetrics.dominantFormat`                   | `firstCompetitor.dominantFormat`               | n/a (label only) |
| 5 | Score editorial      | `computeEnvolvimento(...)` (already in block) | hidden if competitor score not computable      | yes              |

Score row: render only when both sides have a finite score; the score for the competitor is computed inline from `(averageEngagementRate, engagementBenchmark)` reusing `computeEnvolvimento` from `overview/score-utils.ts`. If only the primary has it, drop the row entirely (no asymmetric display).

Each row uses the same row guard as `CompetitorOverviewCompare` (skip when either side is `<= 0` for numeric KPIs) to avoid misleading "0 vs X" rows.

## Data plumbing

1. **Competitor avatar** — confirmed present in snapshot (`competitors[].profile.avatar_url`). Today `ReportCompetitorBreakdownEntry` doesn't expose it. Add `avatarUrl: string | null` to the type in `src/components/report/report-mock-data.ts` and map it in `src/lib/report/snapshot-to-report-data.ts` (one line in the `competitorBreakdown.map`). Mock entries get `avatarUrl: null`. Backwards-compatible.
2. **Primary avatar** — already available as `result.enriched.profile.avatarUrl`.
3. **Primary display name / verified** — `result.data.profile.fullName`, `result.data.profile.verified`.
4. **Competitor display name / verified** — already on `ReportCompetitorBreakdownEntry`.

No new server fields, no migration, no provider call.

## Files changed

| File | Change |
|---|---|
| `src/components/report-redesign/v2/overview/comparison-hero.tsx` | NEW. Pure presentational component. |
| `src/components/report-redesign/v2/report-overview-block.tsx` | Mount `<ComparisonHero …/>` at the top of the `mode === "all"` branch; gate the existing `EditorialIdentityCard` + first `MethodologyLine` block behind `!firstCompetitor` so the single-profile opener only renders in solo mode. All other compare cards untouched. |
| `src/lib/report/snapshot-to-report-data.ts` | Add `avatarUrl: typeof p.avatar_url === "string" ? p.avatar_url : null` inside the `competitorBreakdown.map`. |
| `src/components/report/report-mock-data.ts` | Add `avatarUrl: string \| null` to `ReportCompetitorBreakdownEntry`; set `avatarUrl: null` on the mock entries to keep `/report/example` valid. |

## Validation

1. `bun run typecheck` clean.
2. Visit `/admin/report-preview/nunomarkl?variant=pro_preview` — hero renders as the first block, identity card no longer appears above it, 5 metric rows show, indigo + blue rings on avatars, "VS" centred.
3. Visit `/admin/report-preview/frederico.m.carvalho` (no competitor) — hero does NOT render; original Editorial Identity Card opens the report unchanged.
4. `/report/example` — unaffected (mock has competitors, but `result` shape comes from the adapter; preview route renders `ReportPage` mock, not the v2 shell, so hero doesn't apply there. Verify nothing breaks visually.)
5. 375 px viewport — no horizontal overflow; identity blocks stack with "VS" between them.
6. Network tab — zero new requests during render.
7. PDF print route (`/report/print/:snapshotId`) — confirm hero either renders cleanly or is hidden via `print:hidden` if it overlaps page-break logic. Default: render; tighten only if visual QA shows breakage.

## What is NOT touched

- Providers (Apify / OpenAI / DataForSEO).
- `credits.server.ts`, `entitlements.server.ts`, `eupago-webhook.ts`, checkout, pricing, payments.
- Snapshot schema, migrations, `analysis_events`, RLS.
- Free / Public report flow, lead-capture flow, lock gate.
- `analyze-public-v1.ts`, `analysis-period-selector.tsx`, PR1 window gate, PR2 window labels.
- `EditorialIdentityCard`, `CompetitorOverviewCompare`, engagement/cadence/format/bio/weekday compares (all kept as-is; hero is additive + replaces only the solo opener in compare mode).
