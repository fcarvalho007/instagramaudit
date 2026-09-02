# Fecho da ronda 11B.1 — enviar só a ponte de identidade

Decisão aceite: envia-se apenas a 11B.1. A 11B.2 (simplificação de passos) e a 11B.3 (natureza do 97€) ficam por abrir, sem qualquer alteração antecipada.

## Estado confirmado no código

- `src/lib/leads/resolve-checkout-lead.server.ts` — resolver de identidade (lead_session > report_capture_session > none) com tradução snapshot id → cache_key.
- `src/lib/leads/checkout-identity.functions.ts` — `getCheckoutIdentityStatus` exposto ao checkout.
- `src/routes/checkout.report-full.tsx` — gate só quando `identity === "none"`; identidade scoped que aceita o upsell global volta a pedir conta.
- `src/lib/payments/eupago.functions.ts` — usa `resolveCheckoutIdentity` e restringe a identidade scoped ao produto do relatório.
- `src/lib/leads/__tests__/resolve-checkout-lead.test.ts` — testes do resolver.

Ou seja, a implementação da 11B.1 está feita. Falta apenas a prova de que fecha em condições.

## O que esta ronda faz

1. Suite completa de testes e typecheck, com leitura integral do output.
2. Confirmação de que as 6 falhas conhecidas em templates de email/labels de admin continuam pré-existentes e sem relação com o checkout.
3. QA runtime (Playwright) dos quatro cenários de identidade:
   - Estado A → email → Estado B → CTA 9€ → checkout sem Account Gate;
   - checkout directo sem cookies → Account Gate;
   - `lead_session` válida → checkout directo;
   - cookie de captura do relatório X com `report_cache_key` do relatório Y → Account Gate.
4. Verificação de que a identidade scoped não passa em packs nem no 97€ (gate reaparece nesse ponto).
5. Confirmação visual de que ConversionSheet, LoadingQualification, choice controls, BillingForm e Report UX não sofreram alteração.

## Correcções permitidas

Apenas defeitos encontrados nestes cenários (identidade aceite indevidamente, gate a aparecer quando não devia, pagamento sem `lead_id`). Nenhuma alteração de passos, preços, copy comercial ou visual.

## Fora de âmbito

Plan chooser, objectivo pré-pagamento, campos de facturação, upsell de 97€, motion e Report UX.
