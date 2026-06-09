## Goal
Make 30d/90d real Pro features: visible by default for Pro, locked for Free, cache-aware modal with explicit "open cached" vs "generate new" CTAs, server-enforced forced refresh with per-lead/profile/window/day cap, and admin observability.

## Current state (verified)
- 90d kill-switch already defaults to `true` (`analyze-public-v1.ts:631` + `app-config.functions.ts:36`). Sidebar already filters chips via `proWindow90dEnabled`. Free still sees lock — works.
- Cache TTL = 24h (`CACHE_REUSE_MAX_MS` in `lib/report/retention.ts`, re-exported as `CACHE_TTL_MS`). Reuse this constant; do NOT introduce a new 12h timer.
- `force_refresh` from end users does NOT exist today — only `?refresh=1` + `INTERNAL_API_TOKEN` (admin/internal). User-facing force refresh must be added with the full Pro gate stack.
- `WINDOW_REQUIRES_PRO`, `WINDOW_90D_DISABLED`, `WINDOW_90D_BUDGET_EXCEEDED`, `INSUFFICIENT_CREDITS`, `COMPETITORS_REQUIRE_PRO` already wired in `analyze-public-v1.ts` ERROR_MESSAGES + types + i18n. Pro Apify 90d daily cap (`APIFY_90D_DAILY_CAP_USD`) already exists.
- Period modal in `report-block-nav.tsx` (lines 560-740) calls `fetchPublicAnalysis` directly; no cache pre-check; no force-refresh flag.

## Changes

### 1. DB seed (data, via insert tool)
Idempotent UPDATE to ensure 90d kill-switch is active in production DB:
```sql
UPDATE public.app_config
   SET value='true', updated_at=now(), updated_by='system'
 WHERE key='pro_window_90d_enabled' AND value <> 'true';
INSERT INTO public.app_config(key, value, updated_by)
SELECT 'pro_window_90d_enabled','true','system'
WHERE NOT EXISTS (SELECT 1 FROM public.app_config WHERE key='pro_window_90d_enabled');
```

### 2. Backend — `force_refresh` body field (`src/routes/api/analyze-public-v1.ts`)
- Extend `PayloadSchema`: add `force_refresh: z.boolean().optional().default(false)`.
- Compute final `forceRefresh = (internal ?refresh=1 path) || (payload.force_refresh && isPro && windowKind !== "baseline")`. Free + baseline always ignore the flag. If a Free lead sends `force_refresh:true` on 30d/90d → already blocked by existing `WINDOW_REQUIRES_PRO`.
- Gate order (preserved + extended):
  1. `ONBOARDING_REQUIRED` (lead cookie)
  2. `COMPETITORS_REQUIRE_PRO` (unchanged)
  3. `WINDOW_REQUIRES_PRO` (30d/90d)
  4. `WINDOW_90D_DISABLED` (kill-switch)
  5. **New** `PRO_WINDOW_BUDGET_EXCEEDED` (per-lead/profile/window/day) — runs ONLY on `!skipReserve && (forceRefresh || !cacheFreshHit)`; never on cache-hit reads.
  6. `WINDOW_90D_BUDGET_EXCEEDED` (global 90d daily cap, unchanged)
  7. `INSUFFICIENT_CREDITS` via `reserveCredit`
  8. Apify fresh call
- When `forceRefresh && cacheFreshHit && alreadyAssociated` → DON'T `skipReserve` (this is the new paid refresh path; flip to reserve+confirm).
- Log `cache_bypassed: true` in `analysis_events.metadata`-style fields (extend `recordAnalysisEvent` call site with extra payload via existing `analysis_events` JSON column if present, otherwise inline two flags in `outcome`/`data_source` plumbing). Add `forced_refresh` boolean to the event payload echoed back to the client.

### 3. Backend — per-lead/profile/window/day cap (`src/lib/security/apify-budget.server.ts`)
- New helper `assertProWindowProfileDailyBudgetAvailable({ leadId, handle, window })`:
  - Reads `APIFY_PRO_WINDOW_PROFILE_DAILY_CAP_USD` (default `5.5` USD ≈ €5).
  - Sums `provider_call_logs.estimated_cost_usd` for `provider='apify'`, matching `handle`, `analysis_window=window`, and `created_at >= start of UTC day`, **AND** belonging to events linked to this `leadId` via `analysis_events.lead_id` join.
  - Throws `ProWindowBudgetExceededError(spentUsd, capUsd, scope)` when ≥ cap.
- Cache (60s TTL per `(leadId, handle, window)` key) mirroring existing pattern.
- Exposed: `getProWindowProfileDailyCapUsd()`, `getProWindowProfileDailySpendUsd(...)`, `invalidateProWindowBudgetCache()`.

### 4. Error code wiring
- Add `"PRO_WINDOW_BUDGET_EXCEEDED"` to `PublicAnalysisErrorCode` (`src/lib/analysis/types.ts`).
- `ERROR_MESSAGES.PRO_WINDOW_BUDGET_EXCEEDED` = PT-PT "A análise dos últimos {days} dias está temporariamente indisponível por segurança operacional. Tenta novamente mais tarde ou usa outra janela." — `HTTP_STATUS = 503`. Days substitution done client-side from window.
- Update existing `WINDOW_*` error i18n in `pt/errors.json` + `pt/report.json` (new key `period_error_pro_window_budget`).

### 5. Frontend — cache-aware period modal (`report-block-nav.tsx` + new sub-component)
- Before opening the dialog for `openConsumeDialog({ kind:"period", days })`, probe cache state with a NEW public server fn `getPeriodCacheState(handle, competitors, window)` (creates `src/lib/analysis/period-cache.functions.ts`) that uses `supabaseAdmin` to read `analysis_snapshots` by deterministic `cache_key`, returns `{ hasFreshCache: boolean, ageMs: number | null, snapshotId: string | null, alreadyOwned: boolean }` (alreadyOwned via `leadOwnsReport`). No provider call; no credit cost.
- New `PeriodConsumeDialog` states (already PT-PT strings provided by user, store in `report.json`):
  - **Case A — cache fresh** (`hasFreshCache && ageMs < CACHE_TTL_MS`): Title `"Análise dos últimos {days} dias já disponível"`, body referencing `ageHumanized` (`há X horas`/`X minutos`). Primary CTA `"Abrir análise recente"` (0 credits) → calls `fetchPublicAnalysis(handle, comps, { window })` (cache hit, free) and navigates with `?w=`. Secondary CTA `"Gerar nova análise · 1 crédito"` → calls with `{ window, force_refresh: true }` (only enabled if `balance >= 1`).
  - **Case B — no fresh cache**: Title `"Gerar análise dos últimos {days} dias"`, single primary CTA `"Gerar análise · 1 crédito"`. Hide CTA if `balance < 1`.
  - **Case C — balance 0**: Title `"Sem créditos disponíveis"`, only close button. No backend call possible (`force_refresh` and standard generate hidden).
  - **Case D — operational cap toast**: on `PRO_WINDOW_BUDGET_EXCEEDED` / `WINDOW_90D_BUDGET_EXCEEDED` response, show toast `"Análise temporariamente indisponível"`. Never mention Apify/cost/cap internals.
- Track events: `beta_period_cache_open` (0 credits) vs `beta_period_force_refresh` (1 credit, `cache_bypassed:true`).

### 6. Admin observability
- `analysis_events` already carries `analysis_window`, `cache_key`, `data_source`, `outcome`. Add new event metadata field `forced_refresh: boolean` (via existing JSON column on `analysis_events` if present — check schema; if no JSON column, encode `data_source = "fresh_forced"` as a new tag the admin tables already accept).
- `recordAnalysisEvent` callsite in `analyze-public-v1.ts` receives `forcedRefresh` and propagates.
- Admin surfaces (read-only display updates):
  - **`lead-detail-sheet.tsx`** activity timeline: show window badge + "Cache" / "Fresh" / "Fresh (forçado)" tag; show credit_ledger linkage via `analysis_event_id` (already wired).
  - **`reports-table-section.tsx`** + `report-drawer.tsx`: extend `deriveWindow` rendering to include the forced-refresh chip when `data_source === "fresh_forced"`.
  - **`analysis-cost-breakdown.tsx`**: add per-window subtotal row (baseline / 30d / 90d) showing estimated/actual USD.
  - **`analysis-window-counts.ts`**: already groups by window — add `forced_refresh` count column.
- No new DB tables; no new RLS.

### 7. Tests
- `analyze-public-v1-force-refresh.test.ts` (new):
  - Free + force_refresh:true on 30d → `WINDOW_REQUIRES_PRO`, no reserve, no provider.
  - Pro + 90d + kill-switch off → `WINDOW_90D_DISABLED`, no reserve.
  - Pro + 90d + per-profile cap exhausted (mock `assertProWindowProfileDailyBudgetAvailable` to throw) → `PRO_WINDOW_BUDGET_EXCEEDED`, no reserve, no Apify, event logged with `outcome:"blocked_credits"`, `estimated_cost_usd:0`.
  - Pro + 30d + cache fresh + alreadyOwned + force_refresh:false → 0 credits, no provider.
  - Pro + 30d + cache fresh + alreadyOwned + force_refresh:true → 1 credit reserved, Apify called, event `forced_refresh:true`.
  - Pro + 30d + no fresh cache → 1 credit reserved, Apify called.
- `apify-budget-pro-window.test.ts` (new): cap helper sums correctly, throws when reached, cache invalidation works.
- Existing `analyze-public-v1-window-flag.test.ts`, `analyze-public-v1-credit-gate.test.ts`, competitor-gate test → unchanged behaviour.

## Out of scope
Checkout, EuPago, pricing, payment emails, competitor comparison UI, Free report layout, AI enrichment prompts, LinkedIn/TikTok research, public landing, `/report/example`, `comparison_readings` cost path (already shipped last turn).

## Validation
A. Pro sees 30d + 90d chips; Free sees lock; kill-switch off hides 90d backend-side.
B. Cache modal: Case A/B/C render correctly; "Abrir análise recente" → cache hit, 0 credits; "Gerar nova" → 1 credit + `forced_refresh:true`; no-cache → 1 credit.
C. Balance 0 → no generate/refresh CTA; cached open still works.
D. Set `APIFY_PRO_WINDOW_PROFILE_DAILY_CAP_USD=0` → fresh/forced 90d blocked before reserve; cached open still works; 30d unaffected (separate per-window key).
E. Admin lead sheet shows window/source/forced flag; cost breakdown shows per-window subtotals.
F. Regression: Free baseline unchanged; Pro baseline unchanged; competitor gate intact; payment/email untouched; existing tests green.
