## Objetivo

Integrar EuPago como camada mínima de pagamento, com foco em vender o produto `authority_diagnosis_49` (Diagnóstico de Autoridade Digital — 49€ beta) nos próximos 7 dias. `report_full_9` fica preparado em código mas não exposto agora.

## Decisões de arquitetura

1. **Reutilizar `lead_payments` (já existe)** em vez de criar `payments` nova. Já tem `lead_id`, `product`, `amount_cents`, `currency`, `status`, `provider`, `provider_reference`, `paid_at`, `expired_at`, `metadata`, índices e trigger `updated_at`. Migration mínima: relaxar/atualizar o CHECK de `product` para permitir `authority_diagnosis_49` e `report_full_9`, adicionar colunas `provider_payment_id text`, `provider_checkout_url text`, `report_cache_key text`, `instagram_username text`, índice único parcial em `provider_payment_id WHERE provider_payment_id IS NOT NULL`, índices em `report_cache_key` e `provider_payment_id`. Manter RLS desativado (acesso apenas server-side via `supabaseAdmin`).
2. **Sessão de lead** já existe via cookie `lead_session` (`src/lib/leads/lead-cookie.server.ts`). Reutilizar.
3. **Catálogo de produtos** server-side em `src/lib/payments/products.ts` (constantes — `code`, `amount_cents`, `currency`, `name_pt`). Frontend nunca decide preço.
4. **Entitlements**: adicionar tabela mínima `lead_entitlements(id, lead_id, product_code, payment_id, granted_at, metadata)` com índice único em `(lead_id, product_code)` para idempotência. Para `report_full_9`, o gate de relatório consulta esta tabela (futuro). Para `authority_diagnosis_49`, basta criar entitlement + marcar payment paid; sem unlock automático de produto (é um serviço humano).
5. **Provider EuPago**: cliente em `src/lib/payments/eupago.server.ts` (criar Pay By Link / referência MB WAY+Multibanco via REST). Tudo lido de `process.env` dentro de handlers. Sem chamadas em testes (mock).

## Ficheiros a criar

- `src/lib/payments/products.ts` — catálogo + tipos partilhados (client-safe; só constantes públicas: code/name/price formatado).
- `src/lib/payments/products.server.ts` — getter server-side autoritativo (amount_cents).
- `src/lib/payments/eupago.server.ts` — `createCheckout()`, `verifyWebhookSignature()`.
- `src/lib/payments/entitlements.server.ts` — `grantEntitlement(leadId, productCode, paymentId)` (idempotente via unique).
- `src/lib/payments/eupago.functions.ts` — `createEupagoCheckout` server fn (POST), com validação Zod e middleware de lead session.
- `src/routes/api/public/eupago-webhook.ts` — server route público (assinatura/HMAC obrigatória).
- `src/components/payments/reserve-diagnosis-button.tsx` — botão CTA que chama o server fn e faz `window.location = checkout_url`.
- `src/lib/payments/__tests__/products.test.ts` — valida catálogo + preços.
- `src/lib/payments/__tests__/eupago-webhook.test.ts` — assinatura + idempotência (mock EuPago).
- `src/lib/payments/__tests__/create-checkout.test.ts` — rejeita anónimo, preço server-side.
- Migration: `supabase/migrations/<ts>_payments_eupago.sql`.

## Ficheiros a alterar

- `src/components/report-redesign/v2/premium-interest-dialog.tsx` — substituir CTA principal por `Reservar diagnóstico — 49€ beta`, manter `Relatório completo — 9€` em segundo plano (oculto por flag por enquanto).
- `src/lib/tracking.functions.ts` (ou tipos de eventos) — adicionar event types: `payment_cta_clicked`, `payment_checkout_created`, `payment_checkout_failed`, `payment_webhook_paid`, `payment_webhook_failed`.

## Endpoint — criar checkout

`createEupagoCheckout` (server fn POST):
- Input Zod: `product_code` (enum), `instagram_username` (opt), `report_cache_key` (opt), `return_path` (opt, validado como path relativo).
- Lê `lead_session` cookie via helper existente; rejeita se ausente (401).
- Resolve produto server-side; valida `amount_cents`.
- INSERT em `lead_payments` (status `pending`).
- Chama EuPago (Pay By Link); persiste `provider_payment_id`, `provider_reference`, `provider_checkout_url`.
- Emite `payment_checkout_created` (ou `_failed`).
- Retorna `{ ok: true, checkout_url, payment_id }`.

## Webhook público

`POST /api/public/eupago-webhook`:
- Lê body raw, valida assinatura com `EUPAGO_WEBHOOK_SECRET` (HMAC ou decifragem AES conforme docs EuPago — confirmar formato; ver "Open questions").
- Encontra payment via `provider_payment_id` ou `provider_reference`.
- Idempotência: se já `paid`, retorna 200 sem reaplicar; entitlement insert usa `ON CONFLICT (lead_id, product_code) DO NOTHING`.
- Sucesso → `status='paid'`, `paid_at=now()`, `grantEntitlement`, evento `payment_webhook_paid`.
- Falha/expirado/cancelado → status correspondente, evento `payment_webhook_failed`.
- Retorna 200 sempre que o evento for processado (ou já tinha sido); 401 só em assinatura inválida.

## Secrets necessários

`EUPAGO_API_KEY`, `EUPAGO_WEBHOOK_SECRET`, `EUPAGO_BASE_URL`, `EUPAGO_CHANNEL_ID` (se aplicável), `APP_BASE_URL`. Pedir via `add_secret` quando entrarmos em build mode.

## Catálogo de produtos (server)

| code | name_pt | amount_cents | exposto agora |
|---|---|---|---|
| `authority_diagnosis_49` | Diagnóstico de Autoridade Digital | 4900 | sim |
| `report_full_9` | Relatório completo | 900 | não (preparado) |

## Tracking

Eventos novos: `payment_cta_clicked`, `payment_checkout_created`, `payment_checkout_failed`, `payment_webhook_paid`, `payment_webhook_failed`. Metadata permitida: `product_code`, `amount_cents`, `source_component`, `lead_id` (server-side só). Nunca enviar `EUPAGO_API_KEY` nem payload bruto do provider para o cliente.

## Admin

Sem dashboard novo. Já existe `lead_payments` — se houver listagem trivial em admin existente, adicionar coluna `product_code`/`provider_reference`. Caso contrário, deixar para tarefa seguinte.

## Validação

- `bunx tsc --noEmit`.
- Vitest: catálogo (preço hardcoded), webhook idempotente (2 calls → 1 entitlement, 1 paid_at), assinatura inválida → 401, anónimo → 401, frontend ignora preço (server resolve).
- Sem chamadas reais EuPago: mock de `eupago.server.ts`.

## Configuração EuPago (instruções para o utilizador no fim)

- **Webhook endpoint**: `https://<APP_BASE_URL>/api/public/eupago-webhook`
- **Webhooks 2.0** com encriptação ativada; chave a guardar como `EUPAGO_WEBHOOK_SECRET`.
- **Métodos de pagamento**: MB WAY + Multibanco (mínimo).
- **Eventos**: `payment.paid`, `payment.failed`, `payment.expired`, `payment.cancelled`.
- **Canal/Channel ID**: copiar para `EUPAGO_CHANNEL_ID` se a API exigir.
- **API key**: copiar para `EUPAGO_API_KEY`. Nunca colar em código.

## Riscos e perguntas em aberto

1. **Formato exato da assinatura EuPago Webhooks 2.0**: HMAC-SHA256 do body? AES decryption? Necessita confirmação na conta EuPago antes de implementar — proponho começar com HMAC e ajustar após primeiro teste real.
2. **Pay By Link vs Referência direta**: Pay By Link dá UX uniforme (MB WAY+Multibanco numa só URL). Recomendo Pay By Link.
3. **`report_full_9` entitlement → unlock**: não há ainda gate baseado em `lead_entitlements`. Fica preparado, mas integração com `lead_reports` faz-se em tarefa separada.
4. **Cookie de lead em /report público sem onboarding**: confirmar que utilizadores que abrem CTA no relatório partilhado já têm `lead_session` (sim — vem do gate). Se ausente, botão mostra "iniciar sessão primeiro".

## Não tocar

Onboarding, créditos, Apify/OpenAI/DataForSEO, scoring, thumbnails, custos admin, `lead_reports`, acesso gratuito ao relatório, `/report.example`.