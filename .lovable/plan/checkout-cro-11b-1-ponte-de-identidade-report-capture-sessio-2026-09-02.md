# Checkout CRO 11B.1 — Ponte de identidade `report_capture_session` → checkout Pro (9€)

Objectivo único (P0 identidade/segurança): quem já deu o email no Estado B chega ao checkout de 9€ sem voltar a ver o Account Gate — sem que isso crie sessão global, conta ou password. Nenhuma alteração visual, de motion, de passos do checkout ou de Report UX.

## Estado actual confirmado (leituras feitas)

- `checkout.report-full.tsx` decide o gate por `getLeadSessionStatus()`, que só lê o cookie global `lead_session` (`src/lib/leads/lead-session.functions.ts`).
- A captura pós-valor (`/api/public/lead-capture`) emite apenas `report_capture_session`, assinado e scoped ao par (lead, `cache_key`) com TTL de 24 h (`report-capture-session.server.ts`). O checkout ignora-o.
- `createEupagoCheckout` resolve o lead exclusivamente por `getLeadFromCookie()`; sem `lead_session` falha antes de qualquer insert.
- Detalhe crítico apanhado na leitura: o CTA Pro (`pro-checkout-search.ts`) envia o **id do snapshot** no parâmetro `report_cache_key`, enquanto o cookie está scoped à `cache_key` do snapshot. Sem tradução server-side, a validação nunca faria match. O padrão correcto já existe em `report-access-state.ts`: snapshot id → `analysis_snapshots.cache_key` → verificar cookie.

## O que vai ser feito

### 1. Resolver de identidade de checkout (novo, server-only)

`src/lib/leads/resolve-checkout-lead.server.ts`:

```text
resolveCheckoutIdentity({ reportRef })
  1. lead_session válido        → { leadId, source: "lead_session" }
  2. senão, reportRef presente:
       reportRef (uuid) → analysis_snapshots.cache_key  (ou reportRef já é cache_key)
       verificar report_capture_session contra essa cache_key
       (assinatura HMAC, TTL, âmbito) e confirmar que o lead existe
                                → { leadId, source: "report_capture_session", cacheKey }
  3. caso contrário             → { leadId: null, source: "none" }
```

Nunca aceita `username`, email do browser, `lead_id` do cliente ou `cache_key` não assinada.

### 2. Estado do checkout sem alterar a semântica global

`getLeadSessionStatus` mantém-se como está (identidade global — usada por `/checkout/credits` e `/checkout/authority-diagnosis`). Acrescenta-se uma função nova, `getCheckoutIdentityStatus({ reportRef })`, que devolve `{ identity: "lead_session" | "report_capture_session" | "none" }`. Só `/checkout/report-full` passa a usá-la. Blast radius mínimo: os outros checkouts ficam intactos.

`CheckoutFlow` renderiza `CheckoutSteps` quando `identity !== "none"`, e o `CheckoutAccountGate` existente (sem redesenho) quando `"none"`.

### 3. Pagamento com identidade scoped

Em `createEupagoCheckout`, substituir a leitura directa do cookie global pela chamada ao resolver, passando `data.report_cache_key` como `reportRef`. Regras mantidas:

- sem `leadId` → erro seguro, nenhum insert, nenhum guest checkout;
- `lead_payments.lead_id`, `report_cache_key`, webhook, entitlement, idempotência e analytics inalterados;
- restrição de produto: por identidade scoped só é aceite `report_full_9`. Packs e o diagnóstico de 97€ continuam a exigir `lead_session`.

### 4. Binding obrigatório à `cache_key`

Se o cookie de captura não corresponder exactamente à `cache_key` do relatório indicado no URL, a identidade é `none`: Account Gate, sem fallback por username. Trocar `report_cache_key` à mão não autoriza nada.

### 5. Políticas explícitas

- **Precedência:** `lead_session` ganha sempre. Se o relatório não pertencer ao lead autenticado, não há associação automática — o pagamento fica no lead autenticado, com a regra de ownership existente.
- **Sem promoção:** `report_capture_session` continua a não dar `/app`, histórico, packs, dados de conta nem `lead_session`. Não é emitido nenhum cookie novo no checkout.
- **Packs (decisão):** opção B — os packs (5/10 créditos) têm valor reutilizável e global, logo continuam a exigir conta/`lead_session`. Se o utilizador mudar de 9€ para um pack, o Account Gate reaparece nesse ponto.
- **Pós-pagamento (só documentado nesta ronda):** o retorno faz-se pelo `return` path para o relatório, o entitlement é lido pela `cache_key` do pagamento, e o acesso posterior a `/app` continua a exigir verificação de email. Sem password antes da compra.

### 6. Analytics

Acrescentar apenas `checkout_identity_source: "lead_session" | "report_capture_session"` à metadata dos eventos já existentes. Sem eventos novos, sem email, token ou cookie.

## Testes

Segurança (novos, unitários sobre o resolver e o endpoint):
`lead_session` válido → permitido; capture válida + `cache_key` correspondente → permitido; capture válida + outro relatório → negado; capture expirada → negada; assinatura adulterada → negada; sem cookies → gate; username alterado não muda ownership; produto pack com identidade scoped → negado.

Regressão: suite completa + typecheck; confirmação de que `ConversionSheet`, `LoadingQualification`, Dialog/Sheet, Pro Gate e Report UX não são tocados.

Runtime QA (Playwright): Cenário 1 (Estado A → email → Estado B → 9€ → checkout sem modal), Cenário 2 (checkout directo sem cookies → gate), Cenário 3 (autenticado → checkout directo), Cenário 4 (capture de X com `report_cache_key` de Y → gate).

## Ficheiros

- novo `src/lib/leads/resolve-checkout-lead.server.ts`
- novo `src/lib/leads/checkout-identity.functions.ts`
- `src/routes/checkout.report-full.tsx` (apenas a condição do gate)
- `src/lib/payments/eupago.functions.ts` (resolução do lead + guarda de produto)
- novos testes em `src/lib/leads/__tests__/`

Fora de âmbito: passos do checkout, `ReportPlanChooser`, goals, upsell 97€, facturação, preços, success UI, taxonomias e qualquer polish visual.
