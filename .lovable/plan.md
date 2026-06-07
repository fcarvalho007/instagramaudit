## PR1 — Pro analysis `window` backend validation

### Status: PARTIAL — static review PASS, live HTTP scenarios BLOCKED

I'm in plan mode, so I cannot issue the live `/api/analyze-public-v1` POSTs that scenarios 1–5 require (any of them would burn Apify credits and mutate `credit_ledger` / `analysis_snapshots`). I did execute the read-only checks (code inspection + DB introspection). Live HTTP requires either (a) switching to build mode, or (b) the operator running the curl commands manually with the test cookie.

There is also a **hard blocker** before scenarios 2/3/5 can run: no lead currently has the `report_full_9` entitlement, so the Pro path cannot be exercised.

---

### 1. Static code review (read-only, done now)

Files inspected:

- `src/routes/api/analyze-public-v1.ts` (1582 lines)
- `src/lib/analysis/window-configs.ts`
- `src/lib/analysis/cache.ts` (`buildCacheKey`, lines 49–60)

Findings — all PASS:

| Check | Location | Result |
|---|---|---|
| `window` Zod field, optional, validated via `isPublicWindowKind` (allows only `baseline`/`30d`/`90d`) | L131–134, L468–471 | PASS |
| Cache key suffix `:w=30d` / `:w=90d` only for wide windows; baseline → empty suffix → byte-identical to legacy key | `cache.ts` L59 + `window-configs.ts` `windowCacheSuffix` | PASS |
| Pro gate (`hasEntitlement(lead, 'report_full_9')`) runs **before** `reserveCredit` for wide windows; returns `WINDOW_REQUIRES_PRO` (HTTP 403) when missing | L559–577 | PASS — Free cannot be charged |
| Baseline path still calls `reserveCredit` exactly as before; `skipReserve` short-circuit still applies on cache+lead-owned | L578–612 | PASS — Free flow unchanged |
| PRIMARY uses `primaryWindowCfg` (window-specific Apify params); competitors stay on baseline | L972–1000 | PASS — matches PR1 scope |
| `INTERNAL_API_TOKEN` bypass skips the Pro gate (`if (!isInternalBypass)` wrapper at L544) — internal smoke calls work, but they also skip the entitlement check | L505–512, L544 | NOTE (see Risks) |

No schema / pricing / EuPago / report-rendering changes detected in PR1 diff surface.

### 2. DB state (read-only, done now)

```text
analysis_snapshots where cache_key like '%:w=%' → 0 rows
analysis_snapshots for frederico.m.carvalho     → 1 row, key "v1:frederico.m.carvalho|" (baseline)
credit_ledger last 10                            → only baseline reserves; no wide-window activity
lead_entitlements report_full_9                  → 0 rows for both fred* leads
```

Interpretation: PR1 code is deployed but has **never been exercised live**. Clean slate for validation.

### 3. Live HTTP scenarios — cannot execute in plan mode

I cannot run scenarios 1–5 here. Scenario 2 specifically requires a lead with `report_full_9` that does not yet exist in the DB.

Pre-flight required (one of the two operator leads, e.g. `7b946d45-…fredericodigital@gmail.com`):

```sql
-- Grant Pro entitlement (manual, since checkout/EuPago is out of scope)
INSERT INTO lead_entitlements (lead_id, product_code, metadata)
VALUES ('<lead_uuid>', 'report_full_9', '{"source":"manual_pr1_validation"}');

-- Top up credits to at least 2 (for scenarios 2 + 5)
INSERT INTO credit_ledger (lead_id, delta, reason, metadata)
VALUES ('<lead_uuid>', 2, 'manual_topup', '{"source":"pr1_validation"}');
```

Then, with the corresponding `lead_session` cookie attached, run scenarios 1→4 (skip 5 unless the 90d budget is acceptable). Expected post-conditions, mapped to DB queries to report back:

```sql
-- T0 = timestamp just before scenario 1
\set T0 '2026-06-07 08:30:00+00'

-- Cache keys observed
SELECT cache_key, created_at FROM analysis_snapshots
 WHERE instagram_username='frederico.m.carvalho'
   AND created_at >= :'T0' ORDER BY created_at DESC;

-- Credit deltas
SELECT created_at, delta, reason, handle, cache_key
  FROM credit_ledger WHERE lead_id='<lead>' AND created_at >= :'T0' ORDER BY 1;

-- Outcomes / error codes
SELECT created_at, handle, cache_key, outcome, error_code, data_source
  FROM analysis_events WHERE created_at >= :'T0' ORDER BY 1;

-- Apify spend
SELECT created_at, handle, status, posts_returned, estimated_cost_usd
  FROM provider_call_logs WHERE created_at >= :'T0' ORDER BY 1;

-- Enrichment fan-out
SELECT created_at, status, handle, enrichment_type
  FROM enrichment_jobs WHERE created_at >= :'T0' ORDER BY 1;
```

Expected outcomes table (re-stated for the operator):

| # | Call | Expected key | Expected ledger | Expected error_code |
|---|---|---|---|---|
| 1 | no `window` | `v1:frederico.m.carvalho\|` | reserve+confirm OR `skipReserve` (alreadyAssociated) | none |
| 2 | `window:"30d"`, Pro, 1st | `v1:frederico.m.carvalho\|mariiana.ai:w=30d` | −1 reserve + 0 confirm | none |
| 3 | `window:"30d"`, Pro, repeat | same key | `skipReserve` (no new rows) | none |
| 4 | `window:"30d"`, Free | n/a | no rows | `WINDOW_REQUIRES_PRO` (HTTP 403) |
| 5 | `window:"90d"`, Pro | `…:w=90d` | −1 reserve + 0 confirm | none |

### 4. Risks / regression notes

- **Pro gate is bypassed by `INTERNAL_API_TOKEN`** (L544 wraps the entire credit + entitlement block in `if (!isInternalBypass)`). This is intentional for admin smoke calls but means scenario 4 must be tested **without** the bearer token, or it will appear to pass for the wrong reason.
- **Cache-key migration**: zero pre-existing `:w=*` snapshots, so no risk of collision with legacy entries. Baseline key shape unchanged → existing Free snapshots remain reachable. PASS.
- **Competitor handling**: competitors deliberately stay on baseline regardless of `window`. If a future PR wants competitor windowing, both `fetchProfileWithPostsLogged(handle)` calls at L983 and the cache-key participation will need to change — not in PR1 scope.
- **No schema migration in PR1** — confirmed by the absence of any new column referenced from `analysis_snapshots`/`credit_ledger`/`analysis_events` write paths.

### 5. Recommendation

- **Do NOT advance to PR2 yet** until scenarios 1–4 are executed live and the five SQL queries above are pasted back for confirmation.
- Static review alone is not enough — the credit refund path on failure (Pro 30d that errors mid-flight) is the most likely PR1 regression and only shows up in a real Apify call.
- Next step requested from operator (or a switch to build mode):
  1. Grant `report_full_9` + 2 credits to the test lead via the two `INSERT`s above.
  2. Run scenarios 1 → 2 → 3 → 4 (skip 5 unless 90d budget approved).
  3. Paste back the five SELECT results so I can score PASS/FAIL per scenario and either green-light PR2 or open a PR1 fix.
