## Block A — Auditoria de senders e preparação do envio externo

### 1. Auditoria de senders

| # | Sender | Ficheiro | Usa `resolveSender()`? | Hardcoded? |
|---|---|---|---|---|
| 1 | `personal-area-saved` | `src/lib/email/send-personal-area-saved.server.ts:70` | ✅ sim | — |
| 2 | `report-ready` (legacy unlock email) | `src/routes/api/send-report-email.ts:268` | ✅ sim | — |
| 3 | `commercial-followup` | `src/routes/api/admin/send-commercial-followup.ts:176` | ✅ sim | — |
| 4 | `feedback-request` | `src/routes/api/admin/send-feedback-request.ts:25,198` | ❌ não | ❌ `const SENDER_FROM = "InstaBench <onboarding@resend.dev>"` |
| 5 | `report-link` (admin reenvia link) | `src/routes/api/admin/send-report-link.ts:27,238` | ❌ não | ❌ mesma constante hardcoded |
| 6 | `request-received` (auto após pedido beta) | `src/lib/beta.functions.ts:207` | ❌ não | ❌ `from: "InstaBench <onboarding@resend.dev>"` inline |
| — | helper | `src/lib/email/sender.ts:9` | — | ⚠️ tem `DEFAULT_SENDER_FROM` como fallback de sandbox (intencional, declarado no JSDoc) |

**Conclusão:** 3 dos 6 senders **ignoram** `resolveSender()` e enviam sempre via sandbox — irão falhar com `RESEND_403` para qualquer destinatário externo, mesmo após `RESEND_FROM` estar definido. Tem de se uniformizar **antes** do smoke test.

### 2. Estado das secrets

Já configuradas:
- ✅ `RESEND_API_KEY`
- ✅ `PDF_PUBLIC_BASE_URL` (usado como fallback do base URL)

Em falta para Bloco A:
- ❌ `PUBLIC_APP_BASE_URL` — o pedido pede valor explícito `https://instagramaudit.lovable.app`
- ❌ `RESEND_FROM` — **não criar ainda** sem confirmares verificação do domínio

### 3. Verificação do domínio Resend

Não consigo consultar o estado da conta Resend a partir do sandbox. **Antes** de pedir `RESEND_FROM` precisas de confirmar no painel Resend (Domains):

Checklist DNS para `instagramaudit.pt`:
- [ ] Domínio aparece como **Verified** em Resend → Domains
- [ ] **SPF**: `TXT @ "v=spf1 include:amazonses.com ~all"` (ou o include indicado por Resend)
- [ ] **DKIM**: 3 CNAMEs (`resend._domainkey`, `resend2._domainkey`, `resend3._domainkey`) a apontar para `*.dkim.amazonses.com` indicados pela própria Resend
- [ ] **DMARC**: `TXT _dmarc "v=DMARC1; p=none; rua=mailto:postmaster@instagramaudit.pt"` (mínimo recomendado)
- [ ] Sender verificado no painel: `relatorios@instagramaudit.pt` (ou outro que confirmes)

Se algum item falhar → paro aqui e devolvo-te a checklist; **não defino** `RESEND_FROM`.

### 4. Alterações de código (refactor mínimo, sem mudar comportamento de envio)

Substituir as 3 constantes hardcoded por `resolveSender()`:

- `src/routes/api/admin/send-feedback-request.ts`
  - Remover `const SENDER_FROM = ...`
  - Adicionar `import { resolveSender } from "@/lib/email/sender"`
  - Trocar `from: SENDER_FROM` por `from: resolveSender()`

- `src/routes/api/admin/send-report-link.ts`
  - Mesma transformação

- `src/lib/beta.functions.ts` (bloco `request-received`)
  - Importar `resolveSender` (dynamic ou estático no topo)
  - Trocar `from: "InstaBench <onboarding@resend.dev>"` por `from: resolveSender()`

Sem alterar `src/lib/email/sender.ts` — o fallback fica documentado como sandbox; quando `RESEND_FROM` estiver definido, `resolveSender()` devolve o valor correto.

**Nada mais muda:** templates, lógica de tracking, eventos `*_email_sent`/`*_email_failed`, schema, UI pública — tudo intacto.

### 5. Sequência de execução

1. **Refactor** dos 3 senders → `bunx tsc --noEmit` + `bunx vitest run` verdes.
2. **Adicionar secret** `PUBLIC_APP_BASE_URL` = `https://instagramaudit.lovable.app` via `secrets--add_secret`.
3. **Pausa** — perguntar-te:
   - "Domínio `instagramaudit.pt` está Verified em Resend?"
   - "Confirmas o sender exato? Sugestão: `InstaBench <relatorios@instagramaudit.pt>`"
4. Se sim → adicionar secret `RESEND_FROM` com o valor confirmado por ti.
5. Outra **pausa** — pedir-te o email destinatário do smoke test.

### 6. Plano de smoke test (só executa após autorização explícita)

**Pré-requisitos satisfeitos antes de correr:**
- `RESEND_FROM` definido com domínio verificado (não `onboarding@resend.dev`)
- `PUBLIC_APP_BASE_URL` definido
- Email destinatário fornecido por ti

**Procedimento:**
1. Identificar uma `lead` real ou de teste com snapshot pronto (sem chamar Apify/OpenAI/DataForSEO — só leitura).
2. Atualizar temporariamente o `email` dessa lead para o destinatário que indicaste (UPDATE direto via migração ou script — só esta linha).
3. Invocar `sendPersonalAreaSaved(...)` (server fn em `src/lib/email/send-personal-area-saved.server.ts`) com o `lead_id` e `report_request_id` correspondentes — uma única chamada.
4. Inspecionar:
   - resposta da função: `{ ok: true, messageId }` (Resend 200)
   - `product_events` últimos 60s: confirmar **um** evento `personal_area_email_sent` com `metadata.message_id` preenchido e **zero** `personal_area_email_failed`
   - HTML do template contém `https://instagramaudit.lovable.app/...` (não localhost, não `lovable.app` antigo)
5. Reverter o email da lead ao valor original.
6. Reportar resultado.

**Bloqueios duros:** se algum passo de verificação falhar, paro e reporto sem reenviar.

### 7. Validação

- `rg "onboarding@resend.dev|RESEND_FROM|resolveSender" src/` — esperado: `onboarding@resend.dev` apenas em `src/lib/email/sender.ts` (fallback documentado); `resolveSender` em todos os 6 sites de envio.
- `bunx tsc --noEmit` — 0 erros
- `bunx vitest run` — 180/180 passar
- Smoke test só após tua autorização

### 8. Resposta final esperada

Após implementação devolvo: ficheiros alterados, secrets criadas (e quais ficaram pendentes), estado da verificação do domínio (com base no que me confirmares) e o plano exato do smoke test pronto a ser disparado quando autorizares.