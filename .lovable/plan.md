# Plan — Engagement compare card with scale benchmark

## Audit

- `CompetitorEngagementCompare` (`src/components/report-redesign/v2/competitor-engagement-compare.tsx`) today renders only `CompareStatBlock` (ER primary vs competitor) + a one-line verdict. Benchmark is not passed in.
- The scale/tier benchmark is already computed upstream as `result.data.keyMetrics.engagementBenchmark` (used by `EditorialIdentityCard`, scores, and `EngagementCardRefined`). It's a single tier-reference ER (%) for the primary's follower bucket.
- Helper `envolvimentoSubtitle(er, bench)` and `computeEnvolvimento(er, bench)` in `overview/score-utils.ts` already produce deterministic "+X% vs benchmark" copy and ratios. Will reuse the same ratio thresholds.
- The full `report-engagement-benchmark-chart.tsx` is heavy (tier rows, sources, premium slot). Per the task, embed a **compact benchmark rail**, not the full chart.
- Mount point: `report-overview-block.tsx` line 373. Single competitor only (Phase 1). No multi-competitor change.

## What changes

### 1. Pass benchmark into the card
- `report-overview-block.tsx` (mount): pass `engagementBenchmark: k.engagementBenchmark` and `followersScaleLabel: result.data.meta?.followersTierLabel ?? null` (fallback null) to `CompetitorEngagementCompare`.
  - If `meta.followersTierLabel` doesn't exist, derive a label from `result.data.profile.followers` via a local helper (Nano/Micro/Mid/Macro/Mega — same buckets the benchmark chart already uses). Cheap, deterministic.

### 2. Extend `CompetitorEngagementCompare` props
- New optional `benchmark?: number` (tier ER %) and `scaleLabel?: string | null`.
- If `benchmark` ≤ 0 or missing → render the **current minimal layout** (graceful fallback, no rail, no scale verdicts). No overclaiming.

### 3. Compact benchmark rail (new, inline in same file)
Single horizontal track, mobile-first.

```
0%                  benchmark              strong (2×)
├──────●──────────────┼─────────────────●──────────────┤
        @primary                    @competitor
```

- Range: `0` → `max(benchmark × 2, primaryER, competitorER) × 1.05` (a bit of headroom so markers never clip).
- Reference tick at `benchmark` with label *"Referência {scaleLabel}"* (e.g. *"Referência Micro"*). When no scaleLabel: just *"Referência"*.
- Soft band from `benchmark` to `benchmark × 2` styled as the "strong" zone using `bg-signal-success/8`.
- Two markers as small dots/pins: primary in `--accent-primary`, competitor in `--compare-competitor`. Each marker has a thin vertical tick + tiny label below with `@handle` (truncated, `text-[11px]` only if needed — keep `text-xs` floor).
- Track height `h-2 rounded-full bg-surface-muted` with internal absolute-positioned band + markers. No SVG needed.
- Accessible: `role="img" aria-label="Posição no escalão: @primary X,XX%, @concorrente Y,YY%, referência Z,ZZ%"`.

### 4. Per-side benchmark verdict chips
Below each side's value in the existing `CompareStatBlock` is not flexible enough → render the rail + a 2-column grid below the stat block:

```
@primary                          @competitor
3,40 % envolvimento               5,10 %
↗ +28 % vs referência Micro       ↗ +96 % vs referência Micro
Acima da referência               Acima da referência
```

Deterministic classification per side (`er / benchmark`):
- `< 0.7` → *"Abaixo da referência do escalão"* (signal-warning tone)
- `≥ 0.7 && < 0.95` → *"Ligeiramente abaixo da referência"* (content-secondary)
- `≥ 0.95 && ≤ 1.15` → *"Em linha com a referência"* (content-secondary)
- `> 1.15 && ≤ 2` → *"Acima da referência do escalão"* (signal-success tone)
- `> 2` → *"Muito acima da referência do escalão"* (signal-success tone)

Numeric delta `(er - bench)/bench` shown as `±XX %` (Inter, tabular-nums, `text-xs text-content-tertiary`), using arrows `↗` / `↘` / `→`.

### 5. Footer verdict (combined)
Replace the one-line `footer={verdict}` with a 2-clause deterministic sentence:

```
{strongerSide} lidera o envolvimento médio ({delta}× ou +X pp).
{readingClause} para o escalão.
```

`readingClause` derives from the stronger side's benchmark ratio bucket above. Examples:
- *"Este perfil lidera o envolvimento médio (+0,4 pp). Acima da referência do escalão Micro."*
- *"O concorrente gera 1,8× mais envolvimento médio. Muito acima da referência do escalão."*
- Tie (ratio 0.95–1.05): *"Os dois perfis estão em linha no envolvimento. Em linha com a referência do escalão Micro."*

When benchmark is missing: footer keeps current copy only ("Os dois perfis estão em linha…" / "Este perfil está acima…" / "O concorrente gera Nx mais…").

### 6. Color convention preserved
- Primary marker / label / chip → `text-accent-primary` (blue `#3772E5`).
- Competitor marker / label / chip → `text-compare-competitor` (existing indigo token used across all compare cards).
- Reference tick / band → neutral (`border-content-tertiary` + `bg-signal-success/8`).

### 7. Mobile (≤375px)
- Rail keeps full width minus padding; marker labels stack as `text-xs truncate max-w-[7rem]`.
- Per-side block grid stays 2-col (compact) — both columns each ~50%; numeric value `text-2xl` instead of `text-3xl` on `sm:` only.
- No horizontal scrolling.

## Files touched

1. `src/components/report-redesign/v2/competitor-engagement-compare.tsx` — extend props (`benchmark`, `scaleLabel`), add `BenchmarkRail` and `SideBenchmarkLine` sub-components in same file, deterministic verdict helpers, graceful fallback when benchmark missing.
2. `src/components/report-redesign/v2/report-overview-block.tsx` — pass `engagementBenchmark` and a derived `scaleLabel` to the card at line 373. Add tiny `tierLabelFromFollowers(followers)` helper inside the same file (or co-locate in `overview/score-utils.ts` if it cleanly belongs there).

No other files change. `EngagementCardRefined` (single-profile) is untouched. Free/Public unaffected (this card only mounts in `all`/`locked` with a competitor).

## Constraints respected

- No AI, no provider calls, no schema/backend changes.
- Reuses existing `engagementBenchmark` (already in `keyMetrics`).
- Graceful fallback when benchmark is missing → no rail, no scale verdicts, no overclaiming.
- Tokens only (`accent-primary`, `compare-competitor`, `signal-success`, `content-*`, `surface-muted`, `border-default`).
- Inter SemiBold tabular-nums for numbers; Fraunces stays on titles only.
- Min font size `text-xs` (12px) respected.

## Validation

- `/admin/report-preview/nunomarkl?variant=pro_preview&draft=false` — Engagement card shows: ER values per side, "+X% vs referência {tier}" per side, benchmark rail with both markers, combined footer naming who leads + scale reading.
- Profile with missing tier benchmark (`engagementBenchmark <= 0`) — falls back to current minimal layout (no rail, no scale copy).
- 375px — rail and side blocks fit without horizontal scroll; handles truncate cleanly.
- `/admin/report-preview/frederico.m.carvalho` (no competitor) — unchanged, still `EngagementCardRefined`.
- Colors: primary blue marker/chip, competitor indigo marker/chip; reference tick neutral.
