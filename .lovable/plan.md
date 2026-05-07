
# Product Event Tracking for Beta

## 1. Schema

Single table `product_events`:

```
product_events
├── id              uuid PK default gen_random_uuid()
├── event_type      text NOT NULL
├── lead_id         uuid nullable
├── snapshot_id     uuid nullable
├── handle          text nullable (Instagram handle, lowercased)
├── actor_hash      text nullable (SHA-256 of email — no raw PII)
├── metadata        jsonb NOT NULL default '{}'
├── created_at      timestamptz NOT NULL default now()
```

RLS disabled (admin-only table, accessed via `supabaseAdmin` in server functions). No user-facing reads.

Index on `(event_type, created_at DESC)` for admin queries.

## 2. Event catalogue

| Event | Fires where | lead_id | snapshot_id | handle | metadata |
|---|---|---|---|---|---|
| `beta_request_created` | `submitBetaRequest` server fn | ✓ | — | ✓ | `{user_type, purpose, profile_ownership}` |
| `report_generated` | analysis pipeline (after snapshot created) | ✓ if exists | ✓ | ✓ | `{data_source, duration_ms}` |
| `report_viewed` | `analyze.$username.tsx` on successful render | — | ✓ | ✓ | `{variant, referrer}` |
| `public_report_link_copied` | share action in ReportShellV2 | — | ✓ | ✓ | `{}` |
| `pro_teaser_clicked` | Pro teaser CTA click | — | ✓ | ✓ | `{module}` |
| `feedback_started` | feedback banner open | — | ✓ | ✓ | `{}` |
| `feedback_submitted` | feedback form submit | — | ✓ | ✓ | `{rating, comment_length}` |
| `pricing_clicked` | beta form step 3 pricing section click | ✓ | — | ✓ | `{plan_clicked}` |
| `email_clicked` | email CTA in report | — | ✓ | ✓ | `{cta_location}` |
| `module_visibility_published` | admin publish override action | — | — | — | `{variant, changed_modules}` |

## 3. Where each event fires

**Server-side (in server functions, via `supabaseAdmin`):**
- `beta_request_created` — inside `submitBetaRequest` after successful insert
- `report_generated` — in analysis pipeline after snapshot creation
- `module_visibility_published` — in `publishDraft` server function

**Client-side (fire-and-forget `fetch` to a lightweight server function):**
- `report_viewed` — `useEffect` in `AnalyzePage` after report renders
- `public_report_link_copied` — in share action handler
- `pro_teaser_clicked` — in Pro teaser CTA `onClick`
- `feedback_started` / `feedback_submitted` — in feedback banner handlers
- `pricing_clicked` — in beta form pricing card click
- `email_clicked` — in report email CTA

Client events call a single `trackEvent` server function that accepts `{event_type, snapshot_id?, handle?, metadata?}` and writes via `supabaseAdmin`. No auth required — the function is public but write-only, rate-limited by event type.

## 4. Privacy notes

- **No raw email stored** in `product_events`. Use `actor_hash` (SHA-256 of lowercased email) for correlation without PII.
- `handle` is public Instagram data, not PII under GDPR for public profiles.
- `metadata` must never contain email, IP, or user agent — only behavioral signals.
- `lead_id` links to `leads` table which does store email — access restricted to admin.
- Retention: add a `expires_at` or periodic cleanup policy (e.g. 12 months) before public launch.
- Privacy policy already covers analytics data collection for service improvement.

## 5. Implementation plan

**Prompt 1** — Migration: create `product_events` table with index. No RLS (admin-only).

**Prompt 2** — Server function: `trackEvent` in `src/lib/tracking.functions.ts` — accepts event data, validates with Zod, writes via `supabaseAdmin`. Fire-and-forget pattern (no await on client side).

**Prompt 3** — Wire server-side events: add `trackEvent` calls to `submitBetaRequest`, analysis pipeline, and `publishDraft`.

**Prompt 4** — Wire client-side events: add `trackEvent` calls to report view, share, Pro teaser, feedback, pricing click.

**Prompt 5** — Admin query panel: simple event log viewer in `/admin` (optional, can defer).

## 6. Files to create/modify

| File | Action |
|---|---|
| Migration | New `product_events` table |
| `src/lib/tracking.functions.ts` | New — `trackEvent` server function |
| `src/lib/tracking.server.ts` | New — server-side helper for direct inserts |
| `src/lib/beta.functions.ts` | Add `beta_request_created` event |
| `src/routes/analyze.$username.tsx` | Add `report_viewed` event |
| `src/components/report-share/use-report-share-actions.ts` | Add `public_report_link_copied` event |
| `src/components/beta/beta-request-form.tsx` | Add `pricing_clicked` event |
