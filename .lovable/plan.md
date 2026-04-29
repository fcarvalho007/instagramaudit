## Audit: `/api/analyze-public-v1` orchestration

Read-only inspection of `src/routes/api/analyze-public-v1.ts` (1104 LOC), `src/lib/analysis/cache.ts` (`storeSnapshot`), `src/lib/insights/openai-insights.server.ts`, `src/lib/dataforseo/market-signals.ts`, and `src/lib/analysis/events.ts`.

### 1. Current pipeline order (POST handler)

```text
1.  Parse request JSON (line 451)
2.  Validate payload with Zod (463) → logEvent(invalid_input) on fail
3.  Apply allowlist gate (492-520) → logEvent(blocked_allowlist) on fail
4.  Resolve ?refresh=1 + INTERNAL_API_TOKEN (526-540)
5.  Build cache key (542)
6.  loadBenchmarkReferences() (547)
7.  lookupSnapshot(cacheKey) (550) — if fresh and !forceRefresh:
       logEvent(cache,success) and RETURN cached response
8.  Apify kill-switch (575) — disabled → logEvent + RETURN
9.  ───── try { ───── (614)
10.   fetchProfileWithPostsLogged(primary)  → Apify call + provider_call_logs
      fetchProfileWithPostsLogged(competitors[])  in parallel
11.   normalizeProfile(primary) → if null: logEvent(not_found) + RETURN
12.   computeContentSummary(primary)
13.   await competitorRowsP, normalize each
14.   enrichPosts(primaryPosts) (717-720)
15.   Market signals (727-812):
        - read cached summary from previous snapshot (if any)
        - else: buildMarketSignals(20s timeout)
        - then read provider_call_logs to attach cost/log ids
16.   computeBenchmarkPositioning early (817-825)
17.   OpenAI insights block (833-894):
        - if isOpenAiAllowed(handle): build InsightsContext
        - generateInsights(ctx) — internal 25s AbortController timeout
        - try/catch swallows throws (892)
18.   Build normalizedPayload (896-906) — includes ai_insights_v1 +
        market_signals_free if present
19.   storeSnapshot(...) (908-916) ← FIRST AND ONLY snapshot write
20.   logEvent(fresh,success) (952-965)
21.   return jsonResponse(response, 200)
22. } catch (err) { (967)
       — stale fallback OR provider_error logEvent + failure(...)
    }
```

### 2. First `analysis_snapshots` insert/update

`storeSnapshot(...)` at **lines 908–916**, inside the main `try { }` block.
There is exactly **one** snapshot persistence point. There is no
intermediate "base snapshot" write.

### 3. Does snapshot persistence depend on OpenAI?

**Effectively, yes — by ordering, not by data dependency.**

- The `storeSnapshot` call is placed *after* the `await generateInsights(ctx)` block.
- The OpenAI block has a `try/catch` (line 890) and `aiInsights` defaults to `null`, so a thrown OpenAI error does NOT block the write.
- BUT: any `await` that **never resolves before the HTTP invoker timeout** (Cloudflare Worker wall-time / fetch deadline) means execution is killed before reaching line 908. The Worker is terminated → no `storeSnapshot`, no `logEvent(fresh,success)`.
- `generateInsights` uses an internal 25s AbortController, but if the response is partially streamed/blocked or model is slow, total elapsed = Apify (≈8s) + DataForSEO orchestration (≤20s) + OpenAI (≤25s) = up to **~53s**, plus normalisation overhead — comfortably exceeding typical Cloudflare invoker deadlines and the user-observed `context deadline exceeded`.

### 4. Are Apify/DataForSEO results lost on timeout before OpenAI completes?

**Yes — completely.**

- The normalised primary profile, posts, content summary, competitor results, enriched posts, and the freshly-built `marketSignalsFree` summary all live as **in-memory variables** between line 717 and line 908.
- Nothing is persisted until `storeSnapshot` at 908. If the Worker is killed at any point between 753 (DataForSEO call) and 908 (snapshot write), all that work is discarded.
- The `provider_call_logs` rows for Apify and DataForSEO survive (they are written inside their own helpers before the orchestrator-level await chains complete), which matches the observed symptom: provider logs present, no snapshot, no event.

### 5. Is an `analysis_event` recorded for mid-pipeline aborts?

**No.**

- All `logEvent(fresh, success | provider_error | not_found)` calls happen either inside the success path after `storeSnapshot` (line 952) or inside the outer `catch` (lines 994–1042).
- A Worker invoker timeout is NOT a thrown JS exception that the `catch` can intercept — the runtime simply terminates the request. So neither the success branch nor the catch branch executes, and no `analysis_events` row is written. This matches: "No recent analysis_events row was created."

### 6. Root cause summary

The orchestrator runs the entire chain **synchronously inside one HTTP request**:
Apify → DataForSEO → OpenAI → `storeSnapshot` → `logEvent` → response.

Snapshot persistence is **the last** step before the response, so any wall-time exhaustion at or after the OpenAI await (the slowest provider) silently drops *all* in-memory work, leaving the database in the exact state we observed.

There is also a secondary risk: the `await supabaseAdmin.from("provider_call_logs").select(...)` block at lines 762-784 runs immediately after `buildMarketSignals` — adding more latency on the critical path before OpenAI even starts.

---

### Recommended fix (smallest safe plan)

Persist a **base snapshot immediately after Apify + DataForSEO**, then attach
AI insights as a guarded best-effort step that updates the same row.
Do not change `storeSnapshot`'s signature; rely on its existing `onConflict: "cache_key"` upsert to make the second write idempotent.

#### Step-by-step changes (single file, ~30 LOC of reordering)

1. **Move `storeSnapshot` to run right after market signals** (between current line 812 and 817). Build a `baseNormalizedPayload` without `ai_insights_v1`. Call `storeSnapshot` and capture `snapshotId`.
2. **Emit `logEvent(fresh, success)` immediately after the base write.** This guarantees that a successful Apify+DataForSEO run is always reflected in `analysis_events`, regardless of what happens to OpenAI afterwards. (Optionally tag this event with a new `outcome="success_partial"` if we want to distinguish "with AI" vs "without AI" — but reusing `success` is sufficient for v1.)
3. **Keep the OpenAI block as best-effort.** After `generateInsights` returns (or throws), if `aiInsights` is non-null, call `storeSnapshot` a **second time** with the same `cacheKey` and the enriched payload that includes `ai_insights_v1`. The upsert collapses to an UPDATE. If OpenAI failed/timed out, the base snapshot already exists — nothing else to do.
4. **Tighten OpenAI guardrails** so the second write actually has time to run:
   - Lower `REQUEST_TIMEOUT_MS` in `openai-insights.server.ts` from 25s → 15s, OR
   - Wrap the whole OpenAI block in a `Promise.race` against an outer 15s budget so the orchestrator returns even if OpenAI stalls.
5. **Move the `provider_call_logs` post-read** (lines 760-784) off the critical path: do the read after `storeSnapshot` of the base row, not before. Better yet, return cost/log ids directly from `buildMarketSignals` so we never need that follow-up SELECT. (Optional polish — not required to fix the timeout.)
6. **Response shape unchanged.** The HTTP response still returns the latest in-memory `normalizedPayload` (with `ai_insights_v1` if present, without if not). Clients that hit the snapshot later via cache get whichever version was last persisted.

#### What this guarantees

- A successful Apify + DataForSEO run **always** persists a usable snapshot and an `analysis_events` row, even if the Worker dies before OpenAI returns.
- AI insights become a true non-blocking enrichment: present when the model responded in time, absent otherwise. The rest of the report is unaffected.
- No new tables, no migrations, no background workers, no `EdgeRuntime.waitUntil` dependency — entirely within current TanStack Start + Cloudflare Worker constraints.
- Idempotent: re-running the pipeline (or a future admin "re-generate AI insights" action) just upserts again on the same `cache_key`.

#### Out of scope for this fix

- True async/job-queue pattern (`202 Accepted` + background job) — overkill at v1 volume; revisit only if OpenAI latency keeps exceeding 15s budget regularly.
- Schema changes to `analysis_snapshots` (e.g. an `ai_insights_status` column) — current `normalized_payload` JSON is sufficient.
- Touching `/report.example` or any UI — fix is server-only.

### Files to modify when build mode resumes

- `src/routes/api/analyze-public-v1.ts` — reorder snapshot/event writes, second upsert after OpenAI.
- `src/lib/insights/openai-insights.server.ts` — tighten `REQUEST_TIMEOUT_MS` (optional).

No other files. No DB migrations. No provider config changes.