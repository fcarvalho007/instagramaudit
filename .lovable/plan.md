

## Entendimento

**1. Landing → analyze → gate**: hero (`/`) → `/analyze/$username` → `<PublicAnalysisDashboard>` → `<ReportGateModal>` (form) → `POST /api/request-full-report`.

**2. Análise pública + snapshots**: `/api/analyze-public-v1` cacheia 24h em `analysis_snapshots` (com `id` reutilizável e `expires_at`).

**3. Quota livre**: `request-full-report` conta `report_requests` por `lead_id + request_month + is_free_request=true`. Limite = 2 (`FREE_MONTHLY_LIMIT`). Quando atingido, devolve `error_code='QUOTA_REACHED'` → modal entra em estado `paywall` com 2 cards (3€ pontual + Pro 10€/mês), **ambos disabled** ("Disponível em breve"). Sem card Agency hoje.

**4. Lifecycle do pedido**: insert `report_requests` com `request_status='pending'` → orchestrator transita `pending → processing → completed | failed_pdf | failed_email`.

**5. Pipeline automático**: `runReportPipeline` chama `/api/generate-report-pdf` (idempotente, atualiza `pdf_status`) → `/api/send-report-email` (auth `INTERNAL_API_TOKEN`, lock optimista em `delivery_status`). Gravação em bucket `report-pdfs` (privado, signed URL 7d).

**6. Porquê pagamento agora**: hoje o paywall é cosmético — utilizador esgota quota e fica preso até ao próximo mês. Não há forma de monetizar nem de validar willingness-to-pay. Sem este passo, o produto não tem receita nem sinal de conversão. Subscrições (Pro/Agency) ficam fora porque exigem auth + customer portal + lifecycle de subscription, o que multiplica o âmbito por 5x. One-time é o MVP correto: testa preço, fluxo de checkout, webhook, e ativa o pipeline existente sem tocar em auth.

---

## 🛑 BLOQUEIO — REGRA CRITICAL PROVIDER RULE ACIONADA

A regra do prompt diz: *"If the official EuPago API contract... is not sufficiently available in the current project context, do NOT improvise undocumented integration details."*

**Auditoria do contexto atual:**

| Recurso EuPago | Estado |
|---|---|
| Documentação API no projeto | ❌ Inexistente |
| Secret `EUPAGO_API_KEY` ou similar | ❌ Não está em `fetch_secrets` |
| Conta EuPago do utilizador | ❌ Não confirmada (sandbox vs produção) |
| Endpoint base (sandbox/prod) | ❌ Desconhecido |
| Schema do payload de criação de link hosted | ❌ Desconhecido |
| Schema do webhook + método de validação de assinatura | ❌ **Crítico — sem isto qualquer um pode forjar pagamentos** |
| Identifier de transação devolvido | ❌ Desconhecido |
| Métodos de pagamento ativos na conta (MB Way, cartão, Multibanco) | ❌ Desconhecidos |
| Política de retorno (return_url, success/cancel) | ❌ Desconhecida |

**EuPago tem múltiplas APIs distintas** (REST 3.0, SOAP legacy, Pay-by-Link, Direct API por método). Não é possível decidir qual sem confirmação.

**Risco de improviso**: implementar com payload inventado → 4xx em produção, ou pior, webhook sem validação de assinatura → forjar pagamentos pagos sem nunca pagar. Inaceitável.

---

## Detalhes técnicos EuPago em falta (mínimo para prosseguir)

Antes de qualquer código, preciso de **resposta concreta** a:

1. **Conta EuPago**: existe? sandbox ativada? qual o `clientId` / `username` da conta? (não preciso do valor, preciso de saber que existe)
2. **Produto contratado**: "Pay-by-Link" / "API REST 3.0" / "Multibanco direto" / "MB Way direto"? Documentação relevante: link público da EuPago doc para o produto escolhido.
3. **Credenciais a guardar como secrets** (nomes esperados):
   - `EUPAGO_API_KEY` (ou `EUPAGO_CLIENT_SECRET`)
   - `EUPAGO_CLIENT_ID`
   - `EUPAGO_ENVIRONMENT` = `sandbox` | `production`
   - `EUPAGO_WEBHOOK_SECRET` (chave HMAC para validar webhook — **sem isto não há integração segura**)
4. **Endpoint base**: `https://sandbox.eupago.pt/...` vs `https://clientes.eupago.pt/...` — confirmar.
5. **Webhook**: EuPago suporta HMAC signature? IP whitelist? Query token? **Como é validado server-side?**
6. **Payload de criação de link**: campos obrigatórios (`valor`, `id`, `chave`, `descricao`, `email`, etc.) e formato exato da resposta (onde vem `checkout_url` e `referencia`).
7. **Identificador de correlação**: que campo é devolvido no webhook que permite ligar de volta ao `payment_session.id`? (geralmente `identifier` ou `referencia` enviado no create — confirmar).

---

## O que faria SE os bloqueios fossem resolvidos

Para o utilizador validar o âmbito, esboço do plano que executaria depois (não implemento agora):

**Schema (1 migração):**
- `payment_status text not null default 'not_required'` + `paid_at timestamptz` em `report_requests`
- Tabela `payment_sessions` (campos como propostos no prompt)
- `is_free_request=false` para requests pagos; nova quota gate aceita `payment_status='paid'` como bypass

**Backend:**
- `POST /api/create-paid-report-checkout` — valida snapshot, upsert lead, insere `report_requests` com `request_status='awaiting_payment'`, cria `payment_session`, chama EuPago, devolve `checkout_url`
- `POST /api/eupago-webhook` — valida assinatura, resolve `payment_session` por `provider_reference`, marca `paid`, atualiza `report_requests`, chama `runReportPipeline` em background
- `runReportPipeline` aceita request com `request_status='awaiting_payment'` apenas se `payment_status='paid'`

**Frontend:**
- 3 cards no paywall (Extra 3€ ativo, Pro 10€/mês "Em breve", Agency 39€/mês "Em breve")
- Pro destacado como "Recomendado" (já está hoje)
- Click no Extra → POST checkout → redirect para `checkout_url`
- Nova route `/pagamento/confirmacao` com mensagem calma "Pagamento em confirmação"

**Ficheiros a tocar (todos não-locked):**
- `supabase/migrations/{ts}_payment_sessions.sql` (criar)
- `src/lib/payments/eupago-client.server.ts` (criar)
- `src/routes/api/create-paid-report-checkout.ts` (criar)
- `src/routes/api/eupago-webhook.ts` (criar)
- `src/routes/pagamento.confirmacao.tsx` (criar)
- `src/components/product/report-gate-modal.tsx` (editar — adicionar 3º card + ativar CTA)
- `src/lib/orchestration/run-report-pipeline.ts` (editar — gate `payment_status`)

**Locked files**: nenhum impactado.

---

## Próximos passos propostos

**Não avanço sem responder ao seguinte:**

1. Confirmar se há conta EuPago e qual produto (Pay-by-Link recomendado para hosted flow).
2. Partilhar **link da documentação oficial EuPago** do produto escolhido.
3. Confirmar que o secret de webhook (HMAC) existe e estará disponível via `add_secret`.
4. Decidir: **Agency** entra como 3º card "Em breve" ou só implementamos 2 cards (Extra ativo + Pro "Em breve")? O modal hoje tem 2 cards — adicionar Agency é trivial mas o prompt pede explicitamente os 3.

**Alternativa pragmática se EuPago não estiver pronto**: usar Stripe via integração nativa Lovable (`enable_stripe_payments`) — Merchant of Record, zero gestão de credenciais, suporta MB Way em PT, hosted checkout out-of-the-box. Mantém-se future-ready para trocar por EuPago quando a conta estiver pronta.

Sem estas respostas, qualquer código escrito agora fica:
- inseguro (webhook sem validação)
- não-testável (sem credenciais sandbox)
- provavelmente errado (payload improvisado)

