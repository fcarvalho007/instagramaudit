
# Custos por perfil — clareza no admin

## Audit of Current State

The admin already has two cost-related sections:

1. **CostsDetailSection** — 24h KPIs (Apify/OpenAI/DFS totals), last 20 provider calls table, alerts, enrichment jobs summary
2. **AnalysisCostBreakdown** — per-analysis expandable rows with provider decomposition (Apify base, comments, OpenAI, DFS)

**What's missing (per your requirements):**
- Enrichment status summary per analysis row
- Linkage rate (linked vs total calls)
- Confidence of attribution
- Cache readiness per profile
- `analysis_event_id` / `snapshot_id` display
- "Pronto em cache" indicator for test profiles
- Warning when costs may still change (pending enrichments)

## Plan

### 1. Enhance the backend endpoint (`analysis-cost-breakdown.ts`)

Add to each `AnalysisBreakdown` result:
- `linked_count` / `total_count` — linkage rate
- `enrichment_summary` — { type: status } map from `enrichment_jobs` for this snapshot
- `all_enrichments_complete` — boolean
- `snapshot_expires_at` — from `analysis_snapshots`

### 2. Enhance `AnalysisCostBreakdown` component

Per analysis row, add:
- Shortened `event_id` and `snapshot_id` (first 8 chars, monospace)
- Enrichment status dots (5 dots: DFS, v1, v2, visual, caption)
- Linkage rate badge: "6/6 ligadas" or "4/6 ⚠️"
- If any enrichment is pending: amber "Custo pode aumentar" badge

### 3. Enhance `TestProfilesCard`

Expand the server function `getTestProfileStatuses` to return:
- `enrichmentStatus` map (from snapshot payload)
- `allEnrichmentsComplete` boolean
- `marketSignalsFree` present/absent
- `insightsV1` / `insightsV2` present
- `latestFreshCostTotal` — sum of all provider_call_logs for latest fresh event
- `cacheReady` — snapshot not expired + all enrichments success
- `snapshotExpiresAt`

Update the card UI:
- Add more status chips: Insights v1, Insights v2, Market signals, enrichment_status
- Show "Pronto para testes sem custos" when cacheReady + cache_only mode
- Show latest fresh cost total
- Show expiration countdown

### 4. Copy (pt-PT)

All new labels:
- "Custo total", "Última análise fresh", "Chamadas ligadas", "Confiança da atribuição"
- "Pronto em cache", "Enriquecimentos completos"
- "Custo pode aumentar" (when pending enrichments)
- "Sem análise fresh registada" (when no fresh event)

## Files Changed

| File | Change |
|---|---|
| `src/routes/api/admin/analysis-cost-breakdown.ts` | Add enrichment summary, linkage rate, snapshot expiry |
| `src/components/admin/v2/sistema/analysis-cost-breakdown.tsx` | Show enrichment dots, linkage rate, event/snapshot IDs |
| `src/server/admin/execution-mode.functions.ts` | Expand TestProfileStatus with enrichment + cost + cache readiness |
| `src/components/admin/v2/sistema/test-profiles-card.tsx` | Add enrichment status chips, cost, cache readiness |

## No changes to

- Public report UI
- Provider execution logic
- Pricing / cost calculation
- P01-P07 locked files
