
# Auditoria — Gating, sidebar, créditos e plano para bónus beta pós-compra

## 1. Ficheiros inspecionados

- `src/lib/credits/credits.server.ts` — ledger append-only, `grantInitialCredits` (+2), `reserveCredit` (-1), `confirm/release`, `getBalance`.
- `src/lib/credits/lead-reports.server.ts` — associação lead↔relatório (não cobra a 2ª vez).
- `src/lib/credits/__tests__/credits.test.ts` — contrato testado (idempotência, duplicados por `cache_key`).
- `src/routes/api/onboarding/start.ts` — chama `grantInitialCredits(leadId)` depois de criar/atualizar o lead. **É aqui que os 2 créditos são atribuídos hoje, na captura de lead.**
- `src/routes/api/analyze-public-v1.ts` — `reserveCredit` no gate; ledger é consumido por cada análise nova (cache hits do mesmo lead não cobram).
- `src/lib/payments/entitlements.server.ts` — `grantEntitlement` idempotente por `(lead_id, product_code)`.
- `src/lib/payments/eupago.server.ts` / `eupago.functions.ts` — criação de checkout, verificação HMAC.
- `src/routes/api/public/eupago-webhook.ts` — recebe webhook, marca `lead_payments.paid`, chama `grantEntitlement`, `recordProductEvent("payment_webhook_paid")`, dispara email `payment_confirmed` (kill-switch).
- `src/lib/email/send-payment-confirmed.server.ts` — email transacional pós-pagamento (idempotente via `product_events`).
- `src/components/report-redesign/v2/premium-cta-context.tsx` — fonte única de truth do CTA premium (`PremiumInterestDialog`).
- `src/components/report-redesign/v2/premium-interest-dialog.tsx` — modal de pricing/unlock.
- `src/components/report-redesign/v2/report-block-nav.tsx` (linhas 524–693) — `ExploreSection` com chips de período e botão "Add competitor" no sidebar.
- `src/components/report-redesign/v2/analysis-period-selector.tsx`, `sticky-unlock-bar.tsx`, `end-of-free-block.tsx` — outros pontos de entrada do CTA.

## 2. Mapa de comportamento atual

**Free user**
- CTA principal / secções premium / chips de período locked / botão "Add competitor" locked → todos chamam `handlePremiumAccessClick(<source>)` → abre **o mesmo** `PremiumInterestDialog`. ✅
- Nenhum crédito é consumido em modo "ler relatório free" (cache hit do próprio lead = 0 créditos).

**Paid user (premiumUnlocked = true)**
- Sidebar mostra estado "pro" visualmente, mas:
  - Chips 30d / 90d → **sem handler** (botão aria-disabled removido; clicks no-op).
  - "Add competitor" → `scrollToBlock("benchmark")` com TODO explícito ("wire to real competitor manager once available").
- Não existe indicador de saldo de créditos no sidebar.
- Não existe modal de confirmação "Usar 1 crédito".

## 3. Capacidades de créditos já existentes

| Capacidade | Estado |
|---|---|
| Tabela `credit_ledger` + RPC `credit_balance` | ✅ existe |
| Grant idempotente (índice `uniq_credit_ledger_initial_grant`) | ✅ por lead, reason=`initial_grant` |
| Reserve / Confirm / Release | ✅ com índice `uniq_credit_ledger_reserve_per_report` por `(lead_id, cache_key)` |
| Associação a `lead_id` | ✅ obrigatória; `user_id` ainda não usado pelo ledger |
| Reason livre (`admin_adjust`, etc.) | ✅ tipo já inclui `admin_adjust` |
| Product events para grants/usos | ⚠️ Parcial — `analyze-public-v1` emite eventos; o grant inicial **não** emite `product_event`. Webhook EuPago já emite `payment_webhook_paid`. |

**Constatação chave:** os 2 créditos atuais são consumidos no fluxo free (1 para o relatório inicial). Quando o utilizador paga, normalmente já está a 0 ou 1 créditos. Por isso o "bónus beta pós-compra" precisa de ser um **grant separado** ligado ao `payment_id`, não uma reutilização de `grantInitialCredits`.

## 4. Plano de implementação proposto

### 4.1 Backend — grant idempotente pós-pagamento

Criar `grantPostPurchaseBetaCredits({ leadId, paymentId })` em `src/lib/credits/credits.server.ts`:
- Insere uma linha no `credit_ledger` com `delta = +2`, `reason = "admin_adjust"` (já permitido pelo tipo) e `metadata = { kind: "post_purchase_beta_bonus", payment_id }`.
- **Idempotência sem migração:** antes de inserir, faz `select id from credit_ledger where lead_id = $1 and metadata->>'kind' = 'post_purchase_beta_bonus' and metadata->>'payment_id' = $2 limit 1`. Se existir, no-op. (Trade-off explícito: garante idempotência ao nível aplicacional sem alterar o schema; ver §5.)

Chamada a partir de `src/routes/api/public/eupago-webhook.ts`, **dentro** do bloco `if (normalized === "paid")`, **após** `grantEntitlement` e **antes** do `recordProductEvent` existente — ou logo a seguir. Falhas isoladas em `try/catch` (não derrubam o webhook, igual ao padrão atual). Emite também `recordProductEvent({ eventType: "credits_post_purchase_granted", leadId, metadata: { payment_id, delta: 2 }})`.

### 4.2 Frontend — sidebar paid state

`report-block-nav.tsx` (`ExploreSection`, paid branch):
- Mostrar saldo de créditos: chip discreto `"{n} créditos beta disponíveis"` (i18n `nav.explore.beta_credits_available`).
- Período (chips 30d/90d) e "Add competitor" passam a abrir um novo `ConsumeCreditDialog` (a criar em `src/components/report-redesign/v2/consume-credit-dialog.tsx`):
  - Copy contextual ("nova janela 30d" / "adicionar concorrente").
  - Explica que vai recolher e processar dados públicos novos.
  - CTA: `"Usar 1 crédito"` (enabled) se `balance >= 1`.
  - Se `balance < 1`: estado "sem créditos disponíveis" — mensagem + link para feedback/waitlist (sem inventar loja de créditos).

### 4.3 Saldo no cliente

Adicionar server function `getMyCreditBalance` em `src/lib/credits/credits.functions.ts` (a criar) — leitura via cookie `lead_id` já usada pelo onboarding. Consumida pelo `PremiumCtaProvider` (ou novo `CreditsContext`) e exposta como `useCredits()`.

### 4.4 Confirmação → consumo real

**Importante:** o consumo real (`reserveCredit` + nova análise) **fica fora deste plano**. O dialog confirma intenção e, ao "Usar 1 crédito", invoca o endpoint existente `/api/analyze-public-v1` com parâmetros (`window=30`, ou `competitor=<handle>`). Esse endpoint já reserva crédito atomicamente. Se o endpoint ainda não aceitar `window`/`competitor`, marcamos como TODO de follow-up sem mexer agora.

## 5. Alterações de schema

**Nenhuma é estritamente necessária.** A idempotência do bónus pós-compra é assegurada ao nível aplicacional via `select … limit 1` antes do insert.

**Opcional (recomendado em fase 2):** adicionar índice único parcial `uniq_credit_ledger_post_purchase_beta` em `credit_ledger ((metadata->>'payment_id')) where reason = 'admin_adjust' and metadata->>'kind' = 'post_purchase_beta_bonus'` para garantia ao nível de DB. **Não incluo no plano atual** porque o pedido pede para parar e explicar antes de propor changes — posso adicionar a migration num passo seguinte se aprovares.

## 6. Ficheiros que vou editar

- `src/lib/credits/credits.server.ts` — adicionar `grantPostPurchaseBetaCredits`.
- `src/lib/credits/credits.functions.ts` — **novo**, expõe `getMyCreditBalance` ao cliente.
- `src/routes/api/public/eupago-webhook.ts` — chamada ao novo grant.
- `src/components/report-redesign/v2/consume-credit-dialog.tsx` — **novo** modal.
- `src/components/report-redesign/v2/report-block-nav.tsx` — sidebar paid: indicador de saldo + handlers que abrem o dialog.
- `src/components/report-redesign/v2/premium-cta-context.tsx` (ou novo `credits-context.tsx`) — expor `balance` e helpers.
- `src/i18n/locales/pt/*.json` (+ `en/*` para consistência) — strings novas.
- Testes: `src/lib/credits/__tests__/credits.test.ts` (cobrir idempotência do novo grant), pequeno smoke test do webhook.

**Não vou tocar em:** preços, payloads EuPago, lógica de checkout, entitlements rules, geração do relatório, scraping, schema da DB.

## 7. Riscos e safeguards

- **Risco:** webhook re-entregar e duplicar bónus. **Safeguard:** check aplicacional `metadata->>'payment_id'` antes de inserir + `try/catch` isolado.
- **Risco:** revelar o bónus antes da compra. **Safeguard:** strings e indicador de créditos só renderizados quando `premiumUnlocked === true`. Pricing modal/copy não menciona bónus.
- **Risco:** consumo acidental sem confirmação. **Safeguard:** chips de período e "Add competitor" no estado paid passam **sempre** pelo `ConsumeCreditDialog` antes de qualquer fetch.
- **Risco:** lead pagar mas chegar com 0 créditos antigos → confusão. **Safeguard:** bónus é +2 absolutos ao saldo atual; copy do email/modal pós-compra deixa claro "2 créditos beta adicionados".
- **Risco:** alterar contratos do `analyze-public-v1`. **Safeguard:** plano só liga o dialog ao endpoint atual; suporte a `window`/`competitor` fica como follow-up explícito.

## 8. Aprovação

Por favor confirma:
1. OK em usar `reason = "admin_adjust"` + `metadata.kind = "post_purchase_beta_bonus"` (sem migration) para o grant?
2. OK em deixar a parte de "passar `window`/`competitor` ao `analyze-public-v1`" como follow-up separado (este plano só wireia o dialog e o saldo)?
3. OK em revelar o bónus apenas no sidebar pós-compra + no email `payment_confirmed` (sem o anunciar antes)?
