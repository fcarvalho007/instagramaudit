# Phase 1B.1D — Remove follower-growth history from Block 01

Focused cleanup: undo the follower-delta feature added in Phase 1B.1C. Keep current follower count (already available from the snapshot), remove all history-derived logic, and drop the unused server function.

## Scope

Touch only:
- `src/components/report-redesign/v2/report-overview-block.tsx`
- `src/components/report-redesign/v2/report-kpi-grid-v2.tsx`
- `src/lib/server/profile-history.functions.ts`

Do NOT touch: blocks 02–06, providers, PDF, admin, `/report/example`, schema, AI prompts, validators, locked files.

## Changes

### 1. `report-overview-block.tsx`
- Remove imports: `useEffect`, `useState`, `getProfileFollowersHistory`.
- Remove the `useFollowersDelta` hook (entire function) and its call inside `ReportOverviewBlock`.
- Render `<ReportKpiGridV2 result={result} />` without the `followersDelta` prop.
- Keep everything else: watermark "01", "Leitura IA" frame, `Bot` icon, insight rendering.

### 2. `report-kpi-grid-v2.tsx`
- Remove the `followersDelta?: number | null` prop from `Props`.
- Remove the `FollowersDeltaPill` component entirely.
- Remove the `TrendingDown`, `TrendingUp` imports (no longer used).
- In the `Seguidores` KpiCard, remove the `footer` prop (which rendered the delta pill). Keep the rest of the card identical: gated by `followers > 0`, value = `formatCompact(followers)`, help = `"perfil público"`.
- Keep `formatCompact` and `trimZero` helpers (still used elsewhere in the grid).

### 3. `profile-history.functions.ts`
- Verify `getProfileFollowersHistory` has no other consumers via `rg "getProfileFollowersHistory" src`. After step 1, the only reference will be its own export.
- Remove the entire "Followers history (Phase 1B.1C)" block: `FollowersInputSchema`, `ProfileFollowersHistoryItem` interface, and the `getProfileFollowersHistory` server function.
- Leave `getProfileEngagementHistory` and its types completely untouched.

## Validation

After edits, run sequentially:
1. `bunx tsc --noEmit`
2. `bunx vitest run`

## Acceptance check

- No `getProfileFollowersHistory` reference anywhere in `src/`.
- No `FollowersDeltaPill` reference anywhere.
- `Seguidores` card still renders (current count) when `profile.followers > 0`.
- No "história aparecerá", "desde a última análise", trending arrows, or placeholder strings related to follower growth.
- Blocks 02–06, `/report/example`, providers, PDF, schema untouched.

## Report back

Files changed · locked files touched (no) · TS result · Vitest result · confirmation no providers/PDF/admin/report.example/schema were touched · stop for manual screenshots.
