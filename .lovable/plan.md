# Apify Cost Accounting — Production vs Lab/I&D

## Problem (recap)

`/admin/apify-lab` writes to `apify_lab_runs` only. Every admin cost view and the budget gate read `provider_call_logs`. Result: Lab credits spent on the Apify dashboard are invisible to admin KPIs, and cost-per-lead is silently inflated whenever a Lab run also happens to fall in a production query window. Current 30 d snapshot:

| bucket | est USD | actual USD | rows |
|---|---:|---:|---:|
| `provider_call_logs` apify | 0.412 | 0.497 | 72 |
| `apify_lab_runs` | 0.439 | 1.090 | 36 |

Lab is already ~2× production by `actual_cost_usd` — material enough to warrant proper separation.

## Approach (recommended)

Add `source_context` to `provider_call_logs` and **mirror Lab runs into it via a DB trigger** (Option A below). One source of truth, zero changes to the 15+ admin call sites that already aggregate `provider_call_logs`, and the budget gate automatically starts counting Lab.

### Why mirror, not union (trade-off)

| Option | Pros | Cons |
|---|---|---|
| **A. Mirror lab → pcl via trigger** (chosen) | Single source of truth for cost. All 15+ admin queries get Lab "for free" once they filter on `source_context`. Budget gate works unchanged. Reconciliation simpler (one table, one sum). | Lab rows exist in two places. Mitigated by: (i) trigger is the only writer; (ii) `apify_run_id` becomes a natural idempotency key on pcl via unique partial index; (iii) `apify_lab_runs` keeps its rich debug-only columns (`guardrails`, `notes`, `purpose`, `window_kind`, …) — pcl just stores the cost row. |
| B. Union pcl + lab_runs at query time | No duplication. | Every one of the ~15 admin queries + `apify-budget.server.ts` must change. Every future query has to remember to union. High regression surface. |

## Final cost taxonomy

`source_context` (text, NOT NULL default `'unknown'`) on `provider_call_logs`:

| value | written by |
|---|---|
| `public_analysis` | `/api/analyze-public-v1` (Apify profile scraper called from `src/lib/analysis/apify-client.ts`) |
| `enrich_comments` | `src/lib/enrichment/run-enrichment.server.ts` (comment scraper) |
| `admin_lab` | DB trigger mirroring `apify_lab_runs` |
| `admin_refresh` | future: admin-triggered manual refresh of a snapshot |
| `backfill` | future: scripted backfills / historical re-imports |
| `unknown` | default safety bucket; existing rows that don't match a heuristic |

Same column on every provider (apify, openai, dataforseo). Most non-apify rows will be `public_analysis` after backfill.

## Final admin formulas (`overview-formulas.ts`)

Inputs are extended with three split buckets, all over the 30 d window:

```
production_cost_30d = SUM(coalesce(actual_cost_usd, estimated_cost_usd))
                      FROM provider_call_logs
                      WHERE status='success'
                        AND source_context IN ('public_analysis','enrich_comments')

lab_cost_30d        = SUM(...) WHERE source_context = 'admin_lab'

other_cost_30d      = SUM(...) WHERE source_context IN ('admin_refresh','backfill','unknown')

total_cost_30d      = production_cost_30d + lab_cost_30d + other_cost_30d
```

Derived KPIs:

- `cost_per_lead       = production_cost_30d / leads_30d`   ← Lab EXCLUDED
- `cost_per_analysis   = production_cost_30d / fresh_analyses_30d`   ← Lab EXCLUDED
- `cost_per_unlocked   = production_cost_30d / reports_unlocked_30d` ← Lab EXCLUDED
- `margin_per_lead     = revenue_per_lead − cost_per_lead`           ← Lab EXCLUDED
- `total_platform_cost = total_cost_30d`                              ← Lab INCLUDED

`/admin/visao-geral` and `/admin/receita` get a new line item **"I&D · Apify Lab"** showing `lab_cost_30d` separately from production.

## Budget gate (`apify-budget.server.ts`)

- **Hard cap (`APIFY_HARD_CAP_USD`)** — keep current behaviour (sum all apify rows in pcl over the UTC day). Because Lab is mirrored, it now counts automatically. ✅ matches required behaviour ("Lab should count against hard cap: yes").
- Add a sibling `getApifyProductionDailySpendUsd()` that filters on `source_context IN ('public_analysis','enrich_comments')` for any future production-only budget warning. Not wired anywhere yet — just available.

## Migration plan

One migration, idempotent:

1. `ALTER TABLE provider_call_logs ADD COLUMN source_context text NOT NULL DEFAULT 'unknown'`
2. `CREATE INDEX provider_call_logs_source_context_idx ON provider_call_logs(source_context, created_at DESC)`
3. **Backfill** existing 72 apify rows + others:
   - `UPDATE … SET source_context='enrich_comments' WHERE provider='apify' AND actor ILIKE '%comment%'`
   - `UPDATE … SET source_context='public_analysis' WHERE provider='apify' AND source_context='unknown' AND analysis_event_id IS NOT NULL`
   - `UPDATE … SET source_context='public_analysis' WHERE provider='openai'` (insights are only called from public analysis today)
   - `UPDATE … SET source_context='public_analysis' WHERE provider='dataforseo'` (market signals are only called from public analysis today)
   - Remaining rows stay `'unknown'` (the 24 apify rows with no `analysis_event_id` that aren't comments — these are historical pre-instrumentation calls).
4. **Mirror Lab → pcl trigger**:
   - `ALTER TABLE provider_call_logs ADD CONSTRAINT provider_call_logs_lab_run_unique UNIQUE (provider, apify_run_id) DEFERRABLE INITIALLY DEFERRED` — actually a `UNIQUE INDEX … WHERE source_context='admin_lab' AND apify_run_id IS NOT NULL` (partial, to avoid colliding with NULL run_ids on production rows).
   - `CREATE FUNCTION mirror_apify_lab_to_provider_call_logs()` (SECURITY DEFINER, search_path=public): on INSERT or UPDATE of `apify_lab_runs`, upsert into `provider_call_logs` with `source_context='admin_lab'`, `provider='apify'`, `actor=NEW.mode`, `handle=NEW.profile_handle`, `apify_run_id=NEW.apify_run_id`, `status=NEW.status`, `posts_returned=NEW.posts_returned`, `estimated_cost_usd=NEW.estimated_cost_usd`, `actual_cost_usd=NEW.actual_cost_usd`, `duration_ms=NEW.duration_ms`, `error_excerpt=NEW.error_excerpt`. ON CONFLICT on the unique index → UPDATE the cost fields (handles the backfill-actual-cost flow that updates `actual_cost_usd` after the fact).
   - `CREATE TRIGGER apify_lab_runs_mirror_aiu AFTER INSERT OR UPDATE OF status, estimated_cost_usd, actual_cost_usd, posts_returned, duration_ms, apify_run_id ON apify_lab_runs FOR EACH ROW EXECUTE FUNCTION mirror_apify_lab_to_provider_call_logs();`
5. **Backfill the 36 existing Lab rows** by running `UPDATE apify_lab_runs SET id = id WHERE created_at >= '2026-01-01'` once after the trigger is in place (no data change, just fires the trigger).
6. RLS / GRANT: `provider_call_logs` is already locked down via service-role-only access — no policy changes needed.

## Files to change

- **Code (TypeScript)**
  - `src/lib/analysis/events.ts` — extend `logProviderCall()` input with `sourceContext: SourceContext`, default to `'unknown'`, log warning. Add `SourceContext` type export.
  - `src/lib/analysis/apify-client.ts` (or its caller in `analyze-public-v1.ts`) — pass `sourceContext: 'public_analysis'` on every `logProviderCall` site.
  - `src/lib/enrichment/run-enrichment.server.ts` — pass `sourceContext: 'enrich_comments'`.
  - `src/lib/insights/openai-insights.server.ts` — pass `sourceContext: 'public_analysis'`.
  - `src/lib/dataforseo/client.ts` (line 253 direct insert) — set `source_context: 'public_analysis'`.
  - `src/lib/admin/overview-formulas.ts` — add `production_cost_30d`, `lab_cost_30d`, `other_cost_30d` to `KpiInput`; rewrite derived KPIs to use `production_cost_30d`; output the three new bucket fields.
  - `src/lib/admin/system-queries.server.ts` — split `fetchExpense30d()` to return `{ production, lab, other, total, fresh_avg_cost_per_report }`. Update internal call sites.
  - `src/routes/api/admin/overview-kpis.ts` — surface the three buckets in the JSON response; update `OverviewKpis` interface.
  - `src/components/admin/v2/visao-geral/cost-summary-card.tsx`, `…/expense-section.tsx`, `src/components/admin/v2/receita/reconciliation-section.tsx`, `src/components/admin/v2/sistema/costs-detail-section.tsx`, `src/components/admin/cockpit/parts/cost-breakdown-panel.tsx` — render the new "I&D · Apify Lab" row alongside Production.
  - `src/lib/admin/billing-reconciliation.server.ts` — group reconciliation output by `source_context` so the Apify dashboard total can be compared to `production + lab` separately.
  - `src/lib/security/apify-budget.server.ts` — no functional change to hard cap; add optional `getApifyProductionDailySpendUsd()`.
  - `src/lib/admin/apify-actual-cost-backfill.server.ts` — when the backfill updates `apify_lab_runs.actual_cost_usd`, the trigger now syncs `provider_call_logs` automatically. Verify no double-write.
  - `src/integrations/supabase/types.ts` — regenerated by the migration (do not edit manually).

- **Tests**
  - `src/lib/admin/overview-formulas.test.ts` — extend with: production excludes lab; total includes lab; cost-per-lead uses production only; missing `source_context` defaults to `'unknown'` and lands in `other`.
  - New `src/lib/security/apify-budget.test.ts` (if not present) — hard cap includes lab; production sub-sum excludes lab.
  - New `src/lib/admin/billing-reconciliation.test.ts` — output splits Lab vs production.
  - Mirror trigger sanity: a small `tests/integration/apify-lab-mirror.sql.test.ts` or psql fixture that inserts an `apify_lab_runs` row and asserts a matching `provider_call_logs` row with `source_context='admin_lab'`.

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run` (formulas + budget + reconciliation tests)
- Spot-check `/admin/visao-geral`: production cost matches previous total minus Lab; new "I&D" line shows ~$1.09 actual / $0.44 est for last 30 d.
- Confirm `/admin/apify-lab` still records to `apify_lab_runs` (writer code untouched).

## Out of scope (explicit)

Public analysis behaviour, Apify actor configuration, onboarding, credits, report rendering, pricing, payments, thumbnails, emails — all untouched. No Apify actor calls are executed.

## Risks / open questions

- The `actor` column in `provider_call_logs` is NOT NULL. For mirrored Lab rows we'll set `actor = COALESCE(NEW.mode, 'apify-lab')` — confirm this is acceptable, or relax to nullable in the migration.
- 24 historical apify pcl rows with no `analysis_event_id` will end up as `'unknown'` (probably pre-instrumentation calls). They affect `other_cost_30d` not `production_cost_30d`, which is the safe choice.
- The trigger fires SECURITY DEFINER under the table owner; double-check that the role has INSERT on `provider_call_logs` (it does — it's the table owner).

## Deliverables checklist

- [ ] Migration approved (adds column, index, trigger, mirror function, backfills existing rows + Lab rows)
- [ ] Code changes shipped behind the same migration
- [ ] Tests green
- [ ] `/admin/visao-geral` shows Production / Lab / Total split
- [ ] `cost_per_lead` excludes Lab
- [ ] Apify hard cap includes Lab (verified by mirroring)
