## Public PDF Endpoint — Snapshot-keyed, Bucket-safe

A new public route `POST /api/public/public-report-pdf` lets the `/analyze/$username` page download a PDF for the snapshot it just rendered, without going through email gating, without touching the existing `/api/generate-report-pdf` admin flow, and without exposing the private `report-pdfs` bucket directly.

### Endpoint

**Path:** `POST /api/public/public-report-pdf`
(Placed under `/api/public/*` so the published Lovable site does not require auth — see project rules.)

**Body:**
```json
{ "snapshot_id": "<uuid>" }
```

**Validation (Zod):**
```ts
z.object({ snapshot_id: z.string().uuid() })
```

**Success (200):**
```json
{
  "success": true,
  "snapshot_id": "…",
  "pdf_status": "ready",
  "signed_url": "https://…supabase.co/storage/v1/object/sign/report-pdfs/public/…",
  "expires_in": 300,
  "regenerated": false
}
```

**Failure shape:**
```json
{ "success": false, "error_code": "…", "message": "…" }
```

| `error_code` | HTTP | Trigger |
|---|---|---|
| `INVALID_PAYLOAD` | 400 | body fails Zod schema |
| `SNAPSHOT_NOT_FOUND` | 404 | no row in `analysis_snapshots` for that id |
| `MALFORMED_SNAPSHOT` | 422 | `normalized_payload` missing required fields |
| `RATE_LIMITED` | 429 | per-IP throttle exceeded (see Rate limiting) |
| `RENDER_FAILED` | 500 | `renderReportPdf` threw |
| `UPLOAD_FAILED` | 500 | Storage upload failed |
| `SIGN_FAILED` | 500 | Storage signed URL failed |

### Storage layout (separate from email-gated PDFs)

Existing `buildReportPath` keys PDFs by `report_request_id` (used by the email flow). The public flow has no `report_request`, only a snapshot. To avoid collision and to keep audit easy:

- Bucket: `report-pdfs` (existing, **private** — kept private)
- Public-flow path prefix: `public/snapshots/<YYYY>/<MM>/<snapshot_id>.pdf`
- Year/month derived from `analysis_snapshots.created_at` so the path is deterministic and idempotent regardless of when the user clicks "download".

A new helper `buildPublicSnapshotPdfPath({ snapshotId, createdAtIso })` lives next to `buildReportPath` in `src/lib/pdf/storage.ts`. The existing `buildReportPath` is **not** modified — the email-gated flow keeps writing to `reports/<YYYY>/<MM>/<report_request_id>.pdf`.

A new helper `signReportPdfUrl(path, ttlSeconds)` wraps `supabaseAdmin.storage.from(REPORT_PDF_BUCKET).createSignedUrl(path, ttl)` so callers never construct signed URLs inline.

### Idempotency / cache

The endpoint avoids re-rendering when a fresh PDF already sits at the deterministic path:

1. Resolve path from snapshot id + `created_at`.
2. Call `supabaseAdmin.storage.from(...).list("public/snapshots/<YYYY>/<MM>/", { search: "<snapshot_id>.pdf" })`.
3. If the file exists → skip render, just sign and return (`regenerated: false`).
4. Otherwise render with `renderReportPdf`, upload with `upload({ upsert: true })`, sign, return (`regenerated: true`).

Because the path is keyed on `snapshot_id` and snapshots are immutable in the existing pipeline, the cached PDF is always the right one. No DB column needed.

### Snapshot payload validation

Reuse the same `isNormalizedPayload` shape check that `/api/generate-report-pdf` uses (extract it to a tiny shared helper in `src/lib/pdf/payload-guard.ts` so both routes agree). The check verifies the minimum surface needed by `renderReportPdf`: `profile.username` (string), `content_summary` (object), `competitors` (array). Optional fields (`posts`, `format_stats`) are tolerated as `null`/missing — they only affect the Top Posts and Recommendations pages.

### Rate limiting (lightweight, in-process / table-backed)

The endpoint is public and triggers compute. To prevent abuse without adding new infra:

- **Per-IP soft throttle**: hash `getRequestIP({ xForwardedFor: true })` with SHA-256 (matches the existing `request_ip_hash` convention used in `analysis_events`).
- **Window**: 10 requests per IP per 10 minutes — tracked by counting recent rows in `analysis_events` where `outcome = 'public_pdf'` and `request_ip_hash = $1` and `created_at > now() - interval '10 minutes'`. No new table.
- **Unique-snapshot throttle**: when the cached PDF already exists at the path, count the request as a cache hit and skip the throttle check (it costs nothing). The throttle only protects render+upload.
- Returns `429 RATE_LIMITED` with `Retry-After: 600` header.

If rate-limit lookup itself fails, fail-open (log + allow) rather than block users on observability errors.

### Logging

Each request appends a row to `analysis_events` via `record_analysis_event` (the existing RPC). This piggybacks on the cockpit's cost/usage view without any schema change.

| Field | Value |
|---|---|
| `network` | `instagram` |
| `handle` | `analysis_snapshots.instagram_username` of the looked-up snapshot |
| `analysis_snapshot_id` | the input UUID |
| `data_source` | `cache` when path existed, `fresh` otherwise |
| `outcome` | `public_pdf` (new outcome label, unblocked since the column is free-form text) |
| `posts_returned` | 0 |
| `profiles_returned` | 0 |
| `estimated_cost_usd` | 0 (PDF render is compute-only) |
| `duration_ms` | wall-clock |
| `request_ip_hash` | hashed IP |
| `user_agent_family` | first token of UA (best-effort) |

No `provider_call_log_id` (no provider was called).

### What stays untouched

- `/api/generate-report-pdf` — admin/email flow. Untouched. Still writes to `reports/<YYYY>/<MM>/<report_request_id>.pdf`. Still no public exposure.
- `report_requests` table and `pdf_status` lifecycle — untouched.
- `/report/example` — untouched.
- All locked report components — untouched.
- `src/lib/pdf/render.ts`, `report-document.tsx`, `recommendations.ts`, `styles.ts`, `format.ts` — untouched. The same `renderReportPdf` is reused as-is.
- `buildReportPath` — untouched. New helper added alongside.
- Bucket `report-pdfs` stays **private**. Only short-lived signed URLs are returned (TTL = 300s = 5 min).
- Email gating, lead capture, payments — untouched.

### Files to create

- `src/routes/api/public/public-report-pdf.ts` — the new route handler
- `src/lib/pdf/payload-guard.ts` — shared `isNormalizedPayload` (extracted from the existing `generate-report-pdf` route, with a re-export so that route still compiles)
- `src/lib/pdf/public-snapshot-pdf.server.ts` — orchestrator: load snapshot → check cache → render → upload → sign → log. Keeps the route file thin.
- (no new migration, no new bucket, no new table)

### Files to edit

- `src/lib/pdf/storage.ts`
  - Add `buildPublicSnapshotPdfPath({ snapshotId, createdAtIso })`
  - Add `signReportPdfUrl(path, ttlSeconds)` wrapper
  - Add `pdfExistsAtPath(path)` helper using `storage.list(prefix, { search })`
  - `REPORT_PDF_BUCKET` and `buildReportPath`/`uploadReportPdf` unchanged
- `src/routes/api/generate-report-pdf.ts`
  - Replace inline `isNormalizedPayload` with the shared helper from `payload-guard.ts` (1-line import swap, same behaviour)

### Frontend wiring (out of scope for this prompt)

Not implemented in this task — the spec says only "create the endpoint". The button on `/analyze/$username` will be added in a follow-up prompt and will:
- POST `{ snapshot_id }` to `/api/public/public-report-pdf`
- On 200, `window.open(signed_url, "_blank")` to start the download
- On 429, show "Aguarda alguns minutos antes de tentar novamente."

### Security checklist

- ☑ Bucket stays private — only signed URLs leave the server (TTL 5 min)
- ☑ Snapshot id is validated as UUID (Zod) before any DB access
- ☑ Service role client used server-side only (never imported by client code)
- ☑ Per-IP throttle to mitigate abuse on a public compute endpoint
- ☑ No PII in the response — only the signed URL and status
- ☑ No email, no payment, no auth changes
- ☑ Cost transparency: every call logged in `analysis_events` with `outcome = 'public_pdf'`
- ☑ Snapshot id is the only client-controlled input — no path traversal possible because the path is built from the snapshot's own `created_at`
- ☑ `MALFORMED_SNAPSHOT` returned without leaking schema details

### Validation

- `bunx tsc --noEmit` — must pass
- `bun run build` — must pass
- Confirm by code inspection:
  - new route lives under `src/routes/api/public/`
  - reuses `renderReportPdf` unchanged
  - no Apify/DataForSEO/OpenAI/email imports
  - `report_requests`, `buildReportPath`, `/api/generate-report-pdf` behaviour unchanged

### Risks

1. **Compute cost on cold render**: each first-time PDF is ~1–3s server work. The path-based cache makes repeats free; the per-IP throttle bounds the worst case. Acceptable.
2. **Signed URL expiry vs slow downloads**: 5 minutes is enough for normal browsers but very slow connections may time out. Acceptable for v1; can extend to 15 min later if support reports issues.
3. **Snapshot rotation**: if a snapshot ever gets re-written in place (it currently does not — the pipeline always inserts new rows), the cached PDF would be stale. Today this is a non-risk; document it as a known invariant alongside the helper.
4. **Storage growth**: one PDF per public snapshot. Use the existing monthly partitioning (`public/snapshots/YYYY/MM/`) for easy lifecycle pruning later.
5. **Rate-limit accuracy**: counting `analysis_events` is approximate (the row is only written after success). For abusive parallel bursts this slightly under-counts; acceptable for v1, can be tightened with a dedicated table later.
