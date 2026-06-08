# PR2 — Persist & render selected analysis window

Goal: snapshot/report carry the actual selected window (baseline / 30d / 90d) so the report can honestly say "Últimos 30 dias". No UI selector changes, no provider/payments/credits/entitlement changes.

## 1. `analysis_events` — read-only, do not extend schema

`analysis_events` has no JSON metadata column. Per the constraint, I'm **stopping at this step before editing** and proposing the smallest safe approach:

- **Recommended (this PR, zero schema change):** rely on existing signals.
  - `analysis_events.cache_key LIKE '%:w=30d'` / `'%:w=90d'` already disambiguates wide vs baseline (validated in PR1).
  - `analysis_events.analysis_snapshot_id` joins to `analysis_snapshots.normalized_payload.analysis_window` (added in this PR).
  - Admin BI can already segment by window via these two paths without a new column.
- **Deferred to PR3 (first-class admin BI):** add `analysis_events.analysis_window TEXT` + index. Out of PR2 scope; explicitly forbidden by your constraint unless you say otherwise.

If you want the column added now, say so and I'll insert a migration; otherwise PR2 ships without touching `analysis_events`.

## 2. Files changed (assuming no `analysis_events` column)

| File | Change |
|---|---|
| `src/routes/api/analyze-public-v1.ts` | At base-snapshot build, add `analysis_window: windowKind` and `analysis_window_label: PUBLIC_WINDOW_CONFIGS[windowKind].label` into `baseNormalizedPayload`. ~6-line addition, no other logic touched. |
| `src/lib/report/snapshot-to-report-data.ts` | Extend `SnapshotPayload` with `analysis_window?: PublicWindowKind \| null`, `analysis_window_label?: string \| null`. Compute `windowKindResolved` and override `windowLabel` / `windowShortLabel` / `kpiSubtitle` / `sampleCaption` / `temporalLabel` when `windowKindResolved !== "baseline"`. Add `meta.analysisWindow` + `meta.windowLabel` (already exists) + `meta.temporalLabel` (already exists). |
| `src/components/report/report-mock-data.ts` | Add optional `analysisWindow?: "baseline" \| "30d" \| "90d" \| undefined` to the `meta` type. Default undefined → baseline behaviour byte-compatible. |
| `src/lib/report/__tests__/snapshot-window.test.ts` | NEW unit test. Fixtures for `analysis_window: "baseline"` (legacy & explicit), `"30d"`, `"90d"`. Asserts `meta.windowLabel`, `meta.windowShortLabel`, `meta.kpiSubtitle`, `meta.sampleCaption`, `meta.temporalLabel` use "Últimos 30 dias" / "Últimos 90 dias" when wide. |
| `supabase/migrations/<ts>_backfill_30d_snapshot_window.sql` | One-off backfill: `UPDATE analysis_snapshots SET normalized_payload = jsonb_set(jsonb_set(normalized_payload, '{analysis_window}', '"30d"'), '{analysis_window_label}', '"Últimos 30 dias"') WHERE id = '3f8b1dcf-618f-43d6-ada3-4841d2b04620' AND cache_key = 'v1:frederico.m.carvalho\|:w=30d' AND (normalized_payload ? 'analysis_window') = false;` Guarded by id + cache_key + idempotency. No other snapshot touched. |

## 3. Exact fields added

**`analysis_snapshots.normalized_payload`** (new keys):

```text
analysis_window:        "baseline" | "30d" | "90d"
analysis_window_label:  "Últimas publicações" | "Últimos 30 dias" | "Últimos 90 dias"
```

Baseline snapshots written from now on will carry `"baseline"` explicitly. Legacy baseline snapshots (no key present) are treated as `"baseline"` by the adapter — byte-compatible.

**`ReportData.meta`** (new key):

```text
analysisWindow?: "baseline" | "30d" | "90d" | undefined
```

Existing `meta.windowLabel`, `meta.windowShortLabel`, `meta.kpiSubtitle`, `meta.sampleCaption`, `meta.temporalLabel` are unchanged in name; their **values** are overridden when `analysisWindow` is wide:

| meta field | baseline (today) | 30d (new) | 90d (new) |
|---|---|---|---|
| `windowLabel` | `últimas N publicações` / `últimos N dias` (derived) | `últimos 30 dias` | `últimos 90 dias` |
| `windowShortLabel` | `N publicações` / `N dias` | `30 dias` | `90 dias` |
| `kpiSubtitle` | `N publicações nos últimos M dias` | `N publicações nos últimos 30 dias` | `N publicações nos últimos 90 dias` |
| `sampleCaption` | `Análise baseada nas últimas N publicações recolhidas.` | `Análise baseada nas N publicações dos últimos 30 dias.` | `Análise baseada nas N publicações dos últimos 90 dias.` |
| `temporalLabel` | `Evolução temporal · …` (derived) | `Evolução temporal · últimos 30 dias` | `Evolução temporal · últimos 90 dias` |
| `analysisWindow` | `undefined` | `"30d"` | `"90d"` |

Empty-window message (Task 6) lives next to `sampleCaption`:

- If `analysisWindow` is `"30d"` and `keyMetrics.postsAnalyzed === 0` → `sampleCaption = "Sem publicações nos últimos 30 dias."`
- If `analysisWindow` is `"90d"` and `keyMetrics.postsAnalyzed === 0` → `sampleCaption = "Sem publicações nos últimos 90 dias."`
- Baseline 0-posts continues to early-return at the analyze route with `PROFILE_PRIVATE` / `PROFILE_PERSONAL_NO_FEED` (unchanged).
- Profile is NOT flagged as private/personal in 30d/90d empty-feed (analyze route already special-cases this — confirmed at `analyze-public-v1.ts:1067-1071`).

## 4. Not touched (explicit allowlist of skips)

- No changes to: `analysis-period-selector.tsx`, sidebar, premium-cta-context, premium dialogs, lead capture.
- No call to Apify / OpenAI / DataForSEO from any path added by this PR.
- No changes to: `credits.server.ts`, `lead-reports.server.ts`, `entitlements.server.ts`, `eupago`, `checkout`, `payments`, `pricing_plans`.
- No changes to: PR1 backend gate (`WINDOW_REQUIRES_PRO`, `reserveCredit`, `hasEntitlement`, cache key suffix).
- No changes to: Phase 1 / Phase 2 competitor comparison components.
- No changes to: Free / Public report rendering — adapter override only fires when `analysis_window` is `"30d"` / `"90d"`; legacy baseline snapshots and any free report keep current copy byte-for-byte.
- No new column on `analysis_events` (see §1).

## 5. Validation checklist

1. **Baseline byte-compat** — existing baseline snapshot for `frederico.m.carvalho` (`683e4c21-…`) renders identical `meta.windowLabel` / `meta.sampleCaption` as before. Snapshot test on adapter output for a fixture with no `analysis_window` key.
2. **30d snapshot** — `3f8b1dcf-…` (after backfill) renders `meta.windowLabel === "últimos 30 dias"`, `meta.sampleCaption === "Análise baseada nas 12 publicações dos últimos 30 dias."`, `meta.analysisWindow === "30d"`.
3. **Snapshot payload** — `SELECT normalized_payload->>'analysis_window' FROM analysis_snapshots WHERE id='3f8b1dcf-…'` returns `'30d'`.
4. **Zero provider calls** — pure adapter + DB backfill; verified by code review (no Apify/OpenAI/DataForSEO import added).
5. **Zero `credit_ledger` rows** — no credit code paths touched.
6. **Typecheck** — `meta.analysisWindow` typed optional; `SnapshotPayload.analysis_window` typed optional; build passes.
7. **Unit test** — `src/lib/report/__tests__/snapshot-window.test.ts` covers baseline-legacy, baseline-explicit, 30d, 90d, 30d-empty-feed, 90d-empty-feed.

## 6. Open question

**Add `analysis_events.analysis_window TEXT` now (one migration, indexed) or defer to PR3?** Default of this plan is defer. Reply "add column" if you want it in PR2 — I'll extend the plan with the migration + a one-line write at `recordAnalysisEvent` and update tests.
