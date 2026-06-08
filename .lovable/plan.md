# Link `credit_ledger` to `analysis_events` — schema + lifecycle plan

## Answers to the questions

1. **Should `credit_ledger` get `analysis_event_id`?** Yes — nullable, FK to `analysis_events(id)` `ON DELETE SET NULL`. It is the only deterministic join between billing and analytics.
2. **When does the analysis_event exist vs reserve/confirm?** Today the order is `reserveCredit` → analysis runs → `recordAnalysisEvent` (returns `eventId`) → `confirmReservation`/`releaseReservation`. So the event id is **not** known at reserve time; it is known at confirm/release time.
3. **Reservation, success, or both?** Link **both**: write the new `analysis_event_id` on the confirm/release row, and **back-update** the matching reserve row (`UPDATE credit_ledger SET analysis_event_id = $1 WHERE reservation_id = $2 AND analysis_event_id IS NULL`). A single ledger-scan per `reservation_id` then yields the event without time-window joins.
4. **What happens on release/refund?** Same shape — the release row carries `analysis_event_id` (the event that caused the release, even when `outcome != success`). For `duplicate` reservations (the request that lost the race), we link them to the analysis_event of the duplicate request only when an event was emitted for it; otherwise leave NULL.
5. **Backfill?** Best-effort, recorded with confidence in `metadata.backfill_confidence`. High-confidence only: exact `(lead_id, cache_key)` match between ledger row and analysis_events within ±5 minutes. Anything weaker stays NULL.
6. **Which admin UI consumes the link?** `/admin/clientes` lead detail recent activity (already lists ledger + events; switch to the FK), `/admin/relatorios` drawer (show ledger rows tied to the event), `/admin/sistema` cost breakdown row (badge "Charged 1 credit" linked to ledger), and the lead credit activity endpoint `lead-credit-activity.$id.ts`.

## Recommended schema migration (single migration, single PR)

```sql
ALTER TABLE public.credit_ledger
  ADD COLUMN analysis_event_id uuid NULL
  REFERENCES public.analysis_events(id) ON DELETE SET NULL;

CREATE INDEX idx_credit_ledger_analysis_event
  ON public.credit_ledger (analysis_event_id)
  WHERE analysis_event_id IS NOT NULL;
```

No new GRANT needed (existing table grants cover the new column). No RLS change. No CHECK constraint, no trigger.

## Affected functions / files

| File | Change |
| --- | --- |
| `src/lib/credits/credits.server.ts` | Add optional `analysisEventId` to `confirmReservation` / `releaseReservation` inputs. Inside each, (a) include `analysis_event_id` in the new ledger insert and (b) issue an UPDATE on the prior `reserve` row by `reservation_id` to set the same `analysis_event_id` when NULL. |
| `src/routes/api/analyze-public-v1.ts` | `finalizeCredit()` already has access to the analysis_event id flow indirectly via `logEvent` — capture the returned `eventId` from the *terminal* `logEvent` call (success/cache/stale/failure) into a local `lastEventId` and pass it to `confirmReservation`/`releaseReservation`. No reorder of the lifecycle. |
| `src/lib/analysis/events.ts` | No change. Already returns `eventId`. |
| `src/routes/api/admin/lead-credit-activity.$id.ts` | Select `analysis_event_id` and expose it; UI can render an "Evento" link / chip. |
| `src/routes/api/admin/report-detail.$id.ts` | Include ledger rows joined by `analysis_event_id` for the event-centric drawer. |
| `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` | When rendering ledger rows, show the event link when `analysis_event_id` is present (replacing today's heuristic by handle+time). |
| `src/lib/credits/__tests__/credits.test.ts` | Add tests covering the back-update + confirm-with-event-id + release-with-event-id. |

Out of scope for this PR (documented but not implemented yet):
- Changing `record_analysis_event` RPC signature.
- Reordering the analyze pipeline so reserve happens *after* the event id.
- Migrating `reservation_id` to FK on anything.
- Reservation expiry / TTL.

## Event lifecycle (target)

```text
Request → cache+entitlement gate → reserveCredit (-1, reason=reserve, reservation_id=R, event_id=NULL)
                                       │
                                       ▼
                               run analysis (cache/fresh/stale/fail)
                                       │
                                       ▼
                             logEvent(...) → eventId=E (analysis_events row)
                                       │
                                       ▼
              ┌──────────── success / cache / stale ────────────┐
              │                                                  │
              ▼                                                  ▼
   confirmReservation({ R, E, snapshotId })          releaseReservation({ R, E, reason })
     INSERT  delta=0,  reason=confirm,  event_id=E    INSERT delta=+1, reason=release, event_id=E
     UPDATE  reserve row (R) SET event_id=E           UPDATE reserve row (R) SET event_id=E
              │                                                  │
              ▼                                                  ▼
       balance unchanged                                 balance restored
```

Failure paths inside `finalizeCredit` keep their current behaviour: any throw still produces a release; we just attach the most recent `lastEventId` (may be null for very early `invalid_input` before any event was logged — in that case ledger stays unlinked, which is correct).

## Rollback plan

1. Revert the application PR (no behaviour change without it; ledger column simply becomes unused).
2. The schema migration is additive — to fully roll back run:
   ```sql
   DROP INDEX IF EXISTS public.idx_credit_ledger_analysis_event;
   ALTER TABLE public.credit_ledger DROP COLUMN IF EXISTS analysis_event_id;
   ```
   No data loss for `credit_ledger` core columns. Historical link data is lost (acceptable — derived data).
3. Forward-compat: leaving the column NULL is safe; old code ignores it.

## Backfill strategy (separate, opt-in script)

Recorded under `metadata.backfill = { source, confidence, run_at }`. Never overwrite existing non-NULL links. Run in two passes against rows where `analysis_event_id IS NULL`:

**Pass A — high confidence (auto, idempotent):** match by `reservation_id`. After the app PR ships, every new confirm/release is linked AND back-fills the reserve row. For historical rows, group ledger rows by `reservation_id`; if any sibling carries an `analysis_event_id` (e.g. confirm written after the PR), copy it to siblings. This catches anything written during the deploy gap.

**Pass B — best-effort historical (manual approval):**
```sql
WITH candidates AS (
  SELECT l.id AS ledger_id, e.id AS event_id
  FROM public.credit_ledger l
  JOIN public.leads ld ON ld.id = l.lead_id
  JOIN public.analysis_events e
    ON lower(e.handle) = lower(l.handle)
   AND e.cache_key   = l.cache_key
   AND e.created_at BETWEEN l.created_at - interval '5 minutes'
                        AND l.created_at + interval '5 minutes'
  WHERE l.analysis_event_id IS NULL
    AND l.cache_key IS NOT NULL
    AND l.reason IN ('reserve','confirm','release')
)
-- Inspect first; only UPDATE rows with exactly one candidate per ledger_id.
UPDATE public.credit_ledger l
SET analysis_event_id = c.event_id,
    metadata = l.metadata || jsonb_build_object(
      'backfill', jsonb_build_object(
        'source','script_v1','confidence','exact_cache_key_5min','run_at', now()))
FROM candidates c
WHERE c.ledger_id = l.id
  AND (SELECT count(*) FROM candidates c2 WHERE c2.ledger_id = c.ledger_id) = 1;
```

Anything ambiguous (multiple events) stays NULL. No fuzzy / time-only matches. Admin UI must continue to handle `analysis_event_id IS NULL` gracefully.

## Test plan

1. Unit (`credits.test.ts`):
   - `confirmReservation({ analysisEventId })` writes confirm row with the id AND back-updates the reserve row.
   - `releaseReservation({ analysisEventId })` same shape for release.
   - Calling confirm/release without `analysisEventId` keeps current behaviour (NULL on both rows) — backward compatible.
   - Concurrent reserve+release sequence: only one reservation row gets the event_id; the compensating release row gets none.
2. Integration (`analyze-public-v1-credit-gate.test.ts` + a new case):
   - Fresh-success path → confirm row + reserve row both reference the analysis_event.
   - Cache-hit (already associated, `skipReserve`) → no ledger row touched, no link needed.
   - Cache-hit (new lead, `skipReserve=false`) → confirm row + reserve row linked.
   - Provider-error path → release row + reserve row both linked.
   - `WINDOW_REQUIRES_PRO` / `INSUFFICIENT_CREDITS` → no reserve happens, so nothing to link (assert column stays NULL on the `blocked_credits` event).
   - `duplicate` reservation outcome → no new ledger rows; assert no orphan link is created.
3. Manual read-only SQL after deploy:
   ```sql
   SELECT reason, count(*) FILTER (WHERE analysis_event_id IS NOT NULL) AS linked,
          count(*) AS total
   FROM public.credit_ledger
   WHERE created_at >= now() - interval '7 days'
   GROUP BY reason;
   ```
   Expect `reserve`/`confirm`/`release` linkage ≥ 95% post-deploy; `initial_grant`/`admin_adjust` remain NULL (no event by design).

## What to NOT implement yet

- No FK between `credit_ledger.reservation_id` and a new `credit_reservations` table.
- No reordering of reserve→event (would change the entire credit gate; unnecessary for this link).
- No exposure of `analysis_event_id` in any public API or PDF.
- No backfill of `initial_grant`, `admin_adjust`, `purchase_included_credit`, or `post_purchase_beta_bonus` rows (they have no analysis_event by definition).
- No schema change to `analysis_events` (the link is one-directional: ledger → event).
- No change to checkout, EuPago, pricing, Free/Public report, competitor comparison UI.
