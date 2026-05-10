## Auditoria do estado actual

Mapeei os 5 fluxos transaccionais — não estão todos no mesmo formato:

| Fluxo | Ficheiro | Padrão actual | Eventos hoje |
|---|---|---|---|
| **personal-area-saved** | `src/lib/email/send-personal-area-saved.server.ts` | helper limpo, devolve `{ok, reason}`, sem HTTP | `personal_area_email_sent` / `_failed` ✅ |
| **report-ready** (PDF) | `src/routes/api/send-report-email.ts` | route handler com `fetch` inline + `RESEND_FAILED→502` | só success path |
| **report-ready** (link público) | `src/routes/api/admin/send-report-link.ts` | route handler com `fetch` inline + actualiza `commercial_status` | `report_link_sent` (success) |
| **feedback-request** | `src/routes/api/admin/send-feedback-request.ts` | idem | `feedback_requested` (success) |
| **commercial-followup** | `src/routes/api/admin/send-commercial-followup.ts` | idem | `commercial_followup_sent` / `_failed` ✅ |
| **request-received** | `src/lib/beta.functions.ts` (~L189) | `fetch` inline | — |

Endpoint Brevo via gateway: `POST https://connector-gateway.lovable.dev/brevo/v3/smtp/email`.
Secrets necessários: `BREVO_API_KEY` (✅), `BREVO_FROM_EMAIL` (✅), `BREVO_FROM_NAME` (✅), `RESEND_API_KEY` (✅), `RESEND_FROM` (✅).

---

## Decisão de scope: duas fases

Migrar os 5 sites num único prompt é arriscado — os 4 routes admin devolvem códigos HTTP específicos ao painel (`RESEND_FAILED`, `RESEND_SANDBOX_RECIPIENT_BLOCKED`, `RESEND_TIMEOUT`) e fazem side-effects (status update, lead events com metadata custom). Vou separar:

- **Fase A — este prompt:** construir a abstracção + migrar **só `personal-area-saved`** (helper, único caller, já tem testes, padrão `{ok, reason}` igual ao da abstracção). Provar Brevo em produção com risco contido.
- **Fase B — prompts seguintes (1 por route):** migrar `send-report-email`, `send-report-link`, `send-feedback-request`, `send-commercial-followup`, `request-received` (em `beta.functions.ts`).

A abstracção é construída completa nesta fase (suporta os 5 fluxos), portanto Fase B é só plumbing.

---

## Plano da Fase A

### 1. Criar a abstracção

**`src/lib/email/transactional-email.server.ts`** — server-only, único entry point:

```ts
export type TxFlow =
  | "personal-area-saved"
  | "report-ready"
  | "feedback-request"
  | "request-received"
  | "commercial-followup";

export interface SendTransactionalEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  flowType: TxFlow;
  leadId: string | null;
  reportRequestId?: string | null;
  snapshotId?: string | null;
  handle?: string | null;
  metadata?: Record<string, unknown>;
}

export type SendTransactionalEmailResult =
  | {
      ok: true;
      provider: "brevo" | "resend";
      messageId: string | null;
      latencyMs: number;
      brevoFailed?: { reason: string }; // present quando o Resend foi fallback
    }
  | {
      ok: false;
      brevoReason: string;
      resendReason: string | null;  // null se Resend não estava configurado
      latencyMs: number;
    };

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<SendTransactionalEmailResult>
```

**Comportamento interno (nunca lança):**

1. Tenta **Brevo primeiro** via `brevoFetch("/v3/smtp/email", ...)` (reutiliza o transporte que já existe em `src/lib/brevo/client.server.ts`). Payload:
   ```json
   {
     "sender": { "email": "<BREVO_FROM_EMAIL>", "name": "<BREVO_FROM_NAME>" },
     "to": [{ "email": "<to>" }],
     "subject": "<subject>",
     "htmlContent": "<html>",
     "textContent": "<text>"
   }
   ```
   - Brevo `messageId` chega em `messageId` do response JSON.
   - Sucesso → emite `brevo_email_sent` em `product_events`, devolve `{ ok: true, provider: "brevo", messageId, latencyMs }`.

2. **Falha do Brevo** (qualquer reason: missing key, timeout, 4xx, 5xx, rede): emite `brevo_email_failed` (com `reason`, `latency_ms`, `flow_type`, `email_masked`). Decide fallback:
   - Se `RESEND_API_KEY` ausente → emite o evento de falha específico do fluxo (ver mapping abaixo) e devolve `{ ok: false, brevoReason, resendReason: null }`.
   - Se `RESEND_API_KEY` presente → tenta Resend (`https://api.resend.com/emails`, `from = RESEND_FROM`).

3. **Resend fallback ok** → emite `resend_fallback_email_sent` (com metadata incluindo `brevo_reason`) e devolve `{ ok: true, provider: "resend", messageId, brevoFailed: { reason } }`. **Não** emite o evento "sucesso" do fluxo — o caller faz isso (mantém compatibilidade com flows que já recordam `personal_area_email_sent`).

4. **Resend também falha** → emite o evento de falha específico do fluxo + devolve `{ ok: false, brevoReason, resendReason }`.

**Eventos genéricos novos (adicionar a `ALLOWED_EVENTS` em `tracking.functions.ts`):**
- `brevo_email_sent`
- `brevo_email_failed`
- `resend_fallback_email_sent`

**Mapping flow → evento de falha total** (interno à abstracção):
```
personal-area-saved   → personal_area_email_failed     (já existe ✅)
report-ready          → report_ready_email_failed      (NOVO — adicionar)
feedback-request      → feedback_request_email_failed  (NOVO — adicionar)
request-received      → request_received_email_failed  (NOVO — adicionar)
commercial-followup   → commercial_followup_failed     (já existe ✅)
```

Os 3 NOVOS eventos vão ao allowlist. Eventos de **sucesso** específicos do fluxo continuam a ser registados pelo caller (não pela abstracção) para preservar metadata específica (`report_request_id`, status updates, etc.).

### 2. Migrar `send-personal-area-saved` para a abstracção

Refactor de `src/lib/email/send-personal-area-saved.server.ts`:
- Mantém `renderPersonalAreaSaved` igual (template intacto).
- Substitui o bloco `fetch(RESEND_ENDPOINT, ...)` por `sendTransactionalEmail({ to, subject, html, text, flowType: "personal-area-saved", leadId, reportRequestId, ... })`.
- Mantém a assinatura pública `sendPersonalAreaSavedEmail` e o tipo `{ ok, messageId } | { ok, reason }` (callers de `unlock.server.ts` não mudam). Mapeia `result.ok` → `messageId`; `!result.ok` → `reason: result.brevoReason` (mais Resend reason quando relevante).

Caller existente em `unlock.server.ts` regista `personal_area_email_sent` no caminho de sucesso — **mantém-se**, mas a metadata passa a incluir `provider` (`brevo` ou `resend`) para visibilidade. (Edição mínima: 1 linha extra na metadata.)

### 3. Testes

Criar `src/lib/email/__tests__/transactional-email.test.ts`:

| Cenário | Expectativa |
|---|---|
| Brevo 201 | `provider: "brevo"`, `messageId` capturado, evento `brevo_email_sent` registado, Resend nunca chamado |
| Brevo 500 + Resend 200 | `provider: "resend"`, `brevoFailed.reason` presente, eventos `brevo_email_failed` + `resend_fallback_email_sent` |
| Brevo 500 + Resend 500 | `ok: false`, eventos `brevo_email_failed` + `<flow>_email_failed` |
| Brevo 500 + sem `RESEND_API_KEY` | `ok: false`, `resendReason: null`, evento `<flow>_email_failed` |
| `BREVO_API_KEY` ausente | tenta Resend imediatamente (Brevo falha com `BREVO_API_KEY_MISSING`) |
| AbortError no Brevo (timeout 8s) | reason `BREVO_TIMEOUT` propagada, fallback executa |
| Email mascarado em todas as metadatas | nenhum evento contém o email em claro |

Atualizar `src/lib/email/__tests__/templates.test.ts` se a assinatura interna mudou (não devia — só o transporte muda). Os testes existentes do `send-personal-area-saved` (se existirem) podem precisar de re-mock.

### 4. Validação

- `bunx tsc --noEmit` verde
- `bunx vitest run` verde (todos os 204 testes existentes + os novos)
- `rg "BREVO_API_KEY|RESEND_API_KEY" dist/` após build → zero matches no bundle do browser
- **Smoke test manual** (só após aprovação explícita): 1 unlock real → confirmar `brevo_email_sent` em `product_events` + email recebido com `From: Frederico Carvalho <frederico.carvalho@digitalfc.pt>`. Resend não é chamado.
- **Teste de fallback** (manual): mexer `BREVO_API_KEY` para inválido em dev → repetir unlock → confirmar `brevo_email_failed` + `resend_fallback_email_sent` + email recebido via Resend.

---

## Out of scope (Fase A) — propostos para Fase B

- Migração de `send-report-email.ts` (PDF link).
- Migração de `send-report-link.ts` (link público).
- Migração de `send-feedback-request.ts`.
- Migração de `send-commercial-followup.ts`.
- Migração do envio inline em `beta.functions.ts` (request-received).
- Suppression list (não existe hoje, fora de scope).
- Idempotency keys server-side (não existem hoje).
- Mexer em templates ou copy.
- Schema da BD.
- Testes E2E ao SMTP real.

---

## Ficheiros que vão mudar (Fase A)

**Criados:**
- `src/lib/email/transactional-email.server.ts`
- `src/lib/email/__tests__/transactional-email.test.ts`

**Editados:**
- `src/lib/email/send-personal-area-saved.server.ts` (delega para a abstracção; assinatura pública preservada)
- `src/lib/tracking.functions.ts` (adicionar 6 eventos novos: `brevo_email_sent`, `brevo_email_failed`, `resend_fallback_email_sent`, `report_ready_email_failed`, `feedback_request_email_failed`, `request_received_email_failed`)
- `src/lib/unlock.server.ts` (1 linha: incluir `provider` na metadata de `personal_area_email_sent`)

**Não tocar:**
- Os 4 routes admin (Fase B).
- `src/lib/email/sender.ts`, templates em `src/lib/email/templates/`, `report-email-template.ts`.
- `src/lib/brevo/contacts.server.ts` (já em produção; Phase 1 do Brevo).

---

## Checkpoint

- ☐ `transactional-email.server.ts` criado com Brevo-first + Resend fallback
- ☐ 6 eventos novos no allowlist
- ☐ `send-personal-area-saved` delega para a abstracção, mantém assinatura
- ☐ Testes da abstracção verdes (7 cenários)
- ☐ `tsc` + `vitest` verdes; secrets fora do bundle do browser
- ☐ Pedir aprovação antes de qualquer envio real
