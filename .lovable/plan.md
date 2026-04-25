
# Admin analytics — minimum data model (plan)

Foundation for the admin cockpit: analyzed profiles, history, repeats, cache hits, Apify calls, failures, estimated cost, and a path to revenue/PnL when billing is added. No code, no migrations yet.

---

## Design principles

1. **One event per attempt.** Every call to `/api/analyze-public-v1` produces exactly one `analysis_events` row (cache hit, fresh call, blocked, error). This is the source of truth for cost, cache and abuse analytics.
2. **One row per analyzed profile.** `social_profiles` is a rollup updated from events. Cheap reads for the admin lists.
3. **Provider-agnostic from day one.** Tables key on `(network, handle)` so TikTok/LinkedIn/Facebook/YouTube can be added later without migration.
4. **Service-role only.** All four tables are server-written and server-read via `supabaseAdmin`. RLS enabled with no public policies — denies all client access by default.
5. **No personal data leakage.** No raw IPs, no emails, no full user-agents, no raw provider payloads outside `analysis_snapshots` (which already exists and is justified by the cache).
6. **No payment tables yet.** Just one optional column in `analysis_events` (`billing_event_id` nullable) so future billing rows can attach without altering history.

---

## 1. `social_profiles` — rollup per analyzed profile

**Purpose.** One row per `(network, handle)`. Powers the "Perfis analisados" admin list and the "repeated profiles" signal.

**Columns.**

| column | type | notes |
|---|---|---|
| `network` | text | `"instagram"`, `"tiktok"`, … (lowercased) |
| `handle` | text | lowercased, no leading `@` |
| `display_name` | text null | last seen display name (snapshot) |
| `followers_last_seen` | bigint null | last known follower count |
| `first_analyzed_at` | timestamptz | |
| `last_analyzed_at` | timestamptz | |
| `last_outcome` | text | mirrors `analysis_events.outcome` |
| `last_data_source` | text | `"fresh" \| "cache" \| "stale"` |
| `last_snapshot_id` | uuid null | FK-style ref to `analysis_snapshots.id` |
| `analyses_total` | int default 0 | all attempts |
| `analyses_fresh` | int default 0 | provider calls that succeeded |
| `analyses_cache` | int default 0 | cache + stale hits |
| `analyses_failed` | int default 0 | provider errors, not_found, blocked |
| `estimated_cost_usd_total` | numeric(12,5) default 0 | sum of `analysis_events.estimated_cost_usd` |
| `created_at`, `updated_at` | timestamptz | |

**Primary key:** `(network, handle)`.
**Indexes:** `(last_analyzed_at desc)`, `(analyses_total desc)`, `(estimated_cost_usd_total desc)`.
**RLS:** enabled, no policies (server-role only).
**Relation to `analysis_snapshots`:** `last_snapshot_id` is a soft pointer to the most recent snapshot for that handle. Snapshots remain the truth for payload contents; `social_profiles` is just a fast index.

**Write rules.**
- Cache hit → `analyses_total += 1`, `analyses_cache += 1`, `last_data_source = 'cache'|'stale'`, update `last_analyzed_at`, do NOT change `estimated_cost_usd_total`.
- Fresh success → `analyses_total += 1`, `analyses_fresh += 1`, `last_data_source = 'fresh'`, refresh `display_name`/`followers_last_seen`, add `estimated_cost_usd` to total.
- Fresh failure / blocked / not found → `analyses_total += 1`, `analyses_failed += 1`, `last_outcome` reflects reason. No cost added.

---

## 2. `analysis_events` — one row per attempt

**Purpose.** Append-only log of every call to `/api/analyze-public-v1`. Source of truth for cost, history, alerts.

**Columns.**

| column | type | notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `created_at` | timestamptz default now() | |
| `network` | text | future-proof; today always `"instagram"` |
| `handle` | text | primary handle, lowercased |
| `competitor_handles` | jsonb default `'[]'` | lowercased |
| `cache_key` | text | same key as `analysis_snapshots.cache_key` |
| `data_source` | text | `"fresh" \| "cache" \| "stale" \| "none"` |
| `outcome` | text | `"success" \| "provider_error" \| "not_found" \| "blocked_allowlist" \| "provider_disabled" \| "invalid_input"` |
| `error_code` | text null | mirrors `PublicAnalysisErrorCode` |
| `analysis_snapshot_id` | uuid null | link to snapshot when one exists |
| `provider_call_log_id` | uuid null | link to `provider_call_logs.id` when a real call ran |
| `posts_returned` | int null | sum across primary + competitors |
| `profiles_returned` | int null | 1 + successful competitors |
| `estimated_cost_usd` | numeric(10,5) null | 0 for cache hits, computed for fresh |
| `duration_ms` | int null | total handler wall time |
| `request_ip_hash` | text null | sha256(ip + daily salt), nullable |
| `user_agent_family` | text null | parsed family only ("Chrome", "Safari"), not full UA |
| `billing_event_id` | uuid null | reserved for future billing table; no FK now |

**Indexes:** `(created_at desc)`, `(network, handle, created_at desc)`, `(outcome, created_at desc)`, `(data_source, created_at desc)`.
**RLS:** enabled, no policies.
**Relation to existing `analysis_snapshots`:** `analysis_snapshot_id` links events to the snapshot they read (cache hit) or wrote (fresh success). Many events can point at the same snapshot — that is the repeat signal.

**Write rules.**
- Always one row per request (including invalid input). Writes are best-effort: a failure to log must never fail the user response.

---

## 3. `provider_call_logs` — one row per real Apify call

**Purpose.** Granular per-actor-call ledger. Enables auditing, debugging upstream errors and reconciling cost when Apify exposes real `usageTotalUsd`.

**Columns.**

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `created_at` | timestamptz default now() | |
| `provider` | text | `"apify"` |
| `actor` | text | e.g. `"apify/instagram-scraper"` |
| `network` | text | `"instagram"`, … |
| `handle` | text | the single handle scraped in this call |
| `analysis_event_id` | uuid null | back-ref to the originating event |
| `apify_run_id` | text null | when available from headers/response |
| `status` | text | `"success" \| "timeout" \| "http_error" \| "config_error" \| "network_error"` |
| `http_status` | int null | upstream status when applicable |
| `duration_ms` | int null | provider call wall time |
| `posts_returned` | int default 0 | rows returned by this call |
| `estimated_cost_usd` | numeric(10,5) null | computed (see §A) |
| `actual_cost_usd` | numeric(10,5) null | filled later if Apify run usage is fetched |
| `error_excerpt` | text null | first 200 chars of upstream error, no token, no PII |

**Indexes:** `(created_at desc)`, `(actor, created_at desc)`, `(status, created_at desc)`, `(handle, created_at desc)`.
**RLS:** enabled, no policies.
**Relation to `analysis_snapshots`:** none directly. A successful event that wrote a snapshot links via `analysis_events.analysis_snapshot_id`; the call log is the per-handle slice.

**Write rules.** Only on real provider attempts. Never on cache hits, never on blocked/disabled paths.

---

## 4. `usage_alerts` — non-blocking warning signals

**Purpose.** Record-only abuse/cost signals for the admin to see. Does NOT block users in v1.

**Columns.**

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `created_at` | timestamptz default now() | |
| `severity` | text | `"info" \| "warning" \| "critical"` |
| `kind` | text | `"repeated_profile" \| "high_failure_rate" \| "ip_burst" \| "daily_cost_threshold" \| "stale_serve"` |
| `network` | text null | when scoped to a network |
| `handle` | text null | when scoped to a profile |
| `request_ip_hash` | text null | when scoped to an IP |
| `window_start`, `window_end` | timestamptz | the observed window |
| `metric_name` | text | e.g. `"events_per_hour"`, `"failure_rate"`, `"cost_usd_24h"` |
| `metric_value` | numeric(12,5) | observed value |
| `threshold_value` | numeric(12,5) | threshold that triggered the alert |
| `acknowledged_at` | timestamptz null | admin can dismiss |
| `notes` | text null | free-form for the admin |

**Indexes:** `(created_at desc)`, `(kind, created_at desc)`, `(acknowledged_at)` partial where null.
**RLS:** enabled, no policies.
**Relation to `analysis_snapshots`:** none. Computed from `analysis_events` aggregates by a small server job (later — not in this plan).

**Write rules.** Generated by an internal evaluator that runs after each event (cheap inline check) or on demand from the admin diagnostics endpoint. Thresholds live in `src/lib/admin/alerts.ts` (not created here).

---

## A. Apify cost estimation

Two layers, in this order:

1. **Heuristic v1 (immediate).** Cost is computed from result volume, configurable by env, no manual entry.
   - `APIFY_COST_PER_PROFILE_USD` (default `0.005`)
   - `APIFY_COST_PER_POST_USD` (default `0.0005`)
   - `estimated_cost_usd = profiles_returned × cost_per_profile + posts_returned × cost_per_post`
   - Cache hits cost 0. Failures cost 0 unless the actor returned a partial dataset (then count what was returned).
2. **Real cost (later, optional).** When the actor response or a follow-up `runs/{id}` fetch exposes `usageTotalUsd`, store it in `provider_call_logs.actual_cost_usd`. The admin can prefer `actual_cost_usd ?? estimated_cost_usd`. This is a future enhancement — schema already supports it.

Daily/monthly cost = `sum(estimated_cost_usd)` over `analysis_events` in the window. Per-profile cost = same sum grouped by `(network, handle)` (already available in `social_profiles.estimated_cost_usd_total`).

---

## B. Avoiding unnecessary personal data

- **No raw IPs.** Store `sha256(ip + daily_rotating_salt)` only, in `request_ip_hash`. Salt rotates daily so hashes cannot be correlated across days.
- **No emails, no auth identifiers.** None of the four tables reference users.
- **No full user-agents.** Parse to family ("Chrome", "Safari", "bot") and store that string only, capped at 32 chars. If parsing is awkward, leave it `null`.
- **Error excerpts capped.** `provider_call_logs.error_excerpt` is truncated to 200 chars and must be sanitized to strip the Apify token and any URL with credentials before insert.
- **Snapshots remain the only place with provider-derived public profile content.** The new tables do not duplicate post text, captions or media URLs.

---

## C. Multi-network readiness (Instagram → TikTok / LinkedIn / Facebook / YouTube)

Every relevant table carries an explicit `network` column from day one:
- `social_profiles` PK is `(network, handle)`.
- `analysis_events.network`, `provider_call_logs.network`, `usage_alerts.network`.

Today every row is `"instagram"`. Adding TikTok later is purely a route-handler change plus a new actor in `provider_call_logs.actor` — no schema migration. The existing `analysis_snapshots.cache_key` should also be prefixed with the network when multi-network ships (currently `v1:<handle>|<competitors>` — change to `v1:<network>:<handle>|...` with a key version bump). That is a future task, not in this plan.

---

## D. Path to billing / revenue / PnL (without implementing payments)

- `analysis_events.billing_event_id uuid null` is the only billing-aware column added now. It stays null until a payments module exists. No FK is created (so no future ALTER is forced).
- When billing is introduced, three tables are expected:
  - `billing_customers` — minimal customer profile (separate from any future auth user).
  - `billing_transactions` — successful charges, refunds, with provider id.
  - `billing_events` — each chargeable usage unit; `analysis_events.billing_event_id` then points here.
- Revenue/PnL view in admin = `sum(billing_transactions.amount_usd) − sum(analysis_events.estimated_cost_usd ?? actual_cost_usd)` over a window. Until then, the admin shows the cost side only and a "Sem receita registada" placeholder.

This means **no payment tables are created in this plan**, and no schema change will be needed in `analysis_events` when payments arrive.

---

## E. Relation to the existing `analysis_snapshots`

| concern | snapshot | new tables |
|---|---|---|
| stores normalized payload | yes | no |
| stores raw provider rows | no (already normalized) | no |
| keyed by | `cache_key` | `(network, handle)` and `id` |
| lifecycle | TTL 24h fresh, 7d stale | append-only events; rollup for profiles |
| referenced by | `report_requests.analysis_snapshot_id` | `analysis_events.analysis_snapshot_id` |

No changes to `analysis_snapshots` are proposed in this plan.

---

## What gets written, by code path

| event | `analysis_events` | `provider_call_logs` | `social_profiles` | `usage_alerts` |
|---|---|---|---|---|
| invalid input | 1 row, `outcome=invalid_input`, `data_source=none` | — | — | maybe (ip_burst) |
| blocked by allowlist | 1 row, `outcome=blocked_allowlist`, `data_source=none` | — | — | maybe |
| `APIFY_ENABLED!=true`, no cache | 1 row, `outcome=provider_disabled`, `data_source=none` | — | upsert (counters only) | — |
| cache hit (fresh) | 1 row, `data_source=cache`, `outcome=success` | — | upsert, `analyses_cache++` | maybe (repeated_profile) |
| stale fallback | 1 row, `data_source=stale`, `outcome=success` | — | upsert, `analyses_cache++` | usage_alert `stale_serve` |
| fresh provider success | 1 row, `data_source=fresh`, `outcome=success`, links to snapshot + call log | 1 row per handle scraped, `status=success` | upsert, `analyses_fresh++`, refresh display fields | maybe (daily_cost_threshold) |
| not found upstream | 1 row, `outcome=not_found` | 1 row, `status=http_error`, `http_status=404` | upsert, `analyses_failed++` | — |
| upstream timeout / 5xx | 1 row, `outcome=provider_error` | 1 row, `status=timeout` or `http_error` | upsert, `analyses_failed++` | maybe (high_failure_rate) |

---

## What this plan does NOT do

- No code changes.
- No migration created.
- No admin UI built.
- No payments tables, no email gate, no manual cost entry.
- Existing tables (`analysis_snapshots`, `report_requests`, `leads`, `benchmark_references`) are untouched.

When you approve, the next implementation prompt will be: "Create migration for `social_profiles`, `analysis_events`, `provider_call_logs`, `usage_alerts` (RLS enabled, no policies) plus a `record_analysis_event(...)` SQL function that inserts into `analysis_events` and upserts `social_profiles` atomically."
