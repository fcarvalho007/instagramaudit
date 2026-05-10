# Brevo · Recuperação de procedimento e fases

Este plano retoma a integração Brevo aprovada anteriormente (msg #3405) e nunca executada — interrompida quando passámos para o fix do header do `/admin` e depois para as melhorias do cockpit. Estado atual confirmado: **Brevo ainda não está ligada** (`list_connections` devolve vazio, sem `BREVO_API_KEY` em secrets), `RESEND_API_KEY` continua a ser o único provider de email, e existe `src/lib/email/templates/` (5 templates) + `src/lib/unlock.server.ts` intactos. Não existe `src/lib/brevo/`.

## Estado atual (auditado)

- `src/lib/email/sender.ts` + `src/lib/email/templates/{request-received,report-ready,feedback-request,personal-area-saved,commercial-followup}.ts` → emails transacionais via Resend (HTTP direto)
- `src/lib/unlock.server.ts` → grava lead em Supabase, dispara email Resend, sem sync externa
- Sem ficheiros `src/lib/brevo/*` ainda
- Connector Brevo disponível mas não ligado (gateway-enabled)

## Princípios

- **Não bloquear o unlock** se a Brevo falhar (sync + email são side-effects fire-and-forget).
- **Resend permanece como fallback**, nunca é desligado.
- **Brevo via gateway Lovable** (`https://connector-gateway.lovable.dev/brevo`), nunca chamada direta.
- **Idempotente**: re-runs não duplicam contactos (Brevo `createContact` faz upsert por email).
- **Observabilidade**: cada passo grava `product_events` (`brevo_*` / `resend_fallback_*`).

---

## Fase 0 — Ligação Brevo (1 tool call, sem código)

1. Pedir ao utilizador para criar/ligar a connection Brevo via `standard_connectors--connect` com `connector_id: "brevo"`.
2. Após ligação:
   - `BREVO_API_KEY` injetada automaticamente nos secrets (chave de gateway, não a API key direta da Brevo).
   - `LOVABLE_API_KEY` já existe (managed).
3. Pedir ao utilizador 3 secrets adicionais via `add_secret`:
   - `BREVO_FROM_EMAIL` — sender verificado na conta Brevo (ex.: `frederico@instabench.app`).
   - `BREVO_FROM_NAME` — nome a mostrar no `From` (ex.: `Frederico · InstaBench`).
   - `BREVO_LEAD_MAGNET_LIST_ID` — id numérico da lista "InstaBench — Lead Magnet Gratuito" criada manualmente no painel Brevo.

**Pré-requisito manual no painel Brevo** (faço guia passo-a-passo no chat antes de pedir secrets):
- Verificar domínio sender (DNS SPF/DKIM).
- Criar 3 listas: "Lead Magnet Gratuito", "Clientes Pagos", "Intenção Alta".
- Criar atributos personalizados (script abaixo na Fase 1 cria-os via API se faltarem):
  `INSTAGRAM_HANDLE`, `REPORTS_COUNT`, `LAST_REPORT_URL`, `LAST_REPORT_AT`, `PROFILE_OWNERSHIP`, `GOAL`, `USER_TYPE`, `PRICING_PREFERENCE`, `LEAD_SOURCE`, `COMMERCIAL_STATUS`, `IS_CUSTOMER`, `PLAN`, `LAST_PAYMENT_AT`.

---

## Fase 1 — Cliente Brevo + sync no unlock (não-bloqueante)

Cria a infra mínima e liga sync ao unlock, **sem mexer em emails ainda**.

**Novos ficheiros:**
```
src/lib/brevo/client.server.ts      # fetch wrapper para o gateway Lovable
src/lib/brevo/contacts.server.ts    # upsertContact, addToList, mapLeadToAttributes
src/lib/brevo/sync.server.ts        # syncLeadToBrevo(leadId, reason): fire-and-forget
src/lib/brevo/types.ts              # BrevoContact, BrevoAttributes, SyncReason
```

**Edits:**
- `src/lib/unlock.server.ts` → após gravar lead/report_request, chamar `void syncLeadToBrevo(lead.id, "report_unlock").catch(() => {})`.
- Adicionar 2 novos `product_events`: `brevo_contact_synced` e `brevo_contact_sync_failed` (com `{ leadId, reason, status, latencyMs, errorMessage? }`).

**Comportamento:**
- 8s timeout por chamada Brevo. Se rebenta, regista evento e continua.
- `upsertContact` faz POST `/contacts` com `updateEnabled: true` + `listIds: [BREVO_LEAD_MAGNET_LIST_ID]`.
- Mapeamento atributos a partir das colunas existentes em `leads` / `report_requests`.

**Validação:** unlock continua a funcionar mesmo com `BREVO_API_KEY` inválida; lead aparece no painel Brevo na lista certa após unlock real.

---

## Fase 2 — Provider abstraction com fallback Resend

Centraliza envio para preparar troca Resend → Brevo + fallback automático.

**Novos ficheiros:**
```
src/lib/email/providers/brevo.server.ts    # sendViaBrevo({ to, subject, html, text })
src/lib/email/providers/resend.server.ts   # sendViaResend(...)  (extraído do código atual)
src/lib/email/send.server.ts               # sendTransactionalEmail() com fallback
```

**Refactor (sem mudar payloads):**
- `sender.ts` e os 5 templates (`request-received`, `report-ready`, `feedback-request`, `personal-area-saved`, `commercial-followup`) passam a chamar `sendTransactionalEmail()` em vez de Resend direto.
- `sendTransactionalEmail()`:
  1. Tenta Brevo (8s timeout).
  2. Se 5xx / timeout / network error → tenta Resend.
  3. Se 4xx (template/email inválido) → não tenta fallback, regista erro e desiste.
  4. Eventos: `brevo_email_sent`, `brevo_email_failed`, `resend_fallback_email_sent`, `resend_fallback_email_failed`.
- `BREVO_TRANSACTIONAL_ENABLED` (env) como kill-switch — se `false`, vai direto a Resend (rollback de 1 segundo).

**Validação:** disparar manualmente cada um dos 5 templates em modo teste contra um email pessoal; confirmar que aparece sempre exatamente 1 email recebido (Brevo OU Resend, nunca ambos).

---

## Fase 3 — Lifecycle sync (status changes + customer upgrade)

Liga eventos de negócio futuros à Brevo.

**Edits:**
- `commercial_status` muda → `syncLeadToBrevo(id, "status_change")` re-envia atributos atualizados.
- Quando o lead pagar (preparar hook futuro):
  - Atributos `IS_CUSTOMER=true`, `PLAN`, `LAST_PAYMENT_AT`.
  - Mover de "Lead Magnet Gratuito" → "Clientes Pagos" (POST `/contacts/lists/{id}/contacts/add` + remove da outra).
- Lista dinâmica "Intenção Alta" alimentada por feedback → flag `INTENT_HIGH`, sync atualiza atributo, list rule no painel Brevo filtra automaticamente.

---

## Fase 4 — Admin observabilidade (mínima)

Reaproveita `/admin/sistema` ou `/admin/automacoes` para mostrar:
- Total de syncs/24h (sucesso/falha).
- Total de emails enviados/24h por provider (Brevo vs Resend fallback).
- Últimos 20 erros Brevo (com mensagem + leadId + timestamp).
- Toggle `BREVO_TRANSACTIONAL_ENABLED` (apenas leitura — flip via secrets).

**Não mexer** em rotas/UI fora de `/admin`. Sem novas tabelas — usa `product_events` que já existe.

---

## Riscos identificados

| Risco | Mitigação |
|---|---|
| Domínio Brevo não verificado → emails bouncem | Fase 0 valida no painel ANTES de Fase 2. Resend continua a funcionar. |
| Atributos personalizados não existem na Brevo → API 400 | Fase 1 cria-os via API no boot do `client.server.ts` (idempotente). |
| Lista `BREVO_LEAD_MAGNET_LIST_ID` errada → contactos perdem-se | Validar id no boot; falhar loud se inválido. |
| Race: 2 unlocks simultâneos do mesmo email | Brevo upsert é idempotente por email. OK. |
| Custos: dispatch duplicado em retries | Idempotency key `unlock-${leadId}` no `product_events` evita logging duplicado. |
| Brevo lento (>8s) bloqueia unlock | `void` + `.catch()` garante fire-and-forget. |

---

## Fora de âmbito (explicitamente)

- Editor de templates no admin (plano separado já aprovado anteriormente — `slots.ts` etc.).
- Webhooks Brevo (bounce/complaint/unsubscribe) — Fase 5+.
- Marketing/newsletter — Brevo só será usada para transacionais + CRM mirror.
- Apify, OpenAI, DataForSEO intactos.
- `/api/public/report-unlock` schema intacto.
- Sem mudanças em `src/integrations/supabase/*`.

---

## Primeiro prompt de implementação (Fase 0)

> "Liga o connector Brevo neste projeto. Antes de pedires secrets adicionais (`BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `BREVO_LEAD_MAGNET_LIST_ID`), guia-me passo-a-passo no painel da Brevo para: (1) verificar o domínio sender, (2) criar as 3 listas com os nomes exatos do plano, (3) confirmar onde encontro o id da lista 'Lead Magnet Gratuito'. Não escreves código nesta fase."

## ☐ Checklist global

- ☐ **Fase 0** — Connector Brevo + 3 secrets + setup manual no painel
- ☐ **Fase 1** — `src/lib/brevo/*` + sync no `unlock.server.ts` (não-bloqueante)
- ☐ **Fase 2** — `sendTransactionalEmail()` com fallback Brevo→Resend
- ☐ **Fase 3** — Lifecycle sync (status, customer, listas dinâmicas)
- ☐ **Fase 4** — Painel mínimo de observabilidade em `/admin`
- ☐ Validação end-to-end com unlock real + screenshot do contacto na Brevo

> **Sugestão:** aprovar e executar **só a Fase 0** primeiro. As Fases 1–4 só fazem sentido com Brevo verificada e listas criadas.