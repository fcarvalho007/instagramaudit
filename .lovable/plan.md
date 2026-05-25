Read-only audit — no code changes proposed.

## Verdict: **GO** for public sharing

All P0 commercial surfaces are aligned with the simplified €7 / €28 model. Residuals are internal/back-compat only.

## Surface-by-surface

| Surface | Status | Evidence |
|---|---|---|
| `/precos` (pt/en pricing.json + route) | PASS | Only `7€` / `28€` / `5,60€`, `trust_note` "Sem subscrição. Sem renovação automática.", `pending_note` present. No Pro/Agency. |
| PremiumInterestDialog | PASS | Two cards bound to `premium.dialog.single.price` (`7€`) and `premium.dialog.pack.price` (`28€`). Header comment confirms "Real checkout endpoint is not yet wired. CTAs only emit a typed event." |
| ReportBlockNav (public sidebar) | PASS | No €, no Pro/Agency. Badges Free / Launch offer / Premium. AccessSummaryCard renders `nav.access.pending_note` + `nav.access.trust`. CTA opens PremiumInterestDialog. |
| `/app/plan` | PASS | Reduced to `beforeLoad → redirect('/precos')`. No Pro/Agency tiers. |
| `/app/account` | PASS | Renders fixed "Conta ativa" badge; no `planLabels`. |
| `pro-tracking-teaser` | PASS | Copy = "Acompanhamento recorrente ficará disponível numa fase futura.". No Pro/Agency, no plan link. (Component export symbol `ProTrackingTeaser` is internal — not user-visible.) |
| `feedback-schema` | PASS | Enum = `single_report_7` / `pack_5_reports_28` / `not_ready_to_pay` / `other`. Labels in 7€/28€. Consumers (`feedback-intent.ts`, `feedback-form.tsx`, tests) aligned. |
| `commercial-followup` email | PASS | "1 relatório — 7€", "Pack 5 relatórios — 28€ (5,60€ por relatório, poupas 20%)", "Sem subscrição. Sem renovação automática.". No IVA. Preheader updated. |
| Header / Footer | PASS | Both link to `/precos` only. No `/app/plan` references. |
| PT / EN i18n | PASS | `pricing.json`, `report.json.nav.access` and `gate.json` parity verified. EN uses `€` prefix; PT uses `€` suffix per locale convention. |

## Confirmation checklist

1. **No visible €3 / €13** in any commercial surface — `rg "€3\b|€13\b" src/` returns 0 hits. ✓ (`€312/€319/€348` in `admin/mock-data.ts` and `€72` in admin waterfall are internal admin-only mock revenue, not pricing.)
2. **No Pro/Agency/monthly plan as purchasable** — none in `/precos`, dialog, sidebar, account, plan, teaser, followup, header, footer. ✓
3. **Only €7 and €28 visible** as pricing options. ✓
4. **Checkout pending is clearly stated** — `pending_note` on `/precos` + sidebar; dialog comment + no payment redirect. ✓
5. **CTAs do not pretend to process payment** — dialog buttons emit `pricing_option_clicked`; sidebar CTA opens the dialog; followup email "Desbloquear" only renders when caller passes a real `checkoutUrl` (none in production code paths today). ✓
6. **PT/EN aligned** — same keys, same semantics. ✓
7. **No report data / providers / cache / unlock logic touched** — changes confined to i18n, copy, schema enum, email template, redirect route. Apify/OpenAI/DataForSEO/Brevo/Resend/snapshots/RLS untouched. ✓

## Remaining issues

**P0**: none.

**P1**: none.

**P2 (cosmetic / hygiene, optional, not blocking launch):**
- `src/components/app/pro-tracking-teaser.tsx` — file name and exported symbol `ProTrackingTeaser` retain the "Pro" word. Internal-only; no user-visible surface. *Recommendation: rename to `RecurringTrackingTeaser` in a future refactor sweep.*
- `src/lib/admin/mock-data.ts`, `src/routes/design-system.tsx`, `src/routes/admin.report-lab.tsx`, `src/routes/admin.report-preview.$username.tsx`, `src/lib/report/report-variant.ts` — references to "Pro" / "Pro candidate" / "pro_preview" / "Plano Pro". All admin/internal or design-system playground; not reachable from public navigation.
- `src/components/beta/beta-request-form.tsx` line 425 ("Plano Pro mensal") and line 26 (`{value: "agency"}`) — beta-program audience-segmentation field, not a pricing option. Classified as *segmentation, not pricing*.
- `src/components/report-tier/tier-copy.ts` line 13 — "A versão Pro aprofundará concorrentes…" — future-tense marketing copy inside report tier teaser. Not a purchasable Pro plan, but reads as one. *Recommendation: soften to "Uma versão futura aprofundará…" before public launch if you want zero "Pro" mentions in the report itself.*
- `src/i18n/locales/{pt,en}/report.json` keys `tier.pro`, `tier.pro_active`, `chart.public_title` ("disponível na versão Pro"), `score_public_title` ("Score visual · Pro") — same situation as above; surfaced only in `report-comment-intelligence.tsx` public_mvp teaser. *Recommendation: optional rename pass.*
- `src/lib/brevo/enum-mappers.ts` still recognises legacy `nao_sei` as `unsure` — intentional back-compat, no action.
- `src/lib/feedback/feedback-schema.ts` keeps `PricingPreference` type re-exported alongside `src/lib/unlock-flow.ts` PRICING_PREFERENCES (different enum, different feature). Both are internal — no conflict.

## Files still containing commercial legacy references (classification)

| File | Reference | Classification |
|---|---|---|
| `src/components/app/pro-tracking-teaser.tsx` | symbol `ProTrackingTeaser` | internal-only, cosmetic rename |
| `src/components/beta/beta-request-form.tsx` | "Plano Pro mensal", `value: "agency"` | segmentation, not pricing |
| `src/components/report-tier/tier-copy.ts` | "versão Pro" copy | obsolete copy (P2) |
| `src/i18n/locales/{pt,en}/report.json` | tier.pro / "versão Pro" | obsolete copy (P2) |
| `src/components/report-redesign/report-tier-teaser.tsx`, `src/components/report-redesign/v2/report-comment-intelligence.tsx` | comments + uses tier copy | downstream of above (P2) |
| `src/routes/design-system.tsx` | "Plano Pro", "Upgrade Pro", "Agency" badges | internal design-system playground |
| `src/routes/admin.report-lab.tsx`, `admin.report-preview.$username.tsx`, `src/lib/report/report-variant.ts` | "pro_preview", "Pro candidate" | admin-internal naming |
| `src/lib/admin/mock-data.ts`, `src/components/admin/v2/receita/waterfall-section.tsx` | "€72", "€312", "MRR €789", "4 clientes · €312 MRR" | admin mock metrics |
| `src/lib/brevo/enum-mappers.ts` | `nao_sei`, `subscription` | back-compat mapper |
| `src/lib/brand/contact.ts` | `mailtoPro`, `mailtoAgency` (deprecated aliases) | back-compat, JSDoc-marked |

## Recommendation before public sharing

Ship as-is. The public-facing pricing surface is consistent and safe.

Optional pre-launch polish (≤ 1 prompt of work, all P2):
1. Soften "versão Pro" mentions in `report-tier/tier-copy.ts` + report.json `tier.*` keys to neutral future-tense copy, so the report itself stops hinting at a "Pro plan".
2. Rename `pro-tracking-teaser` → `recurring-tracking-teaser` for code hygiene.

Skip if you want to launch immediately — neither blocks the commercial story.