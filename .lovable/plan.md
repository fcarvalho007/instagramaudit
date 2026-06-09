
# AuditProfiles MVP — Production Go/No-Go Audit

Read-only audit. No code changes proposed. Verdict at the bottom.

## 1. PASS/FAIL by area

| # | Area | Status | Notes |
|---|---|---|---|
| 1 | Product access (Free vs Pro) | PASS | `report_full_9` entitlement + window flag gate 30d/90d/competitors. Free path never reaches Pro windows or competitor analysis. Cache-open = 0 credits, force_refresh = 1 credit confirmed in `analyze-public-v1` + `consume-credit-dialog`. |
| 2 | Payment E2E | PASS w/ manual check | EuPago checkout (`createEupagoCheckout`) creates pending `lead_payments`. Webhook (`/api/public/eupago-webhook`) verifies HMAC, grants `report_full_9`, calls `grantPostPurchaseBetaCredits` (1 included + 2 bonus = 3). Idempotent by `payment_id` via ledger `kind`. Requires manual verification of `EUPAGO_*` prod secrets + webhook URL in EuPago dashboard. |
| 3 | Provider/cost readiness | PASS | Apify kill-switch, allowlist, daily/hard caps, per-(lead,profile,window) cap, 90d global cap, Lovable AI cap ($5 default) all in place with `provider_call_logs` non-null cost. Free report never triggers OpenAI/DataForSEO/Lovable AI. Cap-blocked runs throw before credit confirm → no consumption. Requires manual confirmation of prod env values. |
| 4 | Admin observability | PASS | Free/Pro, payment, entitlement, ledger, `analysis_event_id`, window, cache/fresh/fresh_forced, provider cost, competitor request, blocked reason and email state all wired in `/admin/*`. |
| 5 | Email lifecycle | PASS | Templates aligned to 1+2 credits and current prices; `payment_confirmed` idempotent by `payment_id`; `report_saved` not duplicated; no dual-send pattern detected. |
| 6 | UX/copy | PASS w/ caveats | Free value, Pro unlock, cache modal copy correct. 30d/90d no longer "coming soon". Internal terms (`Apify`, `provider`, `backend`) only appear in code comments / admin / `report-mock-data.ts`, not user UI. **Caveat:** `analyze-period-selector` + `consume-credit-dialog` text say "análise nova" / "abrir recente" — confirm visually in 375px. |
| 7 | Production deployment | NEEDS MANUAL | Latest published build, custom domain (`auditprofiles.com`), email sender, `/report/example` exposure, `/beta/request` linkage — all require human verification on the live site. |

## 2. Remaining blockers by severity

### P0 (block public launch)
- **None code-side.** All P0 items already shipped.
- Manual P0 must be done before flipping public: confirm prod `EUPAGO_*`, `APIFY_*`, `LOVABLE_AI_*`, `OPENAI_*`, `BREVO_*` secrets exist and match launch caps; confirm EuPago dashboard webhook URL = `https://auditprofiles.com/api/public/eupago-webhook`; one real €9 end-to-end payment in production.

### P1 (fix during controlled launch window, not blocking)
- **Legacy `/beta/request` flow is still live** (`src/routes/beta.request.tsx`, `beta.submitted.$requestId.tsx`, `beta-request-form.tsx`) and contains active "Beta Privada" / "fase beta" copy. Not linked from active product surfaces today, but route is publicly reachable and SEO-indexable. Recommend either retiring the route or adding `noindex` + removing from sitemap before launch.
- **`/report/example`** is publicly reachable. Decide: keep as sales asset, or gate / `noindex`. No active link audit done — confirm header/footer/landing do not link there for free public visitors (or accept it as intentional showcase).
- **Admin string** `"Em preparação"` in `admin/v2/automacoes/automation-node.tsx` — internal only (admin), acceptable.

### P2 (post-launch cleanup)
- `report-mock-data.ts` comment references "Apify" — internal only, no impact.
- Per-handle/lead cap for Lovable AI Gateway (currently only global $5/day cap). Acceptable for MVP volume.
- Anti-hallucination regex guard on AI editorial output (`headline`/`insight` numbers). Currently relies on Zod + evidence_hash; sufficient for MVP.

## 3. Manual tests still required (pre-launch checklist)

Backend / secrets (admin or shell):
1. `compgen -e | grep -E 'EUPAGO|APIFY|LOVABLE_AI|OPENAI|BREVO'` on prod — confirm all set, no test keys.
2. Confirm `app_config`: `pro_window_90d_enabled=true`, `apify_pro_window_profile_daily_cap_usd=5.50`, `apify_90d_daily_cap_usd=20`, `LOVABLE_AI_DAILY_CAP_USD≤5`.
3. EuPago dashboard → webhook URL points to `https://auditprofiles.com/api/public/eupago-webhook`, signature secret matches `EUPAGO_WEBHOOK_SECRET`.

E2E happy paths (production, real account):
4. Free flow: `/` → analyze `frederico.m.carvalho` → confirm baseline-only report, 30d/90d/competitors locked with correct copy.
5. Pro purchase: checkout → pay €9 with real card/MB Way → confirm `payment_confirmed` email arrives, admin shows 3 credits, entitlement `report_full_9` active.
6. Pro: open cached analysis → 0 credits consumed (ledger unchanged).
7. Pro: force refresh → 1 credit debited, `data_source='fresh_forced'`, `analysis_event_id` linked in ledger row.
8. Pro: switch to 30d, then 90d → both load, costs logged with correct window in `provider_call_logs`.
9. Pro: add 1 competitor → competitor cards render with persisted thumbnails (no broken images, no zero-data placeholders).
10. Mobile 375px smoke: Free report, checkout, Pro report, cache modal — no horizontal scroll, CTAs reachable.

Negative paths:
11. Trigger per-(lead,profile,window) cap (run 30d twice with cost > cap) → second call returns `PRO_WINDOW_BUDGET_EXCEEDED`, no credit consumed.
12. Replay EuPago webhook with same `payment_id` → no double credit, no duplicate `payment_confirmed` email.
13. Free user POSTs `analyze-public-v1` with `window: '30d'` → 403/blocked.

Surface checks:
14. View-source on `/`, `/precos`, `/analyze/<handle>` → no "beta privada", "fase beta", "coming soon" in rendered HTML.
15. `/beta/request` and `/report/example` — decide visibility, add `noindex` if keeping.
16. `robots.txt` + `sitemap.xml` — confirm only intended public routes.

## 4. Final recommendation

**GO — controlled launch.**

Rationale: All P0 code paths are shipped, tested, and instrumented. The remaining risk is operational (secrets, EuPago webhook URL, real-money E2E) and one product-hygiene item (`/beta/request` legacy route). Controlled launch = enable production, but for the first 48h:

- Keep `LOVABLE_AI_TESTING_MODE=true` with allowlist (internal handles only) OR set `LOVABLE_AI_DAILY_CAP_USD=3`.
- Keep Apify daily hard cap conservative.
- Monitor admin cockpit (`/admin/relatorios`, `/admin/sistema`) for: failed payments, cap-blocked runs, email DLQ, unusual repeated-profile spikes.
- After first 10 successful Pro purchases with no anomalies → flip to fully open public launch, raise caps to planned production values, and retire `/beta/request`.

Do **not** GO public-open until manual tests 1–13 pass on production.
