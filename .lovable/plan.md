# Step 3 — Email lifecycle consolidation: `report_saved`

Replace the duplicated `welcome_beta` + `report_summary` pair sent from the lead-magnet sequence with a single, richer `report_saved` email that confirms the report is saved, shows the remaining free-credit context, and lists up to 3 personalised insights. Old templates stay on disk and are marked legacy.

## Constraints (unchanged from the approved direction)

- No changes to prices, checkout, payment, credit grant/spend, report generation, snapshots or DB schema.
- Old templates/senders stay on disk; only the lead-magnet orchestrator stops calling them.
- No real emails sent during implementation.
- Reads only from existing data (`leads`, `analysis_snapshots`, `credit_balance` RPC, `INITIAL_GRANT` constant).
- Graceful fallbacks for missing data — never render broken `{{placeholders}}`.

## Files to change

Create:
- `src/lib/email/templates/report-saved.ts` — renderer (`renderReportSaved`, `getReportSavedParts`, `ReportSavedInput`).
- `src/lib/email/build-report-saved-data.server.ts` — pure read-only data builder.
- `src/lib/email/send-report-saved.server.ts` — sender (renderWithOverride + sendTransactionalEmail).
- Test (if Vitest is available — it is, sibling tests exist): `src/lib/email/__tests__/report-saved.test.ts`.

Update:
- `src/lib/email/templates/index.ts` — export new renderer/types.
- `src/lib/email/templates/default-parts.ts` — add `"report_saved"` to `EmailTemplateKey` + switch case, sample numbers for KPIs (followers, engagementPct, dominantFormat, benchmarkDeltaPp, topPostFormat, topPostEngagement, credit counts).
- `src/lib/email/transactional-email.server.ts` — extend `TxFlow` with `"report-saved"` + `FLOW_FAILURE_EVENT["report-saved"] = "report_saved_email_failed"`.
- `src/lib/email/lead-magnet-sequence.server.ts` — replace the two-step `welcome` + `summary` block with a single `report_saved` step (see logic below). Keep kill-switch, consent lookup, dedup-by-`product_events` pattern intact.
- `src/lib/admin/email-template-registry.ts` — add `report_saved` (category `conta`, wired); mark `welcome_beta` and `report_summary` as `wired: false` + `wiredNote: "LEGACY — substituído por report_saved (lead-magnet-sequence). Mantido em disco para histórico de overrides."`; extend `SAMPLE` with the realistic preview data; add `EmailTemplateKey` union member + `TEMPLATE_VARIABLES["report_saved"]`.
- `.lovable/plan.md` and `docs/BETA_RUNBOOK.md` §0.1 — mark Step 3 done.

Keep on disk, untouched in behaviour:
- `src/lib/email/send-welcome-beta.server.ts`
- `src/lib/email/send-report-summary.server.ts`
- `src/lib/email/build-report-summary-data.server.ts`
- `src/lib/email/templates/welcome-beta.ts`
- `src/lib/email/templates/report-summary.ts`

Not touched:
- `src/lib/payments/products.ts`, all `src/routes/api/.../checkout*`, `src/routes/api/public/eupago-webhook.ts`, `src/lib/credits/credits.server.ts`, `src/lib/unlock.server.ts` (the call site of `sendLeadMagnetSequence` keeps the exact same signature).

## `report_saved` template

Subject: `O relatório de @{handle} ficou guardado`
Preheader: `Usaste 1 análise grátis. Ainda tens 1 crédito para comparar outro perfil.` (neutral fallback when credits are unknown).

Sections rendered in order:
1. Greeting + "Bem-vindo à beta" (skipped when `variant === "returning"`).
2. Lead paragraph confirming the report is saved.
3. **Credit card** — rendered only if `credits` object is present; shows totalFree / used / remaining. When `credits === null`, omit the card entirely.
4. **Numbered insight list** — renders only the insights that are present (1–3). When all three are missing, render a single neutral line ("O teu relatório está guardado e podes consultá-lo abaixo.") and skip the heading.
5. Primary CTA "Analisar outro perfil" → `analyzeAnotherUrl`.
6. Secondary text link "Abrir relatório de @{handle}" → `reportUrl`.
7. Existing signature + (optional) unsubscribe footer when `unsubscribeUrl` provided.

Design tokens follow existing email templates (`shared.ts` helpers `wrapHtml`, `p`, `pMuted`, `renderButtonHtml`, `signatureHtml`, etc.) — dark-navy header band, white body, subtle border on the credit card, blue primary CTA, secondary anchor link. Mobile-first, no new CSS.

### Input shape

```ts
interface ReportSavedInput {
  firstName: string | null;
  instagramHandle: string;
  reportUrl: string;
  analyzeAnotherUrl: string;
  variant?: "welcome" | "returning"; // default "welcome"
  credits?: {
    totalFree: number;
    used: number;
    remaining: number;
  } | null;
  insights?: {
    followersLabel?: string | null;
    dominantFormat?: string | null;
    engagementRate?: string | null;     // pre-formatted ("4,2%")
    benchmarkDelta?: string | null;     // pre-formatted ("+1,1 pp acima da média")
    topPostFormat?: string | null;
    topPostEngagement?: string | null;  // pre-formatted ("0,15%")
  } | null;
  unsubscribeUrl?: string | null;
}
```

The renderer composes each insight bullet only when both required tokens for that bullet are present (e.g. bullet 1 needs `followersLabel` AND `dominantFormat`).

## Data builder

`buildReportSavedData(args)` returns a fully-formed `ReportSavedInput`, never throws (try/catch internal, returns safe defaults).

Inputs: `snapshotId`, `instagramHandle`, `leadId`, `reportSnapshotId?`, `firstName`, `returningLead: boolean`.

Reads (all read-only, all already used elsewhere):
- `analysis_snapshots` row → `normalized_payload` → `snapshotToReportData(...)` → followers, engagementRate, dominantFormat, engagementDeltaPct, topPosts[0] (same path as `build-report-summary-data.server.ts`).
- `credit_balance` RPC for `remaining` (already used in `getBalance`).
- `INITIAL_GRANT` constant for `totalFree`.
- `used = max(0, totalFree − remaining)`. We do NOT compute used from `credit_ledger` mutations to avoid coupling to schema details; the bounded arithmetic on the balance is enough for the email and matches the "1 used / 1 remaining" copy after the first unlock. If `getBalance` throws, `credits = null` and the credit card is hidden.

URL building:
- `reportUrl = resolveReportUrl(handle, reportSnapshotId)`.
- `analyzeAnotherUrl = ${PUBLIC_APP_BASE_URL || PDF_PUBLIC_BASE_URL || https://auditprofiles.com}` root. We do NOT introduce a new "analyse another" route; using the homepage (where the public analyse form lives) avoids any route assumptions. If you want a different deep link later, it's a one-line change.

Formatting:
- `followersLabel`: pt-PT `Intl.NumberFormat("pt-PT")` with a "mil" suffix for >= 1000 (e.g. `10,2 mil`), otherwise raw integer.
- `engagementRate`: `${value.toFixed(1).replace(".", ",")}%`.
- `benchmarkDelta`: `"+X,X pp acima da média"` / `"-X,X pp abaixo da média"` / `"em linha com a média"` for |delta| < 0.1.
- `topPostEngagement`: same percent formatter.
- Anything below the validity threshold (followers ≤ 0, engagementPct ≤ 0, missing dominant format, missing top post) is returned as `null` and the renderer hides the bullet — NO inferred values, NO broken placeholders.

## Lead-magnet orchestrator changes

Inside `sendLeadMagnetSequence`:

1. Keep the existing kill-switch block (`LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED`).
2. Keep the marketing-consent lookup for metadata.
3. **Dedup gate (new):** check `product_events` for ANY of:
   - `report_saved_email_sent` (the new event), OR
   - `beta_welcome_email_sent` (legacy), OR
   - `report_summary_email_sent` (legacy),
   keyed by `(lead_id, metadata.report_request_id)`. If any exist → return `{ welcome: "skipped_duplicate", summary: "skipped_duplicate" }`. This prevents double sends for any report_request that was processed under the previous orchestrator.
4. Build data via `buildReportSavedData`. Always send (no NO_DATA hard gate — the template degrades gracefully). The `sendWelcome` boolean from the caller maps to `variant: "welcome" | "returning"`.
5. On success, record `report_saved_email_sent` with metadata `{ message_id, provider, report_request_id, transactional_delivery: true, marketing_consent }`. On failure, record `report_saved_email_failed`. (BETA_WELCOMED_AT Brevo stamp is preserved when `variant === "welcome"` and the send succeeded.)
6. Return shape stays `{ welcome, summary }` for caller compatibility, mapped to `sent | failed | skipped_*` based on the single send outcome (both fields receive the same outcome so existing logs in `unlock.server.ts` keep working).

Result: no behaviour leaks to `unlock.server.ts`; signature and call site stay identical.

## Registry changes

- Extend `EmailTemplateKey` union, `TEMPLATE_VARIABLES`, `default-parts.ts` switch.
- New `SAMPLE` keys: `followersLabel: "10,2 mil"`, `dominantFormat: "carrosséis"`, `engagementRate: "4,2%"`, `benchmarkDelta: "+1,1 pp acima da média"`, `topPostFormat: "carrossel"`, `topPostEngagement: "0,15%"`, `analyzeAnotherUrl: "https://example.com/"`, `totalFreeCredits: 2`, `usedCredits: 1`, `remainingCredits: 1`.
- New entry `report_saved` (category `conta`, `wired: true`, `wiredAt: "src/lib/email/lead-magnet-sequence.server.ts"`, note: "Disparado uma vez por unlock via lead-magnet-sequence. Substitui o par welcome_beta + report_summary.").
- Flip `welcome_beta` and `report_summary` to `wired: false` and update `wiredNote` to `"LEGACY — substituído por report_saved. Renderer mantido para histórico de overrides e auditoria."`. Senders remain on disk but are no longer called by the orchestrator.

## Idempotency event

New: `report_saved_email_sent` (and `report_saved_email_failed`). Dedup also honours the legacy `beta_welcome_email_sent` / `report_summary_email_sent` events so any half-processed lead is not re-emailed.

## Tests (Vitest)

Add `src/lib/email/__tests__/report-saved.test.ts` covering:
1. `renderReportSaved` with full data — subject contains handle, html contains "2", "1", numbered insights, both CTAs.
2. Same with `credits: null` — html does NOT contain the credit card heading.
3. Partial insights (only insight #1 present) — only one numbered item rendered; no `undefined`/`{{` leakage.
4. All insights null → neutral fallback line, no numbered list, both CTAs still rendered.
5. Regex sweep: rendered html/text never contains the substrings `{{`, `undefined`, `null`.

Existing `lead-magnet-sequence.test.ts` is left untouched in this PR (behaviour for welcome+summary is no longer reachable through the orchestrator); a follow-up can rewrite it for the new shape if the team prefers — explicitly out-of-scope here to keep the diff focused.

## Manual validation checklist

1. `/admin/email-lab` → category `conta` shows new `report_saved`; preview renders the dark-navy header, credit card "2 / 1 / 1", numbered insights, primary CTA "Analisar outro perfil", secondary link "Abrir relatório de @frederico.m.carvalho".
2. In Email Lab, temporarily edit registry sample to set `credits: null` (or trigger a render path with it) — credit card disappears; copy stays coherent.
3. `welcome_beta` and `report_summary` entries are still visible in Email Lab, badged as legacy/not wired.
4. Submit a real unlock against a staging lead; verify in `product_events`:
   - exactly one `report_saved_email_sent` row,
   - zero `beta_welcome_email_sent` / `report_summary_email_sent` rows.
5. Re-submit the same unlock; dedup gate fires, no duplicate `report_saved_email_sent`.
6. With `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED=false`, `lead_magnet_sequence_skipped` recorded, zero send events.
7. Spot-check that pricing UI, checkout creation, EuPago webhook and credit balance after unlock are unchanged.

## Data that may safely be missing

- `analysis_snapshots.normalized_payload` empty/zero → all `insights = null` → fallback line.
- `credit_balance` RPC error → `credits = null` → credit card hidden.
- Missing first name → greeting uses neutral fallback.
- Missing `reportSnapshotId` → URL falls back to `/analyze/{handle}` (same as today).
- No DB writes occur from the data builder.

## Risks / follow-ups

- The dedup-gate change makes the orchestrator a no-op for any report_request that already received the legacy pair; this is intentional but means the audit log will show a transition cohort (zero new emails until the next fresh unlock). Documented in `BETA_RUNBOOK.md`.
- Race condition (two unlocks fired in parallel for the same `report_request_id`) is the same residual risk as today — no DB unique index protects it; out of scope for Step 3.
- Removing legacy renderers/senders/events is deferred to a later cleanup step once the new flow has run cleanly in production for at least one cohort.
