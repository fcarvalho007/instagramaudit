# Pricing ladder — copy & visual refinements

Scope: copy, i18n, visual hierarchy and small display logic. **No** changes to payment flow, EuPago, webhook, DB schema, product codes/prices, entitlements, onboarding, report logic, credits, providers or admin.

## Files to change

### 1. `src/i18n/locales/en/report.json` — `premium.dialog`
Rewrite to mirror PT (0€ / 9€ / 97€ ladder). Currently still shows €7 + Pack of 5 + €28.

New EN keys:
- `eyebrow`: "Access options"
- `title`: "Choose how to deepen the analysis"
- `subtitle`: "The initial overview is free. Unlock the full report, or book a human reading to turn the diagnosis into next steps."
- `free`: label "Included", title "Initial overview", price "€0", bullets ["Index and profile overview", "Recent sample", "Account to save reports"], cta "Keep it free"
- `single`: label "Automatic", title "Full report", price "€9", unit "one-off payment · no subscription", bullets ["All 6 sections", "Editorial reading + competitors", "Practical recommendations"], cta "Unlock report"
- `hero`: label "Report + human", badge "Most useful", title "Digital Authority Diagnosis", price "€97", strike "€149", launch "launch price · rises to €149", bullets ["Full report included", "30-minute call", "3 improvement priorities"]
- `footer`: trust "No subscription · no automatic renewal", services_question "Need to analyse several digital assets or prepare training for your team?", services_cta "Talk about audit or training"

Drop `pack` block entirely.

### 2. `src/i18n/locales/pt/pricing.json`
- `meta.description` → "Visão inicial grátis. Relatório completo por 9€. Diagnóstico de Autoridade Digital por 97€ (preço de lançamento). Sem subscrição."
- `single.price` "7€" → "9€"; `single.bullets` → ["1 perfil", "Pagamento único", "Sem subscrição"]
- Drop `pack` block.
- Add `diagnosis` block: label "Beta", title "Diagnóstico de Autoridade Digital", price "97€", strike "149€", launch_note "preço de lançamento · sobe para 149€", bullets ["Relatório completo incluído", "Chamada de 30 minutos", "3 prioridades de melhoria", "Orientação para conteúdo e posicionamento"], cta "Reservar diagnóstico".

### 3. `src/i18n/locales/en/pricing.json`
Mirror #2 in English (price labels "€9" / "€97" / strike "€149").

### 4. `src/i18n/locales/pt/landing.json` and `src/i18n/locales/en/landing.json`
Section `dark.pricing`:
- `urgency` → PT "Preço de lançamento — sobe para 149€ após a beta." / EN "Launch price — rises to €149 after the beta."
- Rename `single` → keep label "Relatório" / "Report", unit "pagamento único" / "one-off payment", cta "Desbloquear" / "Unlock".
- Replace `pack` with `diagnosis`: label "Diagnóstico" / "Diagnosis", unit "leitura humana + 3 prioridades" / "human reading + 3 priorities", cta "Reservar" / "Book", badge "Mais útil" / "Most useful".

### 5. `src/components/landing/dark/pricing-teaser-band.tsx`
Currently hardcodes the old `7€ / strike 19€ / 28€ Pack 5`. Replace the three `<Tier>` calls with:
- Tier 1: `price="0€"`, free tier (unchanged).
- Tier 2: `price="9€"` (no strike), uses `t("dark.pricing.single.*")`.
- Tier 3: `price="97€"`, `strike="149€"`, `featured`, badge "Mais útil" / "Most useful", uses `t("dark.pricing.diagnosis.*")`.

### 6. `src/components/pricing/pricing-page.tsx`
- Replace agency-link copy "Vários perfis ou clientes? Pack de agência" → "Vários perfis ou clientes? Opção de agência" (keep `?topico=agencia` deep link).
- No other changes — the page already renders the correct ladder.

### 7. `src/components/pricing/pricing-interest-modal.tsx`
The modal currently does `planFromDb?.priceFormatted ?? planPrice`. The DB still has the legacy 7€ / 28€ rows (user excluded DB changes), so the modal shows 7€ when the 9€ card opens the interest flow. Flip the precedence to **prefer the prop over DB** so the displayed price always matches the card the user clicked:
- `const effectiveLabel = planLabel ?? planFromDb?.label;`
- `const effectivePrice = planPrice ?? planFromDb?.priceFormatted;`

Pure display fix; no payment or DB logic touched.

## Out of scope (documented, not changed)

- DB `pricing_plans` rows still legacy (7€ / 28€). The display-precedence flip in #7 shields the UI from it.
- The 9€ "Desbloquear relatório" path inside `PremiumInterestDialog` still opens the interest modal (not real checkout) — that requires wiring `ReserveDiagnosisButton` and is excluded by "no payment logic" constraints.
- `pack_5_reports` enum in `PricingInterestModal` and the public API remains — no consumer left after these edits, but removal would touch the public API surface.

## Validation

- `bunx tsc --noEmit`
- Visual check on `/precos` and the in-report premium dialog at desktop 1460px and mobile 390px.
- Grep confirms no remaining "Pack 5", "Pack of 5", "7€", "€7", "28€", "€28", "19€", "€19" in public surfaces (`src/components/landing`, `src/components/pricing`, `src/components/report-redesign`, `src/i18n/locales/**/pricing.json`, `**/landing.json`, `**/report.json`).
- Confirm no edits under `src/lib/payments`, `src/routes/api/public/eupago-webhook.ts`, `supabase/migrations`, `src/integrations`, `src/lib/credits`, `src/lib/admin`.
