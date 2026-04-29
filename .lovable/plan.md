## Goal

Make exactly one OpenAI call against `gpt-5.4-mini` using snapshot `b2d453cd-c269-407b-8a83-720e4f2baa50` (`frederico.m.carvalho`), validate the resulting `ai_insights_v1`, and report. No Apify, no DataForSEO, no `/api/analyze-public-v1`, no snapshot mutation, no production code changes.

## Preconditions (already verified)

- Snapshot `b2d453cd-c269-407b-8a83-720e4f2baa50` exists, handle = `frederico.m.carvalho`.
- Has `profile`, `content_summary`, 12 `posts`, `market_signals_free` with `status = ready`, no `ai_insights_v1`.
- `DEFAULT_OPENAI_MODEL = "gpt-5.4-mini"`, `FALLBACK_MODEL = "gpt-5.4-mini"`.
- Pricing entry present for `gpt-5.4-mini` (input 0.75 / cached 0.075 / output 4.5 per 1M).
- No `gpt-5.4-nano` references in `src/lib/insights/` (verified previous turn).

## Steps

1. Run `bun run scripts/check-openai-insights-config.ts` and assert:
   - `resolved_model === "gpt-5.4-mini"`
   - `default_model === "gpt-5.4-mini"`
   - `fallback_model === "gpt-5.4-mini"`
   - Re-confirm `rg "gpt-5\.4-nano" src/lib/insights/` returns nothing.
   - Stop immediately if any check fails.

2. Create temporary script `/tmp/run-openai-validation.ts` (outside `src/`) that:
   - Uses `supabaseAdmin` to fetch the snapshot row by id.
   - Reads `normalized_payload` and rebuilds `InsightsContext`:
     - `profile`: from `normalized_payload.profile`.
     - `content_summary`: from `normalized_payload.content_summary`.
     - `top_posts`: top 3 by `engagement_pct` from `normalized_payload.posts`, mapped to `{ format, likes, comments, engagement_pct, caption_excerpt }`.
     - `benchmark`: computed via existing `computeBenchmarkPositioning` helper using `benchmark_references` rows + profile followers + content_summary engagement (read-only).
     - `competitors_summary`: derived from `normalized_payload.competitors` (count + median engagement_pct, or `{count:0, median_engagement_pct:null}` if absent).
     - `market_signals`: summary built from `normalized_payload.market_signals_free` (`has_free=true`, `has_paid=false`, top_keywords, strongest_keyword, trend_direction, dropped_keywords, strongest_score, trend_delta_pct, usable_keyword_count, zero_signal_keywords).
   - Calls `generateInsights(ctx)` exactly once.
   - Does NOT update `analysis_snapshots`.
   - Prints a single JSON report with all required fields.
   - Queries `provider_call_logs` after the call to fetch the row id created during this run (latest row for this handle/provider=openai within last 60s).

3. Execute the script with `bun run /tmp/run-openai-validation.ts`.

4. Capture and report:
   - snapshot used
   - OpenAI-only call made: yes/no
   - resolved model
   - model returned by provider (`json.model`)
   - provider_call_logs id
   - validator result (ok / reason)
   - number of insights, insight titles
   - market evidence used: yes/no
   - evidence paths used (union of `evidence[]` across insights)
   - prompt_tokens, cached_tokens, completion_tokens, total_tokens
   - estimated_cost_usd
   - technical token leakage in title/body: yes/no (regex scan for `engagement_pct`, `tier_label`, `cache_key`, `normalized_payload`, etc.)
   - snapshot modified: no
   - ready for full fresh smoke test: yes/no

5. Delete `/tmp/run-openai-validation.ts`.

## Guardrails

- The temp script imports only `generateInsights`, `supabaseAdmin`, `computeBenchmarkPositioning`, and types. It never calls `/api/analyze-public-v1`, never invokes Apify or DataForSEO modules, and never writes to `analysis_snapshots`.
- No production source files under `src/` are edited.
- Exactly one OpenAI fetch will occur (inside `generateInsights`), which produces exactly one row in `provider_call_logs`.
- If the diagnostic shows the resolved model is not exactly `gpt-5.4-mini`, the script is not executed.
- After the run completes (success or failure), the temp script is removed and no second run is performed without explicit approval.
