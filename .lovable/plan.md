# QA audit — paid Add Competitor beta credit flow

## 1. Exact `premiumUnlocked` condition (production)

Source: `src/lib/payments/entitlements.functions.ts` → `getMyReportEntitlement`.

```text
premiumUnlocked = hasEntitlement(leadId, "report_full_9")
where leadId = getLeadFromCookie()  // cookie name: lead_session
```

- If there is no `lead_session` cookie → `{ hasLead: false, premiumUnlocked: false }`.
- If `lead_entitlements` has no row with `lead_id = <session lead>` AND `product_code = 'report_full_9'` → `premiumUnlocked: false`.
- Any thrown error → `premiumUnlocked: false` (fail-closed).
- The route `src/routes/analyze.$username.tsx` reads only this function for the Pro gate (line 400-407). Credit balance is NOT consulted.

## 2. Does Pro require `lead_entitlements.product_code = 'report_full_9'`?

Yes. Confirmed in `entitlements.functions.ts` line 20 and `entitlements.server.ts` (`SELECT … FROM lead_entitlements WHERE product_code = $1`). Credit ledger balance is irrelevant to the gate. The Add Competitor button in `report-block-nav.tsx` (line 756-762) only opens the consume-credit dialog when `premiumUnlocked === true`; otherwise it routes through `handlePremiumAccessClick("sidebar_add_competitor")` (upsell, not consumption).

## 3. Is credit balance alone sufficient?

No. A lead with `credit_balance > 0` but no `lead_entitlements` row sees the same locked sidebar as a free user. Credits are only debited after Pro is unlocked, inside the competitor confirm handler.

## 4. Current DB state (production = preview, single Supabase project)

```text
lead_entitlements where product_code='report_full_9' → 0 rows
Test leads with credits but no entitlement:
  - validator+freegate@auditprofiles.test   1 credit, no entitlement
  - frederico.carvalho@digitalfc.pt          1 credit, no entitlement
  - fredericodigital@gmail.com               1 credit, no entitlement
```

No lead in the database currently satisfies the gate. Any QA path that walks the real `analyze.$username.tsx` Pro flow must either (a) complete a real EuPago payment, or (b) have a `lead_entitlements` row inserted manually.

## 5. Admin / preview bypasses

- `/admin/report-preview/<username>?variant=pro_preview` and `?variant=internal_lab` hardcode `premiumUnlocked={variant !== "public_mvp"}` on `<ReportShellV2 />` (line 205). The sidebar's Add Competitor renders unlocked there, but the route does **not** exercise the live entitlement check, the lead-session cookie path, or the credit debit. It is UI-only QA.
- The admin preview route is admin-gated (cookie + `ADMIN_ALLOWED_EMAILS`), independent from the user `lead_session`.
- There is no "impersonate lead" or "test login" mechanism. Public auth is Google OAuth only.
- The preview deployment (`*-dev.lovable.app`) and production (`auditprofiles.com`) share the same Lovable Cloud / Supabase project; entitlement/credit state is identical between them. Only the bundled frontend differs.

## 6. Can a temporary test entitlement be created in preview only?

No — preview and production share the same `lead_entitlements` table. A test entitlement inserted "in preview" is also visible in production. It can, however, be scoped to a clearly synthetic lead (e.g. `validator+freegate@auditprofiles.test`) and revoked immediately after QA.

## 7. Where the QA should run

- **Functional / UI QA of the locked-vs-unlocked sidebar, dialog copy, layout, "1 crédito" label, button states, competitor cap, mobile rendering** → `/admin/report-preview/<handle>?variant=pro_preview` on the preview deployment. No DB writes, no credit burn, no Apify call.
- **True end-to-end paid path (entitlement → balance fetch → consume_credit → competitor scrape → snapshot rebuild)** → `/analyze/<handle>` on the preview deployment, logged in via Google as the QA lead, with one of:
  - Path A (clean): complete a real €9 EuPago purchase with a dedicated QA Google account.
  - Path B (cheap, recommended for beta): operator inserts a single `lead_entitlements` row for the QA lead just before QA, and deletes it after — explicitly out of scope for this audit task.

## 8. Avoiding unnecessary credit / Apify spend

- One Add Competitor confirm = 1 credit debited in `credit_ledger` AND 1 Apify primary scrape against the competitor handle. There is no dry-run flag in the consume-credit path.
- Pick a competitor handle already in `APIFY_ALLOWLIST` and small (low post count) to keep the Apify cost minimal.
- Pre-load the QA lead with exactly the credits needed (current `validator+freegate` lead has 1 — enough for one competitor; no top-up required).
- Do NOT exercise the flow on the production domain with a real customer's Google session.

## Recommendations

| Item | Recommendation |
|---|---|
| **Environment** | Preview deployment `*-dev.lovable.app` (same DB, isolates from real users on the custom domain). |
| **Account** | Dedicated QA Google account (not a personal one). Linked to lead `validator+freegate@auditprofiles.test` via `link_user_to_existing_reports` after first login, OR a freshly-created QA lead. |
| **Entitlement state** | Exactly one row in `lead_entitlements (lead_id, product_code='report_full_9')`. Currently absent — must be created before QA. |
| **Credit balance** | ≥ 1 (current QA lead already has 1). |
| **DB setup needed?** | Yes — one `lead_entitlements` insert for the QA lead, granted out-of-band. Not part of this audit; requires an explicit follow-up prompt. |
| **Expected spend** | 1 credit + 1 Apify scrape (no €). |

## Safest execution prompt for the real QA (to paste later, after entitlement is in place)

```text
Run a runtime validation of the paid Add Competitor flow on the preview
deployment only. Do not touch production traffic.

Pre-check:
1. Lead `validator+freegate@auditprofiles.test` has credit_balance >= 1 and
   one row in lead_entitlements with product_code = 'report_full_9'. Abort
   otherwise; do not insert the row in this run.
2. Confirm APIFY_ENABLED=true and the chosen competitor handle is in
   APIFY_ALLOWLIST.
3. Sign in on `*-dev.lovable.app` via Google with the dedicated QA account.

Execute:
4. Open /analyze/<primary handle>. Confirm premiumUnlocked=true (sidebar
   shows credit chip and Add Competitor enabled).
5. Click Add Competitor. Type the allowlisted competitor handle. Confirm.

Verify after T0:
- credit_ledger: 1 new row, delta = -1, reason competitor.
- enrichment_jobs / provider_call_logs: exactly 1 new apify row for the
  competitor handle, status success.
- No OpenAI calls. No DataForSEO calls. No new EuPago payment.
- analysis_snapshots: the primary snapshot's competitor_usernames now
  includes the added handle; new normalized_payload renders the competitor
  side-by-side in the report.
- No regression in pre-existing snapshots.

Output:
- Lead id, snapshot id, competitor handle.
- credit_ledger row, provider_call_logs row, enrichment_jobs row.
- PASS / FAIL.
```
