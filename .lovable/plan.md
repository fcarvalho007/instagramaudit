# Checkout focado — Relatório completo (9€)

## Confirmação prévia
Não, ainda não existe checkout para o 9€. A pesquisa confirma:
- `src/routes/checkout.*` contém apenas `checkout.tsx` (layout) e `checkout.authority-diagnosis.tsx`.
- A turn anterior foi auditoria — nenhum ficheiro de rota foi criado.
- O `ReserveDiagnosisButton` em `pricing-page.tsx` com `productCode="report_full_9"` salta directo para EuPago, sem passo intermédio.

## Estado do backend (já pronto, não tocar)
- `src/lib/payments/products.ts` — `report_full_9` já no enum `PRODUCT_CODES` e em `PUBLIC_PRODUCTS` (9€, exposed).
- `src/lib/payments/products.server.ts` — `SERVER_PRODUCTS.report_full_9` com `amountCents: 9700`… **⚠ verificar: o teste diz 900, mas o ficheiro mostra 9700? Reler antes de assumir.** Plano assume que existe e é fonte de verdade server-side; se o valor estiver errado, fica fora deste plano (corrigir noutro PR).
- `src/lib/payments/eupago.functions.ts` — `createEupagoCheckout` aceita qualquer `ProductCode` via `z.enum(PRODUCT_CODES)`; já trata `report_full_9`.
- `src/lib/payments/entitlements.server.ts` — `grantEntitlement` é genérico sobre `ProductCode`; suporta `report_full_9` sem alteração.
- `src/routes/api/public/eupago-webhook.ts` — usa `row.product`; agnóstico.

**Conclusão:** só falta o route + UI do checkout focado. Zero migrações, zero alterações ao webhook.

## Rota e fluxo

Nova rota: `src/routes/checkout.report-full.tsx`, dentro do mesmo layout `/checkout` (`CheckoutShell`).

3 passos (vs 4 do 97€ — sem qualification, sem upsell):

```text
Passo 1 — Confirmar desbloqueio
Passo 2 — Dados de facturação
Passo 3 — Confirmar e pagar
```

- `validateSearch`: mesmo schema do 97€ (`username`, `report_cache_key`, `return`, `source`, `coupon`).
- Loader: `ensureQueryData(leadSessionQueryOptions)` (reutiliza o existente).
- Guarda: se `!leadStatus.hasLead`, reusar exactamente o `MissingLeadSession` (mover para `src/components/checkout/missing-lead-session.tsx` e importar em ambos os routes — ver "ficheiros a alterar").
- Tracking: `checkout_started`, `checkout_step_view`, `checkout_step_complete`, `checkout_payment_started`, `checkout_payment_failed` com `product_code: "report_full_9"`.

## Reutilização de componentes
Reaproveitar sem modificar:
- `CheckoutShell` (já é layout em `checkout.tsx`).
- `StepProgress`.
- `BillingForm`, `EMPTY_BILLING`, `validateBilling`.
- `createEupagoCheckout`, `getLeadSessionStatus`, `trackEvent`.

Componentes novos / parametrizados:
- `OrderSummary` actualmente está hard-coded para o 97€ ("Diagnóstico de Autoridade Digital", 97€). Tornar genérico aceitando `productCode: ProductCode` e ler nome+preço de `PUBLIC_PRODUCTS[code]`. Trocar a chamada existente no `checkout.authority-diagnosis.tsx` para passar `productCode="authority_diagnosis_97"`.
- Novo `ConfirmUnlockCard` (substitui o `OfferCard` do 97€) só para este flow: título "Obter relatório completo", subtítulo, 6 bullets editoriais, preço 9€. Mantido local ao route ou em `src/components/checkout/confirm-unlock-card.tsx` se vier a ser reutilizado.

Não tocar em `OfferCard`, `QualificationForm`, `UpsellInterest` — pertencem ao 97€.

## Wiring nos CTAs (parte do plano, não muda backend)
Após criar a rota:
1. `src/components/pricing/pricing-page.tsx` card 9€: substituir `ReserveDiagnosisButton` por `<Button onClick={() => navigate({ to: "/checkout/report-full", search: { source: "pricing_page", return: "/precos", coupon } })}>Desbloquear relatório</Button>` (paridade com o 97€).
2. `src/components/landing/dark/pricing-teaser-band.tsx`: tier 9€ aponta para `/checkout/report-full` (e 97€ para `/checkout/authority-diagnosis`, free para `/#hero`) — já identificado na auditoria.
3. `src/components/report-redesign/v2/premium-interest-dialog.tsx` card 9€: substituir abertura de `PricingInterestModal` por `navigate({ to: "/checkout/report-full", search: {...} })`. Manter `PricingInterestModal` se ainda for usado noutro lado; senão remover import.

## Ficheiros a alterar / criar
| Ficheiro | Acção |
|---|---|
| `src/routes/checkout.report-full.tsx` | **novo** — route + 3 passos |
| `src/components/checkout/confirm-unlock-card.tsx` | **novo** — card visual do passo 1 |
| `src/components/checkout/missing-lead-session.tsx` | **novo** — extrair `MissingLeadSession` para reuso |
| `src/components/checkout/order-summary.tsx` | **alterar** — parametrizar por `productCode` |
| `src/routes/checkout.authority-diagnosis.tsx` | **alterar** — importar `MissingLeadSession` partilhado e passar `productCode` ao `OrderSummary` |
| `src/components/pricing/pricing-page.tsx` | **alterar** — 9€ vai para nova rota |
| `src/components/landing/dark/pricing-teaser-band.tsx` | **alterar** — três tiers com destinos distintos |
| `src/components/report-redesign/v2/premium-interest-dialog.tsx` | **alterar** — 9€ vai para nova rota |

## Testes
- `src/lib/payments/__tests__/products.test.ts` — já cobre `report_full_9` (confirmar que continua verde).
- Novo `src/routes/__tests__/checkout-report-full.test.tsx` (smoke): renderiza com lead session, avança 3 passos, dispara `createEupagoCheckout` com `product_code: "report_full_9"` e billing válido. Stub do `useServerFn`/`useNavigate` à imagem dos testes existentes (se não houver padrão, fica como teste manual no smoke check).
- Smoke manual: landing teaser 9€ → checkout; `/precos` 9€ → checkout; report `PremiumInterestDialog` 9€ → checkout. Em todos: confirmar redirect EuPago e que o 97€ continua intacto.

## Riscos
1. **Discrepância `amountCents` para `report_full_9`** — o teste afirma 900, o ficheiro mostra 9700. Verificar antes de ligar o CTA em produção; se errado, corrigir em PR separado (fora do âmbito desta tarefa: "pricing values" não devem mudar — mas se 9700 é bug, é bloqueante para o 9€).
2. Extrair `MissingLeadSession` toca no checkout do 97€ — risco de regressão. Mitigar com diff mínimo (mover sem alterar JSX) e smoke check ao 97€.
3. Parametrizar `OrderSummary` muda assinatura — todos os callers (só o 97€) têm de ser actualizados na mesma PR.
4. `PricingInterestModal` pode ter outras entradas; verificar antes de remover.

## Fases de implementação
1. **Fundação partilhada (refactor neutro):** extrair `MissingLeadSession`, parametrizar `OrderSummary`, ajustar `checkout.authority-diagnosis.tsx`. Verificar 97€ continua funcional.
2. **Nova rota:** criar `checkout.report-full.tsx` + `ConfirmUnlockCard`. Verificar manualmente o fluxo end-to-end com lead session existente (sem ligar ainda os CTAs).
3. **Wiring de CTAs:** actualizar `pricing-page.tsx`, `pricing-teaser-band.tsx`, `premium-interest-dialog.tsx`.
4. **Tracking + smoke check:** confirmar eventos e correr os 3 percursos. Confirmar `amountCents` antes de release.

Fora do âmbito: webhook EuPago, checkout do 97€ (lógica), `checkout.tsx` interno, valores de preço, onboarding, geração de relatório, admin, hero homepage.
