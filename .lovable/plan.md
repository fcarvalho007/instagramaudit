
# Verify Lead Magnet Sequence — Operational DB Audit

## Goal
Confirm with live data (read-only) whether the lead magnet email sequence is working, and whether recent zero-send periods are explained by returning leads with pre-existing `report_requests` (expected) vs. a real blocker (unexpected).

## Approach
All work happens through `supabase--read_query`. No writes, no Brevo calls, no emails, no code changes.

## Queries

### Q1 — Lead magnet skips (last 30 records)
```sql
SELECT created_at, lead_id, handle, metadata
FROM product_events
WHERE event_type = 'lead_magnet_sequence_skipped'
ORDER BY created_at DESC
LIMIT 30;
```
Extract: reason flag from `metadata` (e.g. `NO_MARKETING_CONSENT`, `RETURNING_LEAD`, `ALREADY_HAS_REQUEST`). Date-bucket to see if `NO_MARKETING_CONSENT` skips stopped after the audit cutoff.

### Q2 — Report summary email outcomes (last 30 each)
```sql
SELECT created_at, event_type, lead_id, snapshot_id, metadata
FROM product_events
WHERE event_type IN (
  'report_summary_email_sent',
  'report_summary_email_failed',
  'report_summary_skipped_no_data'
)
ORDER BY created_at DESC
LIMIT 60;
```
Extract: ratio sent / failed / skipped over last 7d and 24h. Inspect `metadata` of failures for error codes.

### Q3 — Unlocks vs report_request creation
```sql
SELECT created_at, event_type, lead_id, snapshot_id, metadata
FROM product_events
WHERE event_type IN ('unlock_completed', 'report_saved_to_account')
ORDER BY created_at DESC
LIMIT 60;
```
Plus, for each unlock_completed lead in the last 7d:
```sql
SELECT lead_id, COUNT(*) AS rr_count, MIN(created_at) AS first_rr, MAX(created_at) AS last_rr
FROM report_requests
WHERE lead_id IN (<recent unlock lead_ids>)
GROUP BY lead_id;
```
Determine for each recent unlock: was a new `report_request` created at/after the unlock, or did the lead already have one? Cross-reference to Q1/Q2.

### Q4 — Brevo sync outcomes (last 30 each)
```sql
SELECT created_at, event_type, lead_id, metadata
FROM product_events
WHERE event_type IN (
  'brevo_contact_synced',
  'brevo_contact_sync_failed',
  'brevo_contact_sync_skipped'
)
ORDER BY created_at DESC
LIMIT 60;
```
Extract: whether `metadata.marketing_consent` is being sent as `false` for non-consenting leads (proves the audit claim), and any failure error codes.

### Q5 — Sanity check on event_type vocabulary
```sql
SELECT event_type, COUNT(*) AS n, MAX(created_at) AS last_seen
FROM product_events
WHERE created_at > now() - interval '14 days'
GROUP BY event_type
ORDER BY last_seen DESC;
```
Confirms exact event names exist (catches typos like `report_summary_email_sent` vs `report_summary_sent`).

## Decision matrix

For each question, derive a YES/NO from Q1-Q5:

| Question | Signal |
|---|---|
| NO_MARKETING_CONSENT skips historical only? | Q1 — latest `NO_MARKETING_CONSENT` timestamp vs audit cutoff |
| Recent unlocks = returning leads with existing RR? | Q3 — share of unlocks where lead already had ≥1 RR before unlock |
| report-summary sent for new RRs? | Q2 — recent `report_summary_email_sent` count > 0 |
| Brevo sync happens with consent=false? | Q4 — recent `brevo_contact_synced` rows with `marketing_consent=false` |
| Any current blocker? | Q2 failures + Q4 failures + any unexpected skip reason |

## Output

A single GO/NO-GO table:
- 5 question answers (YES/NO + 1-line evidence)
- Verdict: GO (sequence healthy, recent zero sends explained by returning-lead pattern) **or** NO-GO with exact cause (e.g. "all `report_summary_email_failed` since X with reason Y") and the next fix to apply.

## Constraints respected
- Read-only (`supabase--read_query` only)
- No code edits, no Brevo calls, no email sends, no mutations
- 5 queries total, no provider calls

## Checkpoint
☐ Q1 skips collected and date-bucketed
☐ Q2 summary email outcomes counted
☐ Q3 unlocks correlated with report_requests
☐ Q4 Brevo sync outcomes verified (incl. consent=false)
☐ Q5 vocabulary confirmed
☐ GO/NO-GO delivered with evidence
