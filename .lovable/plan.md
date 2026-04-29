## Goal

Run exactly ONE OpenAI call against the existing snapshot `b2d453cd-c269-407b-8a83-720e4f2baa50` for `frederico.m.carvalho` to confirm the fixed prompt + validator + `gpt-5.4-mini` produce a valid `ai_insights_v1`. Do not modify production code, do not invalidate or persist into the snapshot, do not call Apify or DataForSEO.

## Snapshot confirmation (already verified, read-only)

- snapshot_id: `b2d453cd-c269-407b-8a83-720e4f2baa50`
- created_at: 2026-04-29 13:04:17Z, status: ready
- has profile: yes
- has content_summary: yes
- posts: 12
- has competitors: yes
- has market_signals_free: yes, status = ready
- has ai_insights_v1: no (so a new run won't overwrite anything)
- benchmark NOT precomputed in payload — needs to be computed at runtime via `computeBenchmarkPositioning(...)` against `benchmark_references` (same as production)

## Execution (default mode, after approval)

1. Create a throwaway script `/tmp/validate-insights.ts` (NOT committed, not under `src/`). It will:
   - Read the snapshot row via `supabaseAdmin` (read-only `select`).
   - Read active `benchmark_references` rows (read-only `select`).
   - Reconstruct `InsightsContext` exactly like `analyze-public-v1.ts` (lines 834–879):
     - `profile`, `content_summary` from payload
     - `top_posts`: top 3 posts by `engagement_pct`, mapped to `{format,likes,comments,engagement_pct,caption_excerpt}`
     - `benchmark`: `computeBenchmarkPositioning({followers, engagement, dominantFormat}, benchmarkData)`
     - `competitors_summary`: `{count, median_engagement_pct}` computed from `payload.competitors[]` filtered by `success`
     - `market_signals`: import and call the SAME `summarizeMarketSignalsForInsights` function (will refactor briefly: see step 2)
   - Call `generateInsights(ctx)` ONCE.
   - Print: `model`, `result.ok`, `result.reason`, `result.detail`, `insights[].title`, `insights[].evidence_paths`, token usage and `estimated_cost_usd` (read from the `provider_call_logs` row created by the call).
   - Do NOT update `analysis_snapshots`.

2. `summarizeMarketSignalsForInsights` is currently a private function inside `src/routes/api/analyze-public-v1.ts`. Two options — pick whichever is cleaner:
   - **Preferred (zero prod change):** copy the function body verbatim into `/tmp/validate-insights.ts` (it is pure and self-contained). No source edit required.
   - Fallback: add a single named export to that file. Avoid unless copy is unfeasible.
   
   I will use the copy approach — no production source edits.

3. Run the script with `bun /tmp/validate-insights.ts`. The script will rely on existing env (`OPENAI_API_KEY`, `OPENAI_ENABLED`, `OPENAI_INSIGHTS_MODEL`, allowlist) — `frederico.m.carvalho` is on the allowlist per prior smoke tests.

4. Report exactly the requested format:
   - snapshot used / OpenAI-only call made / model / status / validator result / insights generated / market evidence used / tokens / estimated_cost_usd / provider_logs created / snapshot modified / ready for full fresh smoke test

## Side-effect ledger

| Side effect | Will happen? |
|---|---|
| Apify call | No |
| DataForSEO call | No |
| OpenAI call | Yes — exactly one |
| `provider_call_logs` insert (OpenAI) | Yes — one row, expected and acceptable per spec |
| `analysis_snapshots` write/update | No |
| Code change in `src/` | No |
| New committed files | No (script lives in `/tmp/`) |

## Stop conditions

- If `isOpenAiAllowed` returns false → stop, report `NOT_ALLOWED`, no spend.
- If `generateInsights` returns `ok:false` → stop, report `reason`, `detail`, validator error, the inserted `provider_call_logs.id`, tokens, cost. No retry.
- If snapshot has somehow gained `ai_insights_v1` between now and execution → stop and report (we will not overwrite).

## Deliverable

A single chat report in the exact format requested, plus the in-memory insights JSON pretty-printed for inspection. No source edits, no DB writes besides the single OpenAI provider log.
