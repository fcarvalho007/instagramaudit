## Goal

Stop the public snapshot endpoint from passively returning paid-only enriched fields (insights v1/v2, visual cover, caption semantic, comment intelligence, market signals) inside `normalized_payload` when the caller is not Pro. Response-level sanitisation only — no schema, no storage, no provider, no entitlement, no checkout changes.

## Where the leak is

`/analyze/$username` (browser) → `GET /api/public/analysis-snapshot/$username` → returns `data.normalized_payload` as `snapshot.payload` **verbatim** (see `src/routes/api/public/analysis-snapshot.$username.ts:79-97`).

`SnapshotPayload` (typed in `src/lib/report/snapshot-to-report-data.ts:118-201`) declares optional paid fields:
- `ai_insights_v1`
- `ai_insights_v2`
- `visual_cover_analysis`
- `caption_semantic_analysis`
- `market_signals_free`
- `market_signals_paid`
- `comment_intelligence` (read as `(payload as { comment_intelligence?: … }).comment_intelligence`)

`/api/analyze-public-v1` (the other public path) already projects only `profile / content_summary / competitors / posts / format_stats / enrichment_status` into its response (`src/routes/api/analyze-public-v1.ts:1435-1483`) — it does NOT spread paid fields. ✅ No change needed there.

The admin/Lab UIs use `/api/admin/snapshot/...` and `/api/admin/snapshot-by-id/...`, not the public endpoints. ✅ Not affected by this fix.

## Plan

### Step 1 — New helper (pure, no IO)

Create `src/lib/report/sanitize-snapshot.ts`:

```ts
export type SnapshotAccessLevel = "free" | "pro" | "internal_lab";

/**
 * Paid-only fields stripped from the public snapshot payload before it
 * leaves the server for Free callers. Keep this list aligned with
 * `SnapshotPayload` and any future enrichment additions.
 */
export const PAID_SNAPSHOT_FIELDS = [
  "ai_insights_v1",
  "ai_insights_v2",
  "visual_cover_analysis",
  "caption_semantic_analysis",
  "comment_intelligence",
  "market_signals_free",
  "market_signals_paid",
] as const;

export function sanitizeSnapshotForAccessLevel<T extends Record<string, unknown>>(
  payload: T,
  accessLevel: SnapshotAccessLevel,
): T {
  if (accessLevel === "pro" || accessLevel === "internal_lab") return payload;
  // Free: shallow clone and drop paid fields. Does NOT mutate the input,
  // so the DB row / cached object is untouched.
  const next = { ...payload };
  for (const key of PAID_SNAPSHOT_FIELDS) {
    if (key in next) delete (next as Record<string, unknown>)[key];
  }
  return next;
}
```

Notes:
- Pure function, no Supabase, no cookies — safe to unit-test and reuse from any future public read path.
- Free retains everything else the UI needs: `profile`, `content_summary`, `format_stats`, `posts`, `competitors`, `enrichment_status` (so the v2 pending placeholders keep working), and any deterministic metric blocks already on the snapshot.

### Step 2 — Wire it into `/api/public/analysis-snapshot/$username`

Edit `src/routes/api/public/analysis-snapshot.$username.ts`:

1. Add imports:
   ```ts
   import { readLeadIdFromRequest } from "@/lib/leads/lead-cookie.server";
   import { hasEntitlement } from "@/lib/payments/entitlements.server";
   import {
     sanitizeSnapshotForAccessLevel,
     type SnapshotAccessLevel,
   } from "@/lib/report/sanitize-snapshot";
   ```

2. Inside `GET: async ({ params, request }) => { … }` after loading `payload`:
   ```ts
   let accessLevel: SnapshotAccessLevel = "free";
   try {
     const leadId = readLeadIdFromRequest(request);
     if (leadId && (await hasEntitlement(leadId, "report_full_9"))) {
       accessLevel = "pro";
     }
   } catch {
     // Fail-closed: any cookie/DB error keeps the caller on Free.
     accessLevel = "free";
   }

   const sanitizedPayload = sanitizeSnapshotForAccessLevel(payload, accessLevel);
   // `benchmark` is built from the original payload (only reads
   // profile + content_summary, no paid fields) — unchanged.
   ```

3. Return `payload: sanitizedPayload` (everything else identical).

This is the only behavioural change. Pro carriers (lead cookie + `report_full_9` entitlement) get the full payload; everyone else gets the scrubbed one.

### Step 3 — Leave `/api/public/analysis-snapshot/by-id/$snapshotId` alone

This route is consumed by `src/routes/report.print.$snapshotId.tsx`, which is the print target for the PDFShift PDF renderer (Pro-only output). PDFShift calls the print URL from its own infra — it does NOT carry a `lead_session` cookie, so cookie-based entitlement derivation would falsely scrub the payload and break Pro PDFs. Sanitising this path correctly requires a signed-URL or shared-secret scheme (separate scope, listed under "Follow-ups" below). Today's change does not touch it.

### Step 4 — Sanity tests (no provider / payment / credit / schema changes)

Add `src/lib/report/__tests__/sanitize-snapshot.test.ts` covering:
- Free strips all 7 paid fields and leaves the rest intact.
- Pro returns the payload reference unchanged.
- Internal Lab returns the payload reference unchanged.
- Sanitisation is non-mutating (original object still has the fields).
- Missing paid fields don't throw.

## Files changed

| File | Change |
|---|---|
| `src/lib/report/sanitize-snapshot.ts` | **new** — pure helper + access-level type. |
| `src/lib/report/__tests__/sanitize-snapshot.test.ts` | **new** — unit tests. |
| `src/routes/api/public/analysis-snapshot.$username.ts` | derive `accessLevel` from lead cookie + entitlement; sanitise `payload` before returning. |

Nothing else is touched. No schema, no migrations, no admin routes, no Pro report components, no checkout, no EuPago, no credits.

## Fields scrubbed for Free

- `ai_insights_v1`
- `ai_insights_v2`
- `visual_cover_analysis`
- `caption_semantic_analysis`
- `comment_intelligence`
- `market_signals_free`
- `market_signals_paid`

Free **keeps**: `profile`, `content_summary`, `format_stats`, `posts`, `competitors`, `enrichment_status`, and any deterministic metric blocks the snapshot already carries.

## How Pro / Internal Lab bypass sanitisation

- **Pro**: derived server-side from the signed `lead_session` cookie + `hasEntitlement(leadId, "report_full_9")` (existing helper in `src/lib/payments/entitlements.server.ts`). When true, `sanitizeSnapshotForAccessLevel(payload, "pro")` returns the payload unchanged.
- **Internal Lab**: the Lab/admin UI fetches `/api/admin/snapshot/...` and `/api/admin/snapshot-by-id/...`, which are separate routes never touched here. The helper still accepts `"internal_lab"` so any future admin caller wanting to reuse the public route can opt out of scrubbing explicitly.

## Storage invariant

`sanitizeSnapshotForAccessLevel` does `{ ...payload }` and `delete next.<key>`. The original `payload` object (and therefore `analysis_snapshots.normalized_payload`) is never mutated. No `UPDATE` is issued by the route. Storage stays exactly as written by the enrichment pipeline.

## Manual validation checklist

1. **Old pre-gate snapshot, anonymous (no cookie)**
   `curl https://auditprofiles.com/api/public/analysis-snapshot/<old-handle> | jq '.snapshot.payload | keys'`
   → expect: no `ai_insights_v1/v2`, no `visual_cover_analysis`, no `caption_semantic_analysis`, no `comment_intelligence`, no `market_signals_*`.
2. **Free UI smoke**: `/analyze/<old-handle>` still renders Visão geral + Engagement + 5 PremiumTeaserCards + sidebar. No console errors.
3. **Pro UI smoke**: log in with a lead that holds `report_full_9` entitlement, hit the same handle, confirm Diagnóstico editorial + Prioridades + cover/caption sections still render. Use DevTools → Network → response preview to confirm `ai_insights_v2`, `visual_cover_analysis`, `caption_semantic_analysis` are present.
4. **Lab smoke**: open `/admin/report-lab?h=<handle>` (admin auth required) — confirms it still uses `/api/admin/snapshot/...` and renders the full payload.
5. **DB invariant**: `select id, jsonb_object_keys(normalized_payload) from analysis_snapshots where instagram_username = '<handle>' order by created_at desc limit 1;` before and after — keys identical (storage not mutated).
6. **PDF print smoke** (sanity, even though that route is unchanged): regenerate a Pro PDF and confirm the cover/insights sections still render — proves Step 3's decision to leave `by-id` alone was correct.

## Follow-ups (out of scope today)

- Apply the same sanitisation to `/api/public/analysis-snapshot/by-id/$snapshotId` once a signed-URL or shared-secret scheme exists for PDFShift; otherwise the by-id route remains a leak for anyone who can guess a snapshot UUID.
- Extend `PAID_SNAPSHOT_FIELDS` whenever a new enrichment is added to `SnapshotPayload` (add a TODO comment in `snapshot-to-report-data.ts` pointing at the helper).
