## Avaliação — fase Email 1 (welcome beta) já está 90% feita

A maior parte do que o prompt pede já existe:

| Requisito | Estado |
|---|---|
| Template welcome beta | ✅ `src/lib/email/templates/welcome-beta.ts` |
| Sender server-only | ✅ `src/lib/email/send-welcome-beta.server.ts` |
| Disparo após unlock (apenas brand-new lead) | ✅ `unlock.server.ts:443-487` |
| Dedupe por (lead, snapshot) | ✅ guardado por `createdReportRequest` |
| Não bloqueia unlock se falhar | ✅ try/catch + `await` mas envolvido em try; sender nunca lança |
| Provider Resend (fallback) | ✅ `transactional-email.server.ts` (Brevo+Resend) |
| Evento `..._email_sent` | ⚠️ existe como `welcome_beta_email_sent` (spec pede `beta_welcome_email_sent`) |
| Evento `..._email_failed` | ⚠️ definido em `transactional-email.server.ts` mas como `welcome_beta_email_failed` |
| Cópia: handle, MVP, beta, CTA | ✅ |
| Cópia: "Durante a beta, o acesso é gratuito." | ❌ falta |
| Secondary CTA "Dar feedback…" | ❌ falta (sem URL configurado) |
| Subject = uma das 3 opções | ⚠️ atual "Bem-vindo à beta do InstaBench" — não é exatamente nenhuma |
| Preheader spec | ⚠️ atual "Estamos a validar o produto e o teu feedback conta." (próximo mas não igual) |

## Decisão de naming

**Manter ficheiro `welcome-beta.ts`** (não criar `beta-welcome.ts` paralelo). Renomear ficheiros já em uso causa churn em imports, testes e admin templates registry sem benefício funcional. O nome interno é detalhe de implementação; o que o utilizador vê é o subject.

**Decisão sobre nome dos eventos**: o spec pede `beta_welcome_email_*`, o código atual usa `welcome_beta_email_*`. Vou alinhar com o spec → renomear para `beta_welcome_email_sent` / `beta_welcome_email_failed` em 3 sítios (allowlist de tracking, dispatcher do transactional-email, unlock.server). Sem migração BD: `product_events.event_type` é texto livre.

## Refinamentos a aplicar

### 1. `src/lib/email/templates/welcome-beta.ts`
- Subject → `"Bem-vindo ao piloto InstaBench"` (opção 1 do spec — mais transparente que "beta", consistente com tom "piloto/MVP").
- Preheader → `"Estamos a validar o MVP com utilizadores reais — o teu feedback conta."` (literal do spec).
- Adicionar parágrafo `pMuted("Durante a beta, o acesso é gratuito.")` antes do `signatureHtml()`.
- Aceitar `feedbackUrl?: string | null` no input. Se vier preenchido, renderizar segundo CTA discreto: `pMuted("<a href=\"…\">Dar feedback quando terminares a leitura</a>")`. Se não vier, omitir.
- Atualizar versão `text` (plain-text) com as mesmas linhas.

### 2. `src/lib/email/send-welcome-beta.server.ts`
- Aceitar `feedbackUrl?: string | null` em `SendWelcomeBetaArgs` e propagar para `renderWelcomeBeta`.
- Resolver default a partir de `process.env.FEEDBACK_URL` (trim, vazio → null).

### 3. `src/lib/unlock.server.ts`
- Renomear `eventType: "welcome_beta_email_sent"` → `"beta_welcome_email_sent"`.
- Adicionar bloco de **failure event**: se `res.ok === false`, registar `beta_welcome_email_failed` com `metadata: { reason: res.reason, report_request_id, …email_masked }`.
- Não tocar no caminho `personal-area-saved` (returning leads continuam intactos).

### 4. `src/lib/email/transactional-email.server.ts`
- Atualizar mapa de flow → failure event: `"welcome-beta": "beta_welcome_email_failed"`.

### 5. `src/lib/tracking.functions.ts`
- Renomear allowlist: `"welcome_beta_email_sent"` → `"beta_welcome_email_sent"`, `"welcome_beta_email_failed"` → `"beta_welcome_email_failed"`.

### 6. Testes
- Atualizar quaisquer testes em `src/lib/email/__tests__` que esperem o subject antigo ou os eventos antigos. Vou verificar e corrigir.

## Não tocar

- Filename `welcome-beta.ts` (decisão consciente — vê acima)
- `personal-area-saved` (returning leads)
- Provider stack (Brevo+Resend já existe; spec diz "use existing")
- Brevo `BETA_WELCOMED_AT` stamp (já correto)
- Report UI, PDF, Apify, OpenAI, DataForSEO
- Migração BD

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (testes existentes + atualizados)
- Manual:
  1. Unlock com email novo → recebe email com novo subject/preheader, parágrafo "Durante a beta…", sem secondary CTA (porque `FEEDBACK_URL` ainda não está definido)
  2. Unlock 2× com mesmo (email, snapshot) → 1 só email enviado (dedupe por `createdReportRequest`)
  3. Unlock returning lead em snapshot novo → `personal-area-saved` (não `welcome-beta`)
  4. Forçar falha (rotacionar Brevo+Resend keys local) → unlock continua, `beta_welcome_email_failed` registado em `product_events`
  5. Definir `FEEDBACK_URL` e repetir → email passa a ter secondary CTA

## Eventos finais

- `beta_welcome_email_sent` — metadata: `message_id`, `provider`, `report_request_id`
- `beta_welcome_email_failed` — metadata: `reason`, `report_request_id`, `email_masked`

## Ficheiros alterados

- `src/lib/email/templates/welcome-beta.ts`
- `src/lib/email/send-welcome-beta.server.ts`
- `src/lib/email/transactional-email.server.ts`
- `src/lib/unlock.server.ts`
- `src/lib/tracking.functions.ts`
- `src/lib/email/__tests__/*` (se necessário após verificação)

## Pergunta antes de avançar

Vou usar **subject "Bem-vindo ao piloto InstaBench"** (opção 1 do spec). Confirmas, ou preferes outra das opções:
- (A) "Bem-vindo ao piloto InstaBench" *(default proposto)*
- (B) "Obrigado por testares o InstaBench"
- (C) "O teu acesso ao InstaBench beta está ativo"