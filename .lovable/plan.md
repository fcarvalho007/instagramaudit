# QA Plan — Pro Pending-Enrichment Placeholders

**Target:** `https://auditprofiles.com` (production).
**No code, schema, pricing, EuPago, credit, entitlement, or report-calc changes.**
**Provider calls:** none triggered — only existing cached snapshots are read.
**DB writes:** scoped to `analysis_snapshots.normalized_payload.enrichment_status` via the existing `set_enrichment_status(uuid, text, text)` RPC, with strict revert at end. No new rows, no schema change.

> Heads-up: a prior audit found production runs an older build than preview. If `report-diagnostic-block.tsx`'s `EnrichmentPlaceholderCard` paths are not deployed there, all pending/error checks will visually fall back to whatever the older build renders. I will report this distinctly per state.

---

## 0 — Pre-flight (read-only)

- Confirm `report-diagnostic-block.tsx` is the only renderer using `getEnrichmentState` + `EnrichmentPlaceholderCard` (already verified — covers visual_cover, caption_semantic, insights_v2).
- Confirm i18n keys present in PT report bundle: `pending.cover.title/body`, `pending.caption.title/body`, `pending.insights.title/body`, `pending.error.body`.
- Snapshot inventory (already collected):
  - `100xengineers` `f9fb5f2b…` — all enrichments `success` → success-state baseline.
  - `lfmnz` `cbe8fb5d…` — `visual_cover=error`, `insights_v2=error`, `insights_v1=pending` → covers error states + does NOT require a write.
  - Pending flips needed for: `visual_cover=pending`, `caption_semantic=pending`, `insights_v2=pending`.

---

## 1 — Snapshot flips (write, revert at end)

For each pending state I flip ONE snapshot via the existing security-definer RPC `set_enrichment_status(snapshot_id, key, value)`, screenshot, then revert to the original value in the SAME pass.

| State to test | Snapshot | Field | Set to | Revert to |
|---|---|---|---|---|
| visual_cover pending | `webhspt` `28702b3d…` | `visual_cover` | `pending` | `success` |
| caption_semantic pending | `robs.cortez` `3cd9340c…` | `caption_semantic` | `pending` | `success` |
| insights_v2 pending | `pedrocaramez` `5e23f34f…` | `insights_v2` | `pending` | `error` (original) |

I record original values before each flip and confirm the revert with a SELECT before moving on. If any revert fails, I STOP and report which snapshot is in a flipped state so you can manually reset.

A safety net: at the end of the whole pass, one final SELECT prints `enrichment_status` for all three snapshots so you can independently confirm they were restored.

> **Important caveat:** the placeholder card only renders when the corresponding parsed payload is `null`. For snapshots where `visual_cover` / `caption_semantic` payloads already exist (`success` originally), flipping the status to `pending` will NOT show the placeholder because `coverAnalysis !== null` (see `report-diagnostic-block.tsx:154,183`). I will note this and, if needed, additionally probe a snapshot whose payload is truly absent (or document it as a known guard so the user knows the placeholder is only shown when there is genuinely no data to display).

---

## 2 — Visual checks on production

For each scenario I open `https://auditprofiles.com/analyze/<handle>` in the browser and screenshot the Pro `#diagnostico` section. No login is required because these are cached snapshots and the analyze route is public.

| # | Scenario | Handle | Expected copy / behaviour |
|---|---|---|---|
| 1 | visual_cover pending | webhspt (flipped) | Card titled "A preparar análise das capas…" with calm body, no empty layout. (subject to caveat above) |
| 2 | caption_semantic pending | robs.cortez (flipped) | "A preparar leitura das legendas…", calm body. |
| 3 | insights_v2 pending | pedrocaramez (flipped) | "A preparar síntese editorial…"; if deterministic priorities exist they still render below. |
| 4a | visual_cover error | lfmnz (live) | Calm error placeholder copy, no broken layout. |
| 4b | caption_semantic error | n/a live | Static-only verdict (no live error snapshot for this key). |
| 4c | insights_v2 error | any (live) | Calm error placeholder copy, no broken layout. |
| 5 | All success | 100xengineers | Real Capas / Legendas / Insights cards render; no placeholder visible. |
| 6 | Free render | 100xengineers, no `?pro=` | Teasers visible, NO "A preparar…" copy (helper short-circuits via `isFree`). |
| 7 | Lab | `/admin` lab path or whichever lab route shows the diagnostic block | Same placeholders render (helper does not gate on `isLab`). |

Each row gets a PASS / FAIL / CODE-OK-NOT-EXERCISED / DEPLOYMENT-MISMATCH verdict. If production is on an older build, I will retry the same scenario on preview to distinguish a code bug from a deploy lag, and report both.

---

## 3 — Output

1. PASS/FAIL table for all 7 scenarios with screenshots.
2. Exact copy observed vs expected (PT).
3. Any visual issue (overflow, broken grid, missing eyebrow, contrast).
4. Production vs preview parity note where it matters.
5. Final `enrichment_status` snapshot for the 3 flipped rows confirming full revert, plus the `credit_ledger` row count before/after as a sanity check (no credit should move).
6. Explicit "not exercised" list with reasons.

No file edits. No new rows in any table. No payment / entitlement / pricing / credit / schema mutation.
