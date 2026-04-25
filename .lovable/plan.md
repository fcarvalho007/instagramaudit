
# InstaBench — Apify Readiness & Admin Cockpit (Plan)

This plan prepares the application for a controlled Apify connection and turns `/admin` into an operational cockpit. No code is written here. No UI is changed. `/report.example`, PDF and email flows remain untouched.

---

## 1. Current state (audit)

What already exists:
- `src/lib/security/apify-allowlist.ts` — allowlist + `APIFY_TESTING_MODE` toggle, default `frederico.m.carvalho`.
- `src/routes/api/analyze-public-v1.ts` — gates by allowlist, requires `INTERNAL_API_TOKEN` for `?refresh=1`, uses cache, limits posts to 12, max 2 competitors.
- `src/lib/analysis/cache.ts` — 24h cache + 7d stale-while-error, deterministic `cache_key`.
- `src/routes/api/admin/diagnostics.ts` + `src/components/admin/diagnostics-panel.tsx` — secret presence, allowlist status, snapshots/report_requests counts and last row.
- DB tables: `analysis_snapshots`, `report_requests`, `leads`, `benchmark_references`.

What is missing for a safe Apify go-live and a real cockpit:
- No explicit `APIFY_ENABLED` kill-switch (only the allowlist gate).
- No per-call event log (cost estimation, duration, status, source, error).
- No "profiles" rollup (analyses per profile, last analysis, repeats).
- No cost estimation logic.
- Admin only shows last snapshot/last report — no list of profiles, no events list, no alerts.
- No placeholder for future revenue/PnL.

---

## 2. Apify readiness layer

Add a true kill-switch and tighten current gates without touching UI:

- `APIFY_ENABLED` env var (default `true`). When `false`, the public endpoint:
  - Serves cache hits if available (fresh or within stale window).
  - Otherwise returns a clean error (new code `PROVIDER_DISABLED`, HTTP 503, message in pt-PT).
  - Never calls Apify.
- Confirm and keep:
  - `APIFY_TESTING_MODE=true` + `APIFY_ALLOWLIST` (already implemented).
  - `?refresh=1` requires `Authorization: Bearer ${INTERNAL_API_TOKEN}` (already implemented).
  - `POSTS_LIMIT = 12`, `MAX_COMPETITORS = 2`, single unified actor call (already implemented).
  - Cache TTL 24h, stale 7d (already implemented).
- Public refresh remains impossible (no public bypass param).

Order of checks inside `POST /api/analyze-public-v1`:
1. Validate input.
2. `APIFY_TESTING_MODE` → allowlist.
3. Cache lookup (always allowed, even if disabled).
4. `APIFY_ENABLED` check before any provider call.
5. `?refresh=1` requires admin token.
6. Run actor → log event → store snapshot.
7. Stale-while-error fallback.

---

## 3. Backend logging (events, profiles, costs)

Add two small tables and one rollup. No payment tables yet.

### 3.1 New table — `analysis_events`
One row per attempt to analyze a primary handle (cache hit or provider call).

| column | type | notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `created_at` | timestamptz | default `now()` |
| `instagram_username` | text | primary handle, lowercased |
| `competitor_usernames` | jsonb | stored as array, lowercased |
| `cache_key` | text | same key as snapshots |
| `data_source` | text | `fresh` \| `cache` \| `stale` |
| `outcome` | text | `success` \| `provider_error` \| `not_found` \| `blocked_allowlist` \| `provider_disabled` \| `invalid_input` |
| `error_code` | text null | mirrors `PublicAnalysisErrorCode` when applicable |
| `provider` | text | `apify` |
| `apify_actor` | text null | e.g. `apify/instagram-scraper` |
| `duration_ms` | int null | wall time of the provider call |
| `posts_returned` | int null | sum across primary + competitors |
| `profiles_returned` | int null | 1 + successful competitors |
| `estimated_cost_usd` | numeric(10,5) null | see 3.3 |
| `analysis_snapshot_id` | uuid null | link to `analysis_snapshots.id` when available |
| `request_ip_hash` | text null | sha256 of IP + daily salt (privacy-friendly, used only for abuse signals) |
| `user_agent` | text null | truncated to 200 chars |

No RLS policies (server-only writes via service role; no client reads). Indexes on `instagram_username`, `created_at desc`, `outcome`.

### 3.2 New table — `profile_records`
Rollup per primary handle. Updated by trigger or by application code on every event.

| column | type | notes |
|---|---|---|
| `instagram_username` | text PK | lowercased |
| `first_analyzed_at` | timestamptz | |
| `last_analyzed_at` | timestamptz | |
| `analyses_total` | int | |
| `cache_hits` | int | |
| `fresh_calls` | int | |
| `failed_calls` | int | |
| `last_outcome` | text | |
| `last_snapshot_id` | uuid null | |
| `estimated_cost_usd_total` | numeric(12,5) | |

Recommended: a Postgres function `record_analysis_event(...)` that inserts into `analysis_events` and upserts `profile_records` atomically. Keeps the route handler simple.

### 3.3 Cost estimation
Estimate per fresh provider call only (cache hits cost 0). Two layers:
- **Heuristic v1 (immediate)**: constant per profile + constant per post.
  - Configurable via env: `APIFY_COST_PER_PROFILE_USD` (default `0.005`), `APIFY_COST_PER_POST_USD` (default `0.0005`).
  - `estimated_cost_usd = profiles_returned * cost_per_profile + posts_returned * cost_per_post`.
- **Real cost (later, optional)**: when we have an Apify run id, fetch `runs/{id}` and store `usageTotalUsd`. Out of scope for the first prompt — schema already supports overwriting `estimated_cost_usd`.

### 3.4 Repeated profiles & alerts (data only, UI later)
Derived from `analysis_events` + `profile_records`:
- Repeated profile: `analyses_total >= 5` or `>= 3 events in last 24h`.
- High failure rate: `failed_calls / analyses_total > 0.3` over last 7d.
- Suspicious volume: `> 30 events in last 1h` from same `request_ip_hash`.
Thresholds live in a small `src/lib/admin/alerts.ts` module so they are easy to tune.

---

## 4. Admin / backoffice

All under `/admin`, behind existing `requireAdminSession`. New tabs alongside the existing `Diagnóstico` and `Pedidos de relatório`:

- **Diagnóstico** (existing) — extend with:
  - `APIFY_ENABLED` state.
  - Cost knobs in effect (`APIFY_COST_PER_PROFILE_USD`, `APIFY_COST_PER_POST_USD`).
  - Last 24h: number of events, fresh calls, cache hits, failed, estimated cost.
- **Perfis analisados** (new) — table from `profile_records`, sortable by `last_analyzed_at`, `analyses_total`, `estimated_cost_usd_total`.
- **Eventos** (new) — paginated list from `analysis_events`, filters by `outcome`, `data_source`, date range, handle.
- **Custos** (new) — aggregates: today / 7d / 30d, per profile top 10, breakdown fresh vs cache.
- **Alertas** (new) — simple list of currently-triggered rules from §3.4. No notifications, just visible signals.
- **Receita & PnL** (placeholder) — empty section with a copy block: "Sem receita registada. Será ativado quando o módulo de pagamentos for adicionado." No tables created yet for billing.

All admin endpoints are `GET /api/admin/*`, server-only, gated by `requireAdminSession`. No data leaves the server beyond what the panels need (no full payloads, no IPs, no secrets).

---

## 5. Data model summary (minimum)

New:
- `analysis_events` (per-call log).
- `profile_records` (rollup).
- DB function `record_analysis_event(...)` (atomic insert + upsert).

Unchanged:
- `analysis_snapshots`, `report_requests`, `leads`, `benchmark_references`.

Not now (deferred until payments are introduced):
- `subscriptions`, `invoices`, `revenue_events`. The "Receita & PnL" tab is a UI placeholder only.

---

## 6. Frontend confirmations

- `/analyze/$username` remains the real result page. No changes in this plan.
- `/report.example` is a visual mockup only and stays untouched.
- Public landing: no UI changes. The hero only collects an Instagram username/URL — no manual metrics form, no email gate, no payments.

---

## 7. Files

### Will be created
- `supabase/migrations/<timestamp>_analysis_events.sql` — `analysis_events`, `profile_records`, function `record_analysis_event`, indexes.
- `src/lib/analysis/events.ts` — `recordAnalysisEvent({...})` wrapper that calls the SQL function.
- `src/lib/analysis/cost.ts` — `estimateCostUsd({ profiles, posts })`, env-driven.
- `src/lib/admin/alerts.ts` — alert thresholds + computation helpers.
- `src/routes/api/admin/profiles.ts` — list profile_records.
- `src/routes/api/admin/events.ts` — list analysis_events with filters.
- `src/routes/api/admin/costs.ts` — aggregated cost summary.
- `src/routes/api/admin/alerts.ts` — currently triggered alerts.
- `src/components/admin/profiles-panel.tsx`
- `src/components/admin/events-panel.tsx`
- `src/components/admin/costs-panel.tsx`
- `src/components/admin/alerts-panel.tsx`
- `src/components/admin/revenue-placeholder.tsx`

### Will be modified (small, surgical)
- `src/routes/api/analyze-public-v1.ts` — add `APIFY_ENABLED` check, call `recordAnalysisEvent` after every attempt (cache hit, provider call, blocked, error), include duration and counts.
- `src/lib/analysis/types.ts` — add `PROVIDER_DISABLED` error code.
- `src/routes/api/admin/diagnostics.ts` — add `APIFY_ENABLED`, cost knobs, last-24h counters.
- `src/components/admin/diagnostics-panel.tsx` — render the new fields.
- `src/routes/admin.tsx` — add the new tabs.
- `LOCKED_FILES.md` — append the new admin components after they stabilize.

### Locked — do NOT touch
- Everything in `LOCKED_FILES.md`, in particular:
  - `src/styles/tokens.css`, `src/styles.css` (theme).
  - `src/routes/__root.tsx`.
  - `src/components/ui/*` already locked.
  - All `src/components/landing/*` locked entries.
  - All `src/components/report/*` and `src/routes/report.example.tsx`.
- Generated: `src/routeTree.gen.ts`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`.
- PDF and email pipelines: `src/routes/api/generate-report-pdf.ts`, `src/routes/api/send-report-email.ts`, `src/routes/api/request-full-report.ts`, `src/lib/pdf/*`, `src/lib/email/*`, `src/lib/orchestration/run-report-pipeline.ts`.

---

## 8. Recommended implementation order (one prompt = one step)

Each step is small, independently verifiable, and reversible.

1. **DB foundations** — migration: `analysis_events`, `profile_records`, function `record_analysis_event`, indexes. No code wiring yet.
2. **Cost + event helpers** — add `src/lib/analysis/cost.ts` and `src/lib/analysis/events.ts`. No call sites yet.
3. **Wire events into the analyze endpoint** — call `recordAnalysisEvent` for: cache hit, blocked allowlist, provider disabled, fresh success, fresh failure, not found. Add `APIFY_ENABLED` kill-switch and `PROVIDER_DISABLED` error code. No UI change.
4. **Diagnostics extension** — extend `/api/admin/diagnostics` and the existing panel with `APIFY_ENABLED`, cost knobs, last-24h counters (read-only).
5. **Profiles list** — endpoint + panel + tab.
6. **Events list** — endpoint + panel + tab (with filters, pagination).
7. **Costs summary** — endpoint + panel + tab.
8. **Alerts** — `src/lib/admin/alerts.ts` + endpoint + panel + tab.
9. **Revenue placeholder** — static panel + tab. No tables, no logic.
10. **Lock new admin components** — append to `LOCKED_FILES.md` once stable.

After step 3, the smoke test with `frederico.m.carvalho` is fully observable in the database. After step 4, it is observable in `/admin` without any new tab.

---

## Constraints honoured

- No manual metrics form.
- No email gate, no payments, no subscriptions.
- No Python, no custom scraping.
- `/report.example` and PDF/email pipelines untouched.
- Public users only enter an Instagram username/URL.
- Only `frederico.m.carvalho` is allowlisted by default; any change is via env vars, not code.
