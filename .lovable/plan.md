# Brevo — sync de leads + envio transacional (plano, sem implementar)

## 1 · Auditoria do estado atual

### Envio de email (Resend, espalhado)
Não existe abstração `sendEmail()` central. Cada caller fala HTTP direto com `https://api.resend.com/emails`:
- `src/lib/email/sender.ts` — só `resolveSender()` (lê `RESEND_FROM`, fallback `onboarding@resend.dev`)
- `src/lib/beta.functions.ts:189-220` — request received, fetch direto Resend
- `src/lib/email/send-personal-area-saved.server.ts:13-103` — fetch + timeout + error codes próprios
- `src/routes/api/send-report-email.ts` — report ready, com timeout 10s, códigos `RESEND_FAILED`/`RESEND_TIMEOUT`/`RESEND_SANDBOX_RECIPIENT_BLOCKED`
- `src/routes/api/admin/send-report-link.ts` — admin envia link
- `src/routes/api/admin/send-feedback-request.ts` — feedback
- `src/routes/api/admin/send-commercial-followup.ts` — follow-up comercial

Renderers puros vivem em `src/lib/email/templates/*.ts` (já exportados via `index.ts`) e devolvem `{ subject, text, html }` — independentes do provider, **bom**, ficam reutilizáveis.

### Fluxo de unlock (lead magnet)
- Endpoint: `src/routes/api/public/report-unlock.ts` → delega a `processReportUnlock()` em `src/lib/unlock.server.ts`
- Persistência:
  1. valida com Zod (email, instagram_username, snapshot_id, profile_ownership, goal, user_type, pricing_preference, name)
  2. confirma `analysis_snapshots`
  3. find-or-create em `leads` por `email_normalized`; se existir, preenche apenas campos NULL (conservador)
  4. find-or-create em `report_requests` por `(lead_id, analysis_snapshot_id)`
  5. emite `product_events`: `unlock_email_submitted`, `unlock_completed`, `returning_lead_detected`, `report_saved_to_account`
- **Não envia email.** O envio do "report ready" acontece depois, via admin (`send-report-link`) ou trigger futuro.
- **Não há sync para CRM externo** hoje.

### Campos lifecycle disponíveis em `leads`
`email`, `email_normalized`, `name`, `company`, `user_type`, `purpose` (= goal), `profile_ownership`, `pricing_preference`, `commercial_status` (default `novo_pedido`), `source`, `beta_consent`, `beta_consent_at`, `contacted_at`, `archived_at`, `internal_notes`. **Não existe** `instagram_username` directamente em `leads` — vem de `report_requests.instagram_username`. **Não existe** `is_customer` / `plan` / `last_payment_at` em `leads` (plan vive em `profiles`).

---

## 2 · Arquitetura recomendada

**Princípios:**
- Provider abstraction: um único `sendTransactionalEmail(template, recipient, data)` decide Brevo→fallback Resend.
- Sync Brevo é **side effect não-bloqueante** do unlock e de transições lifecycle. Falha em Brevo nunca quebra UX.
- Estado canónico continua em Supabase. Brevo é **mirror denormalizado** para marketing/automação (não fonte de verdade).
- Idempotência via `email_normalized` (Brevo aceita upsert por email).

```
                         ┌──────────────────────────┐
                         │   processReportUnlock    │  (atual)
                         └──────────┬───────────────┘
                                    │ depois de gravar lead+request
                                    ▼
                         ┌──────────────────────────┐
                         │   queueBrevoSync(leadId, │  (novo, fire-and-forget)
                         │   reason='unlock')       │
                         └──────────┬───────────────┘
                                    │
                          ┌─────────┴──────────┐
                          ▼                    ▼
                   sync contact          add to list
                   (PUT /contacts)       (POST /contacts/lists/{id}/contacts/add)

  send transacional (admin ou auto):
  ┌─────────────────────────────────────────────────────┐
  │  sendTransactionalEmail({ template, to, data })     │
  │   1. render template → { subject, text, html }      │
  │   2. try Brevo (POST /smtp/email)   ── ok? log+done │
  │   3. fail? log brevo_email_failed → try Resend      │
  │   4. fail Resend? log + return error (não relança)  │
  └─────────────────────────────────────────────────────┘
```

### Camadas
- `src/lib/email/providers/brevo.ts` — `sendViaBrevo()`, `upsertContact()`, `addContactToList()`, `removeFromList()`. Usa **connector gateway** (`https://connector-gateway.lovable.dev/brevo/...`) com `Authorization: Bearer LOVABLE_API_KEY` + `X-Connection-Api-Key: BREVO_API_KEY`.
- `src/lib/email/providers/resend.ts` — extrai a lógica HTTP atual de Resend (consolidar `send-report-email.ts`, `send-personal-area-saved.server.ts`, `beta.functions.ts`) num único `sendViaResend()`.
- `src/lib/email/send.server.ts` — `sendTransactionalEmail()` orquestra primary→fallback.
- `src/lib/brevo/sync.server.ts` — `syncLeadToBrevo(leadId, reason)` lê `leads + report_requests`, mapeia para attributes, faz upsert + add-to-list. Idempotente.
- Hooks chamados em:
  - `processReportUnlock` (após sucesso, fire-and-forget via `Promise.allSettled` ou edge waitUntil)
  - futuro `markLeadAsCustomer(leadId)` em fluxo de pagamento (sync com `IS_CUSTOMER=true`, move de lista)
  - `commercial_status` mudanças (admin Kanban) — opcional fase 3

---

## 3 · Setup Brevo — checklist

1. Conectar Brevo via `standard_connectors--connect` com `connector_id: brevo`. Isto cria `BREVO_API_KEY` automaticamente (não é a API key real, é a chave de gateway).
2. Verificar domínio sender em Brevo (`instagramaudit.pt` ou `notify.instagramaudit.pt`) **independentemente** de Resend — sem conflito DNS porque Brevo verifica via TXT/DKIM no domínio raiz, e Lovable Emails (se ativo) só delega o subdomínio `notify.*`. **Confirmar antes**: se já houver delegação NS para Lovable em `notify.instagramaudit.pt`, usar root `instagramaudit.pt` para Brevo.
3. Criar 3 listas em Brevo (UI ou via API uma vez):
   - **InstaBench — Lead Magnet Gratuito** (auto-add no unlock)
   - **InstaBench — Clientes Pagos** (move quando `IS_CUSTOMER=true`)
   - **InstaBench — Intenção Alta** (filtro automático Brevo: `PRICING_PREFERENCE` ∈ {30-50, 50-100} OU `COMMERCIAL_STATUS=potencial_cliente`)
4. Anotar `list_id` numérico de cada lista.
5. Criar atributos custom em Brevo (Contacts → Attributes), todos opcionais, ver tabela §5.
6. Criar template transacional **opcional** em Brevo dashboard apenas se quisermos delegar render — **nesta fase mantemos render TS**, Brevo só entrega `subject + html + text`.

---

## 4 · Secrets necessários

| Secret | Tipo | Origem | Notas |
|---|---|---|---|
| `BREVO_API_KEY` | runtime | gerado pelo `connect` | gateway connection key, não a API key bruta |
| `LOVABLE_API_KEY` | runtime | já existe | gateway auth |
| `BREVO_LEAD_MAGNET_LIST_ID` | runtime | manual | int, ID da lista "Lead Magnet" |
| `BREVO_CUSTOMERS_LIST_ID` | runtime | manual | int, lista "Clientes Pagos" |
| `BREVO_FROM_EMAIL` | runtime | manual | ex: `relatorios@instagramaudit.pt` |
| `BREVO_FROM_NAME` | runtime | manual | ex: `InstaBench` |
| `BREVO_REPLY_TO_EMAIL` | runtime opcional | manual | ex: `frederico@instagramaudit.pt` |
| `RESEND_API_KEY` | runtime | já existe | mantido como fallback |
| `RESEND_FROM` | runtime | já existe | fallback only |

---

## 5 · Atributos Brevo (custom)

Tipos (Brevo: TEXT, NUMBER, DATE, CATEGORY, BOOLEAN):

| Atributo | Tipo | Source no Supabase |
|---|---|---|
| `INSTAGRAM_HANDLE` | TEXT | `report_requests.instagram_username` (último) |
| `REPORTS_COUNT` | NUMBER | `count(report_requests where lead_id=...)` |
| `LAST_REPORT_URL` | TEXT | URL público do último relatório |
| `LAST_REPORT_AT` | DATE | `max(report_requests.created_at)` |
| `PROFILE_OWNERSHIP` | CATEGORY | `leads.profile_ownership` |
| `GOAL` | CATEGORY | `leads.purpose` |
| `USER_TYPE` | CATEGORY | `leads.user_type` |
| `PRICING_PREFERENCE` | CATEGORY | `leads.pricing_preference` |
| `LEAD_SOURCE` | CATEGORY | `leads.source` |
| `COMMERCIAL_STATUS` | CATEGORY | `leads.commercial_status` |
| `IS_CUSTOMER` | BOOLEAN | derivado (true se `profiles.plan != 'free'` ou pagamento existe) |
| `PLAN` | CATEGORY | `profiles.plan` (default `free`) |
| `LAST_PAYMENT_AT` | DATE | futura tabela payments (placeholder por agora) |
| `FIRST_NAME` | TEXT | `leads.name` (split) |
| `BETA_CONSENT` | BOOLEAN | `leads.beta_consent` |

**Nota**: nada de PII sensível além do necessário; `internal_notes` **nunca** sincronizado para Brevo.

---

## 6 · Listas Brevo

| Lista | Critério add | Critério remove |
|---|---|---|
| **Lead Magnet Gratuito** | unlock bem-sucedido | nunca (histórico); marketing pode segmentar excluindo `IS_CUSTOMER=true` |
| **Clientes Pagos** | `IS_CUSTOMER=true` | downgrade para free |
| **Intenção Alta** | filtro automático Brevo (não gerido por código): `PRICING_PREFERENCE ∈ {30-50,50-100}` OU `COMMERCIAL_STATUS=potencial_cliente` | gerido por Brevo |

**Add explícito por código**: só Lead Magnet e Clientes Pagos. Intenção Alta é segmento dinâmico Brevo-side.

---

## 7 · Provider fallback — estratégia

```ts
async function sendTransactionalEmail({ template, to, data, idempotencyKey }) {
  const rendered = renderTemplate(template, data);  // pure TS

  // Primary: Brevo
  try {
    const r = await sendViaBrevo({ to, ...rendered, idempotencyKey });
    await recordProductEvent('brevo_email_sent', { template, to_hash, message_id: r.messageId });
    return { ok: true, provider: 'brevo', messageId: r.messageId };
  } catch (err) {
    await recordProductEvent('brevo_email_failed', { template, to_hash, error_code: classify(err) });

    // Fallback: Resend (apenas em hard failure ou timeout, não em 4xx de validação)
    if (isRetryableProviderError(err)) {
      try {
        const r2 = await sendViaResend({ to, ...rendered });
        await recordProductEvent('resend_fallback_email_sent', { template, to_hash, message_id: r2.id });
        return { ok: true, provider: 'resend', messageId: r2.id };
      } catch (err2) {
        await recordProductEvent('resend_fallback_email_failed', { template, to_hash, error_code: classify(err2) });
        return { ok: false, provider: 'none', error: 'BOTH_PROVIDERS_FAILED' };
      }
    }
    return { ok: false, provider: 'brevo', error: classify(err) };
  }
}
```

**Regras:**
- Timeout Brevo: 8s (igual ao padrão atual de Resend)
- Brevo 4xx de validação (email inválido, domínio não verificado) → **não cair para Resend** (mesmo erro lá)
- Brevo 5xx, timeout, network → fallback Resend
- Falha de email no fluxo unlock **nunca** retorna 5xx ao cliente; só log+evento
- Hash do email (`to_hash`) nos eventos para evitar PII em product_events

### Eventos `product_events`
- `brevo_contact_synced` (metadata: `lead_id`, `list_ids`, `attributes_count`)
- `brevo_contact_sync_failed` (metadata: `lead_id`, `error_code`, `http_status`)
- `brevo_email_sent` (metadata: `template`, `message_id`, `to_hash`)
- `brevo_email_failed` (metadata: `template`, `to_hash`, `error_code`, `http_status`)
- `resend_fallback_email_sent` / `resend_fallback_email_failed` (mesma forma)

---

## 8 · Onde inserir hooks

| Local | Hook | Fase |
|---|---|---|
| `processReportUnlock` (após INSERT report_request, antes do return) | `void syncLeadToBrevo(leadId, 'unlock').catch(noop)` | 1 |
| `processReportUnlock` (idem) | nada de email aqui — envio continua a ser admin/automação | — |
| `send-report-link` admin | `sendTransactionalEmail('report_ready', ...)` em vez de Resend direto | 2 |
| `beta.functions.ts request_received` | `sendTransactionalEmail('request_received', ...)` | 2 |
| `send-personal-area-saved.server.ts` | `sendTransactionalEmail('personal_area_saved', ...)` | 2 |
| `send-feedback-request` admin | `sendTransactionalEmail('feedback_request', ...)` | 2 |
| `send-commercial-followup` admin | `sendTransactionalEmail('commercial_followup', ...)` | 2 |
| futuro `markLeadAsCustomer(leadId)` | `syncLeadToBrevo(leadId, 'customer_upgrade')` + move de lista | 3 |
| admin Kanban onChange `commercial_status` | `syncLeadToBrevo(leadId, 'status_change')` (debounced) | 3 |

---

## 9 · Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Brevo down → unlock parado | Sync é fire-and-forget; nunca `await` bloqueante no critical path |
| Duplicação contactos (case email) | Sempre normalizar email (lowercased trimmed) — já é feito |
| GDPR / consentimento marketing | Adicionar lista só quando `beta_consent=true` ou source = `public_report_unlock` (consentimento implícito do lead magnet); documentar política |
| Atributos Brevo divergem do schema Supabase | `syncLeadToBrevo` usa map central tipado; teste unit com fixture |
| Rate limit Brevo (10 req/s grátis) | Fila simples in-memory por instância; se >5 syncs paralelos, throttle 200ms |
| Conflito DNS com Lovable Emails | Brevo usa root domain; Lovable subdomínio — confirmar no setup |
| Email enviado 2x (Brevo ok mas timeout client) | `idempotencyKey` em `headers.X-Mailin-Custom` Brevo + dedup em `product_events` |
| `internal_notes` vazado para Brevo | whitelist de campos no mapper, não passar `lead` cru |
| Custos: Brevo grátis 300 emails/dia | Monitorizar contagem em `product_events`, alertar admin perto do limite |
| Migração big-bang quebra envios atuais | Refactor por trás de feature flag `EMAIL_PROVIDER_PRIMARY=brevo|resend` |

---

## 10 · Plano faseado

### Fase 0 — Conector + secrets (sem código de produto)
- Conectar Brevo (gera `BREVO_API_KEY`)
- Adicionar `BREVO_LEAD_MAGNET_LIST_ID`, `BREVO_CUSTOMERS_LIST_ID`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`
- Verificar domínio sender em Brevo
- Criar 3 listas + atributos custom no dashboard Brevo
- **Critério**: `verify_credentials` no gateway retorna `verified`

### Fase 1 — Brevo client + sync (sem mudar emails)
- `src/lib/brevo/client.server.ts` (gateway wrapper)
- `src/lib/brevo/sync.server.ts` com `syncLeadToBrevo(leadId, reason)`
- Hook fire-and-forget em `processReportUnlock`
- Eventos `brevo_contact_synced` / `brevo_contact_sync_failed`
- Endpoint admin `/api/admin/brevo/resync` (manual, rate-limited) para back-fill de leads existentes
- **Critério**: novo unlock cria contacto em Brevo com atributos corretos; falha não bloqueia unlock

### Fase 2 — Email abstraction + Brevo primary, Resend fallback
- `src/lib/email/providers/brevo.ts`, `providers/resend.ts`
- `src/lib/email/send.server.ts` com `sendTransactionalEmail()` + fallback
- Refactor incremental dos 5 callsites Resend para usar `sendTransactionalEmail()`
- Feature flag `EMAIL_PROVIDER_PRIMARY` (default `brevo`, fallback configurável)
- **Critério**: cada uma das 5 templates envia via Brevo; admin pode forçar Resend via flag; logs separam provedor

### Fase 3 — Lifecycle sync (status + customer)
- `markLeadAsCustomer()` (placeholder, à espera do fluxo de pagamento)
- Trigger sync em mudança de `commercial_status` no Kanban admin
- Move de lista Lead Magnet → Clientes Pagos
- **Critério**: alterar status no admin atualiza Brevo ≤30s

### Fase 4 — Observabilidade
- Painel admin "Emails & Brevo": contagens 24h por provedor, taxa de falha, último sync por lead, alerta perto do limite Brevo
- Webhook Brevo para bounces/complaints → atualiza `leads.email_invalid` (nova coluna fase futura)

---

## 11 · Primeiro prompt de implementação (Fase 0+1)

> *Use Plan Mode first.*
>
> **Goal:** Conectar Brevo e implementar `syncLeadToBrevo` como side-effect fire-and-forget no `processReportUnlock`, sem alterar envio de emails (Resend continua intocado).
>
> **Steps:**
> 1. Chamar `standard_connectors--connect` com `connector_id: brevo` para criar `BREVO_API_KEY`.
> 2. Pedir secrets adicionais via `add_secret`: `BREVO_LEAD_MAGNET_LIST_ID`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME` (sem `BREVO_CUSTOMERS_LIST_ID` — só fase 3).
> 3. Criar `src/lib/brevo/client.server.ts` com:
>    - `brevoFetch(path, init)` que injeta headers `Authorization: Bearer LOVABLE_API_KEY` + `X-Connection-Api-Key: BREVO_API_KEY` + base `https://connector-gateway.lovable.dev/brevo`
>    - timeout 8s, classifica erros (4xx/5xx/timeout/network)
> 4. Criar `src/lib/brevo/sync.server.ts` com `syncLeadToBrevo(leadId, reason)`:
>    - lê `leads` + último `report_requests` (instagram_username, created_at)
>    - constrói payload `{ email, attributes: { FIRST_NAME, INSTAGRAM_HANDLE, REPORTS_COUNT, LAST_REPORT_AT, PROFILE_OWNERSHIP, GOAL, USER_TYPE, PRICING_PREFERENCE, LEAD_SOURCE, COMMERCIAL_STATUS, BETA_CONSENT }, listIds: [BREVO_LEAD_MAGNET_LIST_ID], updateEnabled: true }`
>    - `POST /contacts` com `updateEnabled=true` (upsert)
>    - emite `product_events` `brevo_contact_synced` (sucesso) ou `brevo_contact_sync_failed` (erro), com `to_hash` em vez de email
> 5. Em `src/lib/unlock.server.ts`, **após** o último `recordProductEvent` de sucesso e **antes** do return, adicionar:
>    ```ts
>    void syncLeadToBrevo(leadId, 'unlock').catch(() => { /* swallowed; event already logged */ });
>    ```
> 6. Endpoint admin `POST /api/admin/brevo/resync` body `{ leadId }` para forçar resync manual (auth admin obrigatória, sem rate limit nesta fase).
> 7. Testes Vitest:
>    - `sync.server.test.ts` com mock de fetch — payload correto, attribute mapping, missing fields tolerados
>    - integração: `processReportUnlock` continua a retornar `success` mesmo se `syncLeadToBrevo` rejeitar
>
> **Constraints:**
> - **Não** mudar nenhum send Resend
> - **Não** alterar schema (sync usa só read)
> - **Não** chamar Brevo em testes (mock fetch global)
> - **Não** logar email em claro nos `product_events` (hash sha256 truncado a 16 chars)
>
> **Validation:**
> - `bunx tsc --noEmit`
> - `bunx vitest run`
> - manual: unlock real cria contacto em Brevo dashboard com atributos preenchidos
> - manual: simular Brevo down (chave inválida) → unlock continua a retornar 200, evento `brevo_contact_sync_failed` registado

---

## ☐ Checklist do plano
- ☐ Auditoria envio Resend (5 callsites HTTP diretos)
- ☐ Auditoria fluxo unlock (sem CRM externo hoje)
- ☐ Mapeamento de campos Supabase → atributos Brevo
- ☐ Arquitetura side-effect não-bloqueante + abstração `sendTransactionalEmail`
- ☐ Secrets enumerados
- ☐ Listas Brevo definidas (Lead Magnet, Clientes, Intenção Alta dinâmica)
- ☐ Estratégia fallback Brevo→Resend com classificação de erro
- ☐ Eventos product_events para observabilidade
- ☐ 5 fases incrementais (0→4)
- ☐ Primeiro prompt pronto a executar

**Sem ficheiros tocados. Sem chamadas Brevo. Sem schema alterado.**