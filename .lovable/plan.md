## Goal
Eliminate duplicate `report_viewed` events caused by React StrictMode, remounts and double-clicks. Keep lifecycle advancement intact.

## Approach
Apply both layers (small code impact, strong guarantee):

### 1. Client dedup — `src/routes/analyze.$username.tsx`
In `AnalyzeReady`, replace the current `useEffect([snapshotId])` fire with a `useRef<Set<string>>` guard:

```ts
const trackedSnapshotsRef = useRef<Set<string>>(new Set());
useEffect(() => {
  if (!snapshotId) return;
  if (trackedSnapshotsRef.current.has(snapshotId)) return;
  trackedSnapshotsRef.current.add(snapshotId);
  trackEvent({ data: { eventType: "report_viewed", snapshotId, handle, metadata: { variant: "public_mvp" } } }).catch(() => {});
}, [snapshotId]);
```

This survives StrictMode's double-invoke (same ref instance on remount in dev) and prevents repeated fires if `snapshotId` reference changes but value stays the same.

### 2. Server dedup — `src/lib/tracking.functions.ts`
Inside the `handler`, only when `eventType === "report_viewed"` and `snapshotId` is present:

- After resolving `leadId`, query `product_events`:
  ```
  select id from product_events
  where event_type = 'report_viewed'
    and snapshot_id = :snapshotId
    and (lead_id is not distinct from :leadId)
    and created_at > now() - interval '5 seconds'
  limit 1
  ```
- If a row is found: skip insert and skip lifecycle update, return `{ ok: true, deduped: true }`.
- Otherwise proceed with current insert + lifecycle logic.

Lifecycle is safe to skip on dedup hit because either (a) the previous event in the 5s window already advanced it, or (b) it was already past `relatorio_visto` (the helper is no-op).

Wrap the dedup query in try/catch — on failure, fall through to insert (fail open, never block tracking).

## Out of scope
- No schema changes, no DB index changes (5s lookup uses existing `snapshot_id` filter; product_events already indexed on snapshot_id per prior migrations — verify only).
- No UI changes.
- No cleanup of historical duplicates.
- No changes to other event types.

## Files
- `src/routes/analyze.$username.tsx` — add `useRef` guard around `trackEvent` call
- `src/lib/tracking.functions.ts` — add 5s server-side dedup branch for `report_viewed`

## Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual: open `/analyze/frederico.m.carvalho`, query `product_events` for last 10s → expect 1 row; confirm lifecycle moved to `relatorio_visto`; reopen >5s later → new row inserted.
