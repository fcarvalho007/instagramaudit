### Goal
Emit a `lead_magnet_sequence_not_invoked` product event when `processReportUnlock` finds an existing report_request so the lead magnet sequence is not invoked. This improves observability so returning leads / repeated unlocks are visible in admin/event logs instead of looking like a silent failure.

### Changes

#### 1. `src/lib/unlock.server.ts` — emit observability event
In the `else` branch where `createdReportRequest === false` (existing report_request found), add a `recordProductEvent` call **before** the `unlock_completed` event block:

- `eventType`: `"lead_magnet_sequence_not_invoked"`
- `leadId`: existing lead id
- `snapshotId`: `data.analysis_snapshot_id`
- `handle`: `data.instagram_username`
- `metadata`:
  ```ts
  {
    reason: "returning_lead_existing_report_request",
    lead_id: leadId,
    report_request_id: reportRequestId,
    analysis_snapshot_id: data.analysis_snapshot_id,
    email_normalized: emailNormalized,
    transactional_delivery: false,
  }
  ```

This event is placed **after** the report_request upsert logic and **before** `unlock_completed`, so the `reportRequestId` is always set.

No Brevo, no email, no analysis logic is touched.

#### 2. `src/lib/__tests__/unlock.server.test.ts` — new test file
Test the new observable behaviour with a mocked `supabaseAdmin`:

- **Test: "existing report_request emits `lead_magnet_sequence_not_invoked`"**
  - Mock `from("analysis_snapshots")` → row exists.
  - Mock `from("leads")` → existing lead (returning lead).
  - Mock `from("report_requests")` → existing row for `(lead_id, snapshot_id)`.
  - Call `processReportUnlock`.
  - Assert `recordProductEvent` was called with `eventType: "lead_magnet_sequence_not_invoked"` and correct metadata fields (`reason`, `lead_id`, `report_request_id`, `analysis_snapshot_id`, `email_normalized`, `transactional_delivery: false`).
  - Assert `sendLeadMagnetSequence` is never imported/called.

- **Test: "new report_request does NOT emit `lead_magnet_sequence_not_invoked`"**
  - Same mocks but `report_requests` returns no row.
  - Assert `recordProductEvent` was never called with `eventType: "lead_magnet_sequence_not_invoked"`.

#### 3. Validation
- `bunx tsc --noEmit`
- `bunx vitest run`

### No database changes
`product_events.event_type` is a plain `text` column (no enum or CHECK constraint), so the new event name does not require a migration.