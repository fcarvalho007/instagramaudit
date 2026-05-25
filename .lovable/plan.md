## Status of P0 items
Items 1–4 were already fixed in prior turns of this session:
- ReportBlockNav: no €3/€13, AccessSummaryCard in place with Free / Launch offer / Premium badges.
- `/app/plan` → redirects to `/precos`.
- `pro-tracking-teaser` is now neutral.
- `app.account` shows "Conta ativa".

This plan ships the **remaining 3 deltas**:
A. Add the pending-payment note to the sidebar AccessSummaryCard (item 1 sub-task).
B. Rewrite `feedback-schema` enum + downstream consumers (item 5).
C. Rewrite `commercial-followup` email to €7/€28, no IVA, no checkout claim (item 6).

## Files touched
- `src/i18n/locales/pt/report.json`, `src/i18n/locales/en/report.json` — add `nav.access.pending_note`.
- `src/components/report-redesign/v2/report-block-nav.tsx` — render `pending_note` line in AccessSummaryCard.
- `src/lib/feedback/feedback-schema.ts` — new enum + labels.
- `src/lib/feedback/__tests__/feedback-schema.test.ts` — update enum test.
- `src/lib/admin/feedback-intent.ts` — map new enum values to actions; drop monthly/agency branches.
- `src/lib/admin/__tests__/feedback-intent.test.ts` — update test cases.
- `src/lib/email/templates/commercial-followup.ts` — €7 / €28, no IVA, "Sem subscrição. Sem renovação automática.", neutralize checkout claim.
- `src/lib/email/__tests__/templates.test.ts` — update assertions.

Not touched: `src/components/feedback/feedback-form.tsx` (renders from constants — auto-updates), `src/lib/brevo/enum-mappers.ts` (existing fallbacks already cover the new values: digits → `one_off`, `other` → `unsure`), brevo tests, brevo sync, `unlock-flow.ts`, `pricing-feedback.ts`, providers, RLS.

## Detailed changes

### A. Sidebar pending-payment note
Add i18n key:
- PT `nav.access.pending_note` = "Pagamento brevemente disponível — os botões registam o teu interesse."
- EN `nav.access.pending_note` = "Payment coming soon — buttons register your interest."

In `AccessSummaryCard`, render the pending note as a discreet line between the CTA and the existing trust microcopy. Keep the trust line ("1 relatório ou pack de 5. Sem subscrição.") — it complements the pending note.

### B. feedback-schema

`PRICING_PREFERENCE_VALUES`:
```ts
["single_report_7", "pack_5_reports_28", "not_ready_to_pay", "other"]
```

`PRICING_PREFERENCE_LABELS` (PT, matching the current Portuguese-only form copy):
- `single_report_7` → "1 relatório — 7€"
- `pack_5_reports_28` → "Pack 5 relatórios — 28€"
- `not_ready_to_pay` → "Ainda não estou pronto/a para pagar"
- `other` → "Outra opção"

DB column `lead_feedback.pricing_preference` is free text (no enum constraint) — no migration required; old values remain readable but won't be produced going forward.

`src/lib/admin/feedback-intent.ts` `actionByPricing`:
- `single_report_7` → "Responder com proposta de relatório único"
- `pack_5_reports_28` → "Sugerir pack de 5 relatórios"
- `not_ready_to_pay` → "Nutrir mais tarde"
- `other` → fallback
- Remove `plano_mensal` / `plano_agencia` cases. Also remove the mid-intent "Explorar plano mensal" fallback strings — replace with "Sugerir pack de 5 relatórios".

Tests:
- `feedback-schema.test.ts`: replace enum array with new 4 values.
- `feedback-intent.test.ts`: replace the three pricing-specific cases with `single_report_7`, `pack_5_reports_28`, `not_ready_to_pay`; assert new action strings; drop the `plano_mensal` test.

### C. commercial-followup email

Subject/preheader: keep subject; update preheader to "Duas opções para desbloquear o relatório completo. Sem subscrição."

Body text + HTML, replacing the two pricing lines with:
- PT text:
  - "· 1 relatório — 7€"
  - "· Pack 5 relatórios — 28€ (5,60€ por relatório, poupas 20%)"
  - new line: "Sem subscrição. Sem renovação automática."
- HTML mirrors the same.

Checkout claim: when no `checkoutUrl` is present, the current code shows a "Falar connosco" mailto or muted text. Keep that. When `checkoutUrl` IS supplied, retain the existing "Desbloquear" button — it's only rendered if the caller provides a URL, so it cannot imply checkout exists by default. (Per constraint "do not imply checkout is active": current behaviour is already gated by caller, no extra change needed.)

Remove "+ IVA" everywhere; `/precos` does not mention IVA.

Tests in `templates.test.ts` (lines 132–137):
- Replace `expect(out.text).toContain("€3 + IVA")` with `expect(out.text).toContain("7€")`.
- Replace `expect(out.text).toContain("€13 + IVA")` with `expect(out.text).toContain("28€")`.
- Update preheader assertion line 108–110 to match the new preheader text.
- Keep "docentes" assertion — academic line stays.

## Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
- Grep classification report (residuals expected):
  - `Pro` / `Agency`: only in `post-analysis-conversion-layer.tsx` (out-of-scope public component flagged previously) and `mailtoPro`/`mailtoAgency` deprecated aliases in `contact.ts`. Both reported as **obsolete-out-of-scope**.
  - `€3`/`€13`: should be 0 in `src/`. Any remaining are bugs.
  - `plano mensal` / `monthly plan` / `agency plan`: 0 expected.
  - Internal-only matches in `gate.json`, `mock-data.ts`, brevo type names (e.g. `subscription` enum), `unlock-flow.ts` legacy enum: classified as **internal/segmentation, not pricing**.

## Out of scope (not in this prompt)
- `post-analysis-conversion-layer.tsx` Pro/Agency cards.
- PremiumInterestDialog pending note (audit noted as missing; not in this prompt's task list).
- Removing the deprecated `mailtoPro`/`mailtoAgency` aliases.