## Goal

Stop paying DataForSEO twice for the same snapshot. Cache the Free market signals envelope inside `analysis_snapshots.normalized_payload.market_signals_free` with a 24 h TTL, plus a 10 min negative cache for transient failures. No schema migration, no UI change, no provider call during implementation.

## Files

**Create**
- `src/lib/market-signals/cache.ts` — pure helpers: TTL constants, type for the persisted summary, read/write helpers, "should bypass cache" decision for hard-error codes, and a builder that converts a `MarketSignalsResult` (+ provider cost + log id) into the persisted summary.

**Edit**
- `src/lib/dataforseo/market-signals.ts` — extend the orchestrator to also return:
  - `provider_cost_usd` (sum from envelope `cost` aggregated through a new optional accumulator)
  - `provider_call_log_ids` (collected from a new client-side return)
  
  Minimal, additive change: do not break the existing public type. Easiest path → keep `buildMarketSignals` signature, but add an internal `runWithMetrics` wrapper that captures these via a new optional callback returned alongside the result. To stay surgical, attach them as optional fields on `MarketSignalsOk` / `MarketSignalsFail` (`provider_cost_usd?`, `provider_call_log_ids?`).

- `src/lib/dataforseo/client.ts` — return the inserted `provider_call_logs.id` from `logCall` so the orchestrator can collect it. Currently `insert(...)` is fire-and-forget; switch to `.insert(...).select("id").single()` and return the id (still swallow failures).

- `src/routes/api/market-signals.ts` — full new flow (see below). All response envelopes get `cache_status`, `cost_usd`, `cost_source`.

**Untouched**
- `/report/example`, all report visual components, Apify pipeline, Supabase schema, billing, PDF, email, OpenAI.

## Persisted shape

Stored at `analysis_snapshots.normalized_payload.market_signals_free` (and later `…_paid`):

```ts
interface PersistedMarketSignals {
  status: "ready" | "partial" | "error" | "timeout" | "no_keywords";
  plan: "free" | "paid";
  generated_at: string;       // ISO
  expires_at: string;         // ISO
  keywords: string[];
  trends_usable_keywords: string[];
  trends_dropped_keywords: string[];
  trends: GoogleTrendsResult | null;     // raw result needed by the chart
  queries_used: number;
  queries_cap: number;
  errors: ClassifiedError[];
  provider_cost_usd: number;
  provider_cost_source: "provider_reported";
  provider_call_log_ids: string[];
}
```

## TTL constants (in `src/lib/market-signals/cache.ts`)

```ts
export const MARKET_SIGNALS_TTL = {
  free_ready_seconds: 24 * 60 * 60,   // 24h success cache
  partial_seconds:   24 * 60 * 60,   // partial = same as ready (we have data)
  soft_error_seconds: 10 * 60,       // 10 min negative cache for timeout/rate-limit
} as const;
```

Hard-error codes that **must NOT be cached at all** (forces immediate retry, not a burn loop because next call still fails fast at the provider):
- `ACCOUNT_NOT_VERIFIED`
- `AUTH_FAILED`
- `DISABLED`
- `BLOCKED`

Soft-error codes cached for 10 min:
- `TIMEOUT`, `RATE_LIMITED`, `UNKNOWN`

`status === "no_keywords"` → cache for 24 h (deterministic from snapshot).

## /api/market-signals new flow

1. Parse + validate body (unchanged).
2. Kill-switch (`isDataForSeoEnabled`). If off → return `{ status: "disabled", cache_status: "disabled", cost_usd: 0, cost_source: "none", … }`. **No DB read.**
3. Load snapshot row (`id, instagram_username, normalized_payload`).
4. Allowlist check on owner handle. If blocked → `{ status: "blocked", cache_status: "blocked", cost_usd: 0, cost_source: "none" }`. **No provider call.**
5. **Cache lookup**: read `normalized_payload.market_signals_free`. If present and `expires_at > now()` → return cached envelope as-is plus `cache_status: "hit"`, `cost_usd: cached.provider_cost_usd`, `cost_source: "cache"`. **No provider call.**
6. **Cache miss / expired** → call `buildMarketSignals(...)` once.
7. Decide TTL based on status / dominant error code:
   - `ready` / `partial` / `no_keywords` → 24 h
   - `error|timeout` with only soft codes → 10 min
   - `error` with any hard code → **do not persist**
8. If TTL applies, merge persisted summary into `normalized_payload.market_signals_free` and write back via:
   ```ts
   supabaseAdmin
     .from("analysis_snapshots")
     .update({
       normalized_payload: { ...current, market_signals_free: persisted }
     })
     .eq("id", snapshotId);
   ```
   Best-effort: failure to persist is logged but does not fail the response.
9. Return live envelope with `cache_status: "miss"`, `cost_usd: persisted.provider_cost_usd ?? 0`, `cost_source: "provider_reported" | "none"`.

## Cost capture

`buildMarketSignals` currently discards the per-call envelope cost. Smallest change:

- In `client.ts`, `callDataForSeo` already extracts `actualCostUsd` for logging via `extractActualCost(envelope)`. Have it also return `{ envelope, costUsd, providerCallLogId }` from a new sibling helper, OR (simpler) attach `cost` and `__provider_call_log_id` as non-enumerable fields on the returned envelope — rejected, that's leaky.
- Cleaner: add an internal `callDataForSeoWithMeta()` that wraps `callDataForSeo` and reads `extractActualCost(envelope)` plus the log id. Endpoint helpers (`fetchGoogleTrends`, etc.) stay unchanged for callers.

After consideration: simplest non-breaking option is to **keep `callDataForSeo`'s signature** and instead let the orchestrator compute cost from the envelope it already receives via `firstResultOrNull`/the full envelope. We already throw away the envelope's top-level `cost` — capture it by changing `firstResultOrNull` callsites to first stash `envelope.cost` and the `tasks[0].id`-style metadata. Concretely:

- Add a `runCall<T>(label, fn)` helper inside `buildSignalsInner` that awaits `fn()`, on success records `envelope.cost`, returns the parsed first result.
- For the log id: insert returns it from the new `client.ts` change. The orchestrator can't see it directly, so instead the **route handler** collects log ids by querying `provider_call_logs` for rows created during this request window (handle + actor LIKE `<endpoint>:%` + created_at > startedAt). This avoids changes to the client. Picked: this query approach.

Final orchestrator addition: aggregate `envelope.cost` (top-level) into a `total_cost_usd` field returned on `MarketSignalsResult`.

## Public response shape

All envelopes (live, cached, blocked, disabled) gain three top-level fields:

```ts
{
  ...existing fields,
  cache_status: "hit" | "miss" | "disabled" | "blocked",
  cost_usd: number,                                // 0 when cache_status ∈ {disabled, blocked, miss-without-cost}
  cost_source: "provider_reported" | "cache" | "none",
}
```

Backwards-compatible: existing UI ignores unknown fields.

## Exactly when DataForSEO IS called

Only if **all** are true:
- `DATAFORSEO_ENABLED` evaluates true (case/whitespace tolerant)
- Snapshot exists in `analysis_snapshots`
- Owner handle passes the allowlist
- `normalized_payload.market_signals_free` is missing OR `expires_at <= now()`

## Exactly when DataForSEO IS NOT called

- Kill-switch off → `disabled`
- Snapshot id missing → `error` (404)
- Owner not allowlisted → `blocked`
- Cached entry valid → `hit` (any status that was cached, including `no_keywords` and soft errors)

## Validation

1. `bunx tsc --noEmit`
2. `bun run build` (harness handles)
3. No DataForSEO / Apify / OpenAI calls during implementation. Verified by absence of fetch invocations in helpers.
4. No SQL migration. JSONB write uses existing `update()` on `analysis_snapshots`.

## Out of scope

- Paid plan caching (`market_signals_paid`) — type hooks ready, write path identical when needed.
- Cache invalidation when underlying snapshot changes — current snapshot id is immutable per analysis run, so a new analysis = new snapshot id = automatic miss.
- Admin UI for cache stats.