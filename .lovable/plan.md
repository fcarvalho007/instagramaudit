# Beta: remover obrigatoriedade de OTP + construir verificação Brevo/Resend (latente)

## Diagnóstico actual

- `/api/onboarding/start` (novo email) e `/check-email + signInWithOtp` (email existente) **ambos** mandam OTP pela Supabase Auth (remetente `no-reply@auth.lovable.cloud`, template inglês "One-time login link"). É o que se vê nas screenshots.
- Cookie `lead_session` e os 2 créditos grátis só são emitidos em `/api/onboarding/claim-existing`, **depois** do utilizador colar o código de 6 dígitos no modal — bloqueia a entrada em beta.
- O projecto **já tem** stack próprio de email transaccional pronto em `src/lib/email/transactional-email.server.ts`: Brevo (gateway Lovable) → Resend como fallback, com kill-switches, eventos `brevo_email_sent / brevo_email_failed / resend_fallback_email_sent` e flowFailure por tipo de fluxo. Vamos reaproveitar tudo — sem `email_domain--scaffold_*`, sem mandar pela infra Lovable.

## Estratégia em duas camadas

### Camada A — Beta: bypass total do OTP (activa por defeito)

Atrás de uma flag de runtime `EMAIL_VERIFICATION_MODE` (env, três valores: `off` | `magic_link` | `otp`). Default em beta = `off`.

1. **`/api/onboarding/start` (novo email, modo `off`)**:
   - Faz `upsertLead` exactamente como hoje.
   - Imediatamente `grantInitialCredits(leadId)` e `setLeadCookie(leadId)`.
   - Devolve `{ ok: true, lead_id, credits, verification_required: false }`.
   - NÃO chama `signInWithOtp`. NÃO envia email de verificação.
   - Best-effort: dispara o e-mail de boas-vindas já existente (`send-welcome-beta`) para confirmar o registo sem pedir nada ao utilizador.

2. **`/api/onboarding/check-email` (email existente, modo `off`)**:
   - Adiciona ao response `{ verification_mode: "off" }` para o cliente saber não ir para OTP.
   - Cliente, ao ver `exists: true` + modo `off`, chama um novo endpoint `/api/onboarding/claim-existing-beta` (POST `{ email }`) que faz `findOrCreateLeadForEmail` por email, emite `lead_session`, garante créditos.
     - **Risco aceite pelo utilizador**: sem prova de propriedade, qualquer pessoa que escreva um email alheio entra na conta desse lead. Aceitável em beta privada controlada (poucos utilizadores, sem PII sensível além de relatórios públicos do Instagram). Mitigação ligeira: rate-limit por IP (5/h) + log `lead_claimed_without_verification` para auditoria.

3. **Cliente (`onboarding-modal.tsx`)**:
   - Lê `verification_mode` a partir do `check-email`/`start`.
   - Quando `off`: salta o ecrã OTP, vai directo para o success/redirect com o relatório.
   - Quando `magic_link` ou `otp`: usa o caminho da Camada B.

### Camada B — Verificação própria (construída mas inactiva)

Quando `EMAIL_VERIFICATION_MODE=magic_link` (ou `otp`), trocamos Supabase Auth pelo nosso stack. Tudo já fica pronto agora, latente.

1. **Token assinado** — `src/lib/email/verification-token.server.ts`:
   - Reaproveita o padrão de `unsubscribe-token.server.ts` (HMAC-SHA256 + payload base64url).
   - Payload: `{ lead_id, email_normalized, exp }` (TTL 30 min).
   - `signVerificationToken(payload)` / `verifyVerificationToken(token)` — never-throw.
   - Segredo dedicado: `EMAIL_VERIFICATION_SECRET` (novo). Fallback ao `UNSUBSCRIBE_TOKEN_SECRET` apenas para evitar quebra em dev.

2. **Template PT-PT simpático** — `src/lib/email/templates/verify-email.ts`:
   - Função `renderVerifyEmail({ first_name, handle, magic_link_url, expires_in_min })` devolve `{ subject, html, text }`.
   - Tom: assinado pelo "AuditProfiles", explica em 3 linhas o que é a plataforma e diz que a confirmação é **apenas para garantir a segurança da conta** (não é spam, não pede password).
   - Layout responsivo simples, sem CSS externo (inline). Usa as cores semânticas do projecto (#0077B6 ocean) no botão CTA "Confirmar email e abrir relatório". Inclui link em texto plano como fallback.
   - Subject: `Confirma o teu email para abrir o relatório de @{{handle}}` (ou genérico se handle ausente).
   - Mantém footer com motivo do envio + endereço da empresa.

3. **Envio via `sendTransactionalEmail`**:
   - Novo `TxFlow` literal: `"email-verification"`.
   - Failure event: `email_verification_send_failed` (acrescentar a `FLOW_FAILURE_EVENT`).
   - Helper de alto nível `sendVerificationEmail({ leadId, email, firstName, handle })` em `src/lib/email/send-verification.server.ts`, igual ao padrão dos outros wrappers em `src/lib/email/`.

4. **Endpoint público de confirmação** — `src/routes/api/public/verify-email.ts`:
   - GET `?token=…` (preferido, abre direto do email): valida o token, emite cookie `lead_session`, grant de créditos idempotente, e devolve redirect 302 para `/analyze/$handle` se o `metadata.handle` existir, ou para `/` caso contrário.
   - POST `{ token }` (para um futuro fluxo OTP-em-página): mesmo efeito, devolve JSON.
   - Resposta amigável (HTML mínimo) em casos `expired` / `already_used` / `invalid` com CTA "Pedir novo link".
   - **Idempotente**: usa o próprio token + `grantInitialCredits` (já idempotente por unique index) para não duplicar.

5. **Wiring em `/start` e `/check-email` quando modo ≠ off**:
   - `/start` (modo `magic_link`): faz upsert, gera token, chama `sendVerificationEmail`, devolve `{ ok: true, verification_required: true, verification_mode: "magic_link" }`. Não emite cookie nem créditos.
   - `/start` (modo `otp`): comportamento actual (Supabase OTP) — mantido como rota de escape se quisermos voltar atrás.
   - `/check-email` (modo `magic_link`): se `exists: true`, dispara `sendVerificationEmail` e devolve `{ verification_mode: "magic_link", verification_sent: true }`; cliente mostra ecrã "Verifica a tua caixa de entrada — abrimos o relatório quando confirmares".

6. **Cliente**:
   - Novo ecrã `VerifyEmailSentPanel` (substitui `OtpVerifyPanel` no modo `magic_link`) com copy "Enviámos-te um link para `{maskedEmail}`. Confirma para abrir o relatório." + botão "Reenviar link" (chama `/api/onboarding/resend-verification` — opcional, atrás da mesma flag).
   - Ecrã `OtpVerifyPanel` mantém-se intocado para o modo `otp` (legacy).

## Mudanças resumo

**Camada A (activa agora):**
- `src/lib/config/email-verification.server.ts` — novo, lê `EMAIL_VERIFICATION_MODE`.
- `src/routes/api/onboarding/start.ts` — quando modo `off`: salta OTP, emite cookie+credits, dispara welcome-beta async.
- `src/routes/api/onboarding/check-email.ts` — devolve `verification_mode`.
- `src/routes/api/onboarding/claim-existing-beta.ts` — novo, só responde em modo `off`.
- `src/components/onboarding/onboarding-modal.tsx` — branching por `verification_mode`.

**Camada B (latente, activa via env):**
- `src/lib/email/verification-token.server.ts` — novo (HMAC).
- `src/lib/email/templates/verify-email.ts` — novo (template PT).
- `src/lib/email/send-verification.server.ts` — novo wrapper sobre `sendTransactionalEmail`.
- `src/lib/email/transactional-email.server.ts` — adicionar `"email-verification"` ao `TxFlow` e `FLOW_FAILURE_EVENT`.
- `src/routes/api/public/verify-email.ts` — novo endpoint GET/POST.
- `src/routes/api/onboarding/resend-verification.ts` — opcional, mesmo padrão.
- `src/components/onboarding/verify-email-sent-panel.tsx` — UI nova, só renderiza em modo `magic_link`.

**Testes:**
- `src/lib/email/__tests__/verification-token.test.ts` — sign/verify, expiração, tampering.
- `src/routes/api/onboarding/__tests__/start.test.ts` — actualizar para cobrir modo `off` (cookie+credits) e modo `magic_link` (sem cookie, com chamada a sender mockado).
- `src/routes/api/public/__tests__/verify-email.test.ts` — token válido, expirado, inválido, replay.
- `src/lib/email/__tests__/send-verification.test.ts` — chama `sendTransactionalEmail` com flowType correcto.

**Configuração de ambiente (informativa, sem alterar produção):**
- `EMAIL_VERIFICATION_MODE=off` (default em runtime se não definido).
- Secret novo `EMAIL_VERIFICATION_SECRET` apenas necessário quando passarmos a `magic_link`.
- Reaproveita `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `RESEND_API_KEY`, `RESEND_FROM` já em uso.

## Validação

- `bunx vitest run` foca nos novos tests + suite existente de onboarding.
- Smoke manual em preview:
  1. Modo `off` (default): submeter email novo → relatório abre sem ecrã OTP, créditos a 2.
  2. Email existente em beta: abre o relatório sem pedir código.
  3. Alterar `EMAIL_VERIFICATION_MODE=magic_link` em preview: receber email da Brevo (assinado `BREVO_FROM_EMAIL`), clicar link → cookie + créditos + redirect.

## Risco residual

- **Beta sem verificação**: identidade do email não é provada. Aceitável conforme pedido; mitigado com log de auditoria, rate-limit por IP e por email. Não há acesso a dados sensíveis para além do relatório de Instagram já público.
- **Camada B inactiva**: dead-code até flip do env; coberta por unit tests para evitar bit-rot.
- **Sem `email_domain--scaffold_*`**: não tocamos na infra Lovable Emails nem nos templates Supabase Auth — quando a flag voltar a `otp`, o caminho actual continua disponível.
- **Brevo `BREVO_FROM_EMAIL`**: tem de ser um endereço de um domínio verificado no Brevo. Já está em uso para os outros transactional emails — sem mudança operacional.
