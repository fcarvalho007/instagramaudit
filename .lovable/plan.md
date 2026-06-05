## Current Issue Summary

The `/precos` secondary services section contains an "Auditoria de Autoridade Digital" card anchored at **"A partir de 300€"**. The `/servicos` page repeats the same 300€ price. This creates three strategic problems:

1. **Competing anchor**: a public 300€ price undermines the official 499€+ Auditoria Digital plans.
2. **Confusing ladder**: 0€ → 9€ → 97€ → 300€ → 499€+ → 1.850€ → 3.490€ is too many tiers for a solo operator.
3. **Cannibalization risk**: users who need a full audit may self-select into the cheaper 300€ tier instead of the 499€+ official service.

## Final Recommended `/precos` Structure

Top cards remain exactly as they are:

1. **Visão inicial — 0€**
2. **Relatório completo — 9€**
3. **Diagnóstico de Autoridade Digital — 97€** (launch price, later 149€)

Secondary dark section ("Quando o diagnóstico precisa de ir mais longe.") becomes **lead capture only**, with two cards:

### Card 1 — Auditoria Digital completa
- **Title**: "Auditoria Digital completa"
- **Price line**: "Planos desde 499€ + IVA"
- **Description**: "Para marcas que querem analisar website, Google, concorrência, conteúdo, reputação, email e redes sociais."
- **CTA**: "Pedir proposta de auditoria"
- **Microcopy**: "Serviço alinhado com os planos oficiais de Auditoria Digital."
- **Destination**: `/servicos?topico=auditoria`

### Card 2 — Workshop para equipa
- **Title**: "Workshop para equipa"
- **Price line**: "Sob proposta"
- **Description**: "Sessão prática para transformar dados em decisões, calendário editorial e processos de marketing."
- **CTA**: "Falar sobre formação"
- **Microcopy**: "Formato ajustado à equipa, objectivos e duração."
- **Destination**: `/servicos?topico=formacao`

## Exact PT/EN Copy

### Portuguese (primary)

| Element | Text |
|---------|------|
| Section eyebrow | Servicos · sob consulta |
| Section heading | Quando o diagnóstico precisa de ir mais longe. |
| Section body | Para marcas e equipas que querem transformar a analise em estrategia e execucao. |
| Card 1 title | Auditoria Digital completa |
| Card 1 body | Para marcas que querem analisar website, Google, concorrencia, conteudo, reputacao, email e redes sociais. |
| Card 1 price | Planos desde 499€ + IVA |
| Card 1 CTA | Pedir proposta de auditoria |
| Card 1 microcopy | Servico alinhado com os planos oficiais de Auditoria Digital. |
| Card 2 title | Workshop para equipa |
| Card 2 body | Sessao pratica para transformar dados em decisoes, calendario editorial e processos de marketing. |
| Card 2 price | Sob proposta |
| Card 2 CTA | Falar sobre formacao |
| Card 2 microcopy | Formato ajustado a equipa, objectivos e duracao. |

### English

| Element | Text |
|---------|------|
| Section eyebrow | Services · on request |
| Section heading | When the diagnosis needs to go further. |
| Section body | For brands and teams that want to turn analysis into strategy and execution. |
| Card 1 title | Complete Digital Audit |
| Card 1 body | For brands that want to analyse website, Google, competition, content, reputation, email and social media. |
| Card 1 price | Plans from 499€ + VAT |
| Card 1 CTA | Request audit proposal |
| Card 1 microcopy | Service aligned with official Digital Audit plans. |
| Card 2 title | Team Workshop |
| Card 2 body | Practical session to turn data into decisions, editorial calendar and marketing processes. |
| Card 2 price | On proposal |
| Card 2 CTA | Talk about training |
| Card 2 microcopy | Format adjusted to team, objectives and duration. |

## Files Likely to Change

1. **`src/components/pricing/pricing-page.tsx`**
   - Update `ServiceCard` props for both cards (title, body, priceAnchor, ctaLabel).
   - Add microcopy line below each card or inside the card layout.
   - No changes to `PricingCard` or top three cards.

2. **`src/components/services/services-page.tsx`**
   - Update the two dark cards to match new copy and pricing.
   - Remove the 300€ anchor.

3. **`src/i18n/locales/pt/pricing.json`**
   - Add new keys under a `services` object for the secondary section copy.

4. **`src/i18n/locales/en/pricing.json`**
   - Add corresponding English keys.

5. **`src/routes/servicos.tsx`** (possible)
   - Update meta description if it currently references 300€.

## CTA Destination Recommendation

Both service cards on `/precos` should link to **`/servicos?topico=<topic>`** exactly as they do today. This is correct because:
- `/servicos` contains the inquiry form (`ServicesInquiryForm`).
- No payment is created; it is pure lead capture.
- The `topico` query param pre-selects the correct option in the form.
- No new routes, no new checkout, no new products needed.

The existing tracking event `service_audit` / `service_training` should also be preserved.

## Risks

| Risk | Mitigation |
|------|------------|
| Existing `/servicos` page still shows 300€ in its own cards | Update `services-page.tsx` in the same batch. |
| Hardcoded PT strings in `pricing-page.tsx` and `services-page.tsx` cause drift | Add i18n keys for the services section in both JSON files and wire them into the components. |
| 300€ may appear in other marketing pages or landing copy | Search the codebase for "300" after implementation to confirm no stray references remain. |
| The `agencia` link below the pricing cards references `/servicos?topico=agencia` | Keep it; agency is a separate inquiry path with no public price anchor. |
| Users may still confuse 97€ diagnosis with 499€+ audit | The card copy explicitly says "Auditoria Digital completa" and mentions the full scope (website, Google, competition, etc.) to differentiate from the Instagram-only diagnosis. |