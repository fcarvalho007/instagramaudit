## 1 · Mapa do estado actual

### Auth surface (3 entradas)

| Entrada | Onde | O que faz hoje |
|---|---|---|
| Onboarding modal (`OnboardingModal`) | `/analyze/$username` + `CheckoutAccountGate` em `/checkout/*` | Step entry → `/api/onboarding/check-email` → magic_link OU OTP OU (modo `off`) cria sessão sem prova de propriedade. |
| `/signup` (página dedicada) | `src/routes/signup.tsx` | `supabase.auth.signUp({ email, password })` + Google OAuth. Não toca `lead_session`. |
| `/login` (página dedicada) | `src/routes/login.tsx` | **Hack**: chama `autoLogin()` server fn → admin gera temp password → cliente faz `signInWithPassword`. Apenas para 1 email hardcoded (`fredericodigital@gmail.com`). |

### Servidor

- `src/lib/config/email-verification.server.ts` — enum `"off" | "magic_link" | "otp"`. Default `"off"`.
- `src/routes/api/onboarding/start.ts` — em `mode=off` faz upsert do lead + emite cookie `lead_session` + 2 créditos **sem prova de propriedade** (risco #3). Em `magic_link` envia link assinado. Em `otp` chama `signInWithOtp`.
- `src/routes/api/onboarding/check-email.ts` — para email existente em `off`/`magic_link` envia magic link via Brevo→Resend.
- `src/routes/api/onboarding/claim-existing.ts` — verifica `access_token` Supabase (assume OTP/magic) → emite `lead_session`.
- `src/lib/rpc/auto-login.functions.ts` — gera temp password com `randomBytes(24)` e devolve ao cliente. Gated por `BETA_AUTOLOGIN=1` mas a página `/login` é pública.
- `src/lib/email/send-verification.server.ts` + `templates/verify-email.ts` — magic link transacional.

### Cliente (modal)

- `OnboardingModal` view machine: `entry → qualification → final → otp | magic_link_sent`. Sem campos de palavra-passe.
- `unlockFormSchema` (`src/lib/unlock-flow`) — campos: `full_name, email, phone, qualification, goal, profile_ownership, user_type, gdpr_consent, marketing_consent`. **Sem password.**
- Phone field continua no schema (`phone: optional()`) mas o cliente do modal só o usa internamente — confirmar visualmente que não aparece.

### Riscos identificados

| # | Risco | Localização |
|---|---|---|
| 1 | Modal/copy diz "2 créditos grátis após confirmares o email" | `gate.json` + cópia no modal |
| 2 | Magic link/OTP activos em produção pública | `check-email.ts`, `start.ts`, modal (`sendOtpAndGoToOtpView`, view `otp`/`magic_link_sent`) |
| 3 | `mode=off` cria `lead_session` sem prova de propriedade | `start.ts` linhas 457–493 |
| 4 | `autoLogin` devolve password gerada ao browser | `auto-login.functions.ts` + `/login` |
| 5 | Phone field ainda no schema (mas oculto na UI atual) | `unlock-flow.ts` |
| 6 | `/signup`, `/login`, onboarding modal usam fluxos diferentes | 3 rotas independentes |

---

## 2 · Decisão de produto (confirmada pelo utilizador)

| | Beta actual | Futuro (flag) |
|---|---|---|
| `AUTH_MODE=password` | ✅ default | |
| `AUTH_MODE=password_with_email_verification` | | configurável sem deploy |
| `AUTH_MODE=magic_link` | | mantido como contingência |
| Magic link público | ❌ removido | só se flag mudar |
| OTP público | ❌ removido | não regressa |
| Auto-login / temp password | ❌ inacessível ao público | apenas admin via env |
| Password enviada por email | ❌ nunca | nunca |
| Reset de password | ✅ via Supabase `resetPasswordForEmail` | igual |

---

## 3 · Fluxo alvo (`AUTH_MODE=password`)

### A · Entry step (email-first)
- User escreve email → `POST /api/onboarding/check-email` → devolve `{ exists: boolean }` (resposta constante-time, sem enviar nada).

### B · Email novo → form de criação
Campos (única coluna):
- Nome completo
- Email (pré-preenchido, read-only)
- Qualificação (chips)
- **Palavra-passe** (mín 8, novo)
- **Confirmar palavra-passe** (novo)
- Consentimento GDPR (obrigatório)
- Consentimento marketing (opcional)

Submit → `POST /api/onboarding/start` (payload extendido com `password`).
Servidor (admin client):
1. `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })`. Se já existir (race) → 409 `EMAIL_ALREADY_EXISTS` → cliente cai no fluxo de login.
2. Upsert do lead, liga `user_id`.
3. `grantInitialCredits` + `setLeadCookie` apenas após sucesso.
4. Fire-and-forget `sendReportAccessEmail` (sem password, sem masking).
5. Devolve `{ ok, lead_id, credits, requires_email_verification: false }`.

Em modo `password_with_email_verification`: cria com `email_confirm: false`, envia email Supabase, devolve `requires_email_verification: true`. Cookie e créditos só após `email_confirmed_at`.

### C · Email existente → form de login
- View `login` no modal: email (read-only) + password + link "Esqueceste-te da palavra-passe?".
- `supabase.auth.signInWithPassword({ email, password })` cliente.
- Se sucesso → `POST /api/onboarding/claim-existing` (envia `access_token`) → emite `lead_session`, liga lead (lógica actual já cobre).
- Se erro → mensagem genérica "Email ou palavra-passe incorretos" (sem distinguir qual). Tracking de tentativas falhadas.

### D · Reset de password
- Link no form de login → view `reset` no modal: input email.
- `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/reset-password })`.
- Nova rota pública `/reset-password` (top-level, fora de `_authenticated`) que detecta `type=recovery` no hash, mostra form e chama `supabase.auth.updateUser({ password })`.
- Email transacional vai pelo Supabase Auth (template scaffolded). Não passa pelo nosso Brevo→Resend para não duplicar.

### E · Flag de modo
- Novo `src/lib/config/auth-mode.server.ts` exportando `getAuthMode(): "password" | "password_with_email_verification" | "magic_link"`. Default `"password"`.
- `email-verification.server.ts` é renomeado / re-exportado para retrocompatibilidade interna mas o modal e os endpoints lêem `getAuthMode()`.

---

## 4 · Ficheiros que mudam

### Novos
- `src/lib/config/auth-mode.server.ts` — flag central.
- `src/routes/reset-password.tsx` — página pública.
- `src/components/onboarding/onboarding-modal-login-view.tsx` — view "login" extraída (mantém o modal legível).
- `src/components/onboarding/onboarding-modal-reset-view.tsx` — view "reset".
- `src/lib/email/templates/welcome-account.ts` — template novo sem password.
- `src/routes/api/onboarding/__tests__/start.password.test.ts`, `check-email.password.test.ts`, `signin.test.ts`.

### Modificados
- `src/components/onboarding/onboarding-modal.tsx` — substitui views `otp` / `magic_link_sent` por `login` / `reset`. Final form ganha campos password + confirm.
- `src/lib/unlock-flow.ts` — `unlockFormSchema` ganha `password` + `confirm_password` com refine de igualdade; `phone` removido (deprecação total).
- `src/lib/leads/build-start-payload.ts` — inclui `password`.
- `src/routes/api/onboarding/start.ts` — substitui branching mode-off/magic/otp pelo novo fluxo password. Remove `sendOtpEmail`. Mantém anti-bot, honeypot, timing guard, classificação de domínio.
- `src/routes/api/onboarding/check-email.ts` — deixa de enviar magic link; resposta passa a `{ ok, exists }`. Mantém constant-time.
- `src/routes/api/onboarding/claim-existing.ts` — passa a aceitar `access_token` de `signInWithPassword` (lógica já é idêntica).
- `src/lib/config/email-verification.server.ts` — passa a ser shim sobre `auth-mode.server.ts` para não partir imports existentes; deprecation comment.
- `src/routes/login.tsx` — reescreve para `signInWithPassword` real (email + password). Mantém botão Google.
- `src/routes/signup.tsx` — alinha copy/UX com o modal; remove redirect de confirmação por email quando `AUTH_MODE=password` (auto-confirma).
- `src/lib/rpc/auto-login.functions.ts` — passa a exigir `BETA_AUTOLOGIN=1` **+** `ADMIN_ALLOWED_EMAILS` match no caller; nunca devolve password. Apenas usável internamente.
- Locales: `gate.json`, `auth.json` — remove copy "confirma o email para receber 2 créditos", adiciona copy password / esqueci / reset.

### Removidos (deprecados em runtime, código mantido atrás da flag)
- `src/lib/email/send-verification.server.ts` — não chamado em `password`, mantido para `magic_link` futuro.
- `src/lib/email/templates/verify-email.ts` — idem.
- `src/routes/api/public/verify-email.ts` — idem.

---

## 5 · Plano por fases

### Fase 1 — Config flag + neutralização de risco crítico (1 PR)
1. Criar `auth-mode.server.ts` com default `"password"`.
2. Em `/api/onboarding/start`, quando `AUTH_MODE=password` e payload não tiver `password`, devolver 400 `PASSWORD_REQUIRED`. Em `mode=off` legacy, **deixar de emitir `lead_session` sem password** — emite só quando o admin user é criado com sucesso.
3. Esconder `/login` (auto-login) atrás de `ADMIN_ALLOWED_EMAILS` server-side: se o caller não estiver autenticado como admin, devolver 404.
4. Tests: `start.test.ts` actualizado para `password` mode; novo teste de rejeição sem password.

### Fase 2 — Modal password (1 PR)
1. Schema: `password` + `confirm_password` + refine. Drop `phone`.
2. UI: novo final step com campos password (visibility toggle, password strength visual mínimo).
3. UI: nova view `login` para email existente (substitui `otp`/`magic_link_sent`).
4. UI: nova view `reset` + página `/reset-password`.
5. `check-email`: devolve `{ ok, exists }` sem enviar magic link.
6. Endpoint `start.ts`: chama `supabaseAdmin.auth.admin.createUser({ email_confirm: true })` antes de upsert.
7. `claim-existing` aceita token de `signInWithPassword`.

### Fase 3 — Limpeza & paridade (1 PR)
1. `/signup` e `/login` alinham UX e copy com o modal (mesma cópia, mesmos campos).
2. Remover `BETA_AUTOLOGIN` da página `/login` (já gated em Fase 1; agora também ocultar UI).
3. Locales actualizados, remover toda copy "confirma o email".

### Fase 4 — Future-readiness (gated, sem código novo no path crítico)
- `AUTH_MODE=password_with_email_verification`: `email_confirm: false` + `setLeadCookie` adiado para `claim-existing` quando `email_confirmed_at` existir.
- `AUTH_MODE=magic_link`: re-activa código de `send-verification.server.ts`. Nenhum endpoint público novo.

### Fase 5 — Configuração Supabase Auth (manual, 1 chamada de tool)
- `supabase--configure_auth` com `password_hibp_enabled: true` e `auto_confirm_email: true` (default beta). Documentar como alterar para enforced verification.

---

## 6 · Riscos & edge cases

| Risco | Mitigação |
|---|---|
| **Account enumeration** via `check-email` | Resposta constante-time já existe (≥200ms). Mantém. |
| **Account takeover** via signup com email de outra pessoa | `admin.createUser` falha se já existir → cliente cai no flow de login → não há takeover. |
| **Race** entre check-email "novo" e signup "já existe" | `start.ts` trata 409 do `createUser` e devolve `EMAIL_ALREADY_EXISTS` → modal salta para view login. |
| **Password fraca** | `password_hibp_enabled: true` no Supabase + min 8 client. |
| **Cookie `lead_session` antes da Supabase user existir** | Cookie só é emitido após `createUser` retornar OK (inverte a ordem actual). |
| **Lead órfão sem auth user** (legacy) | `claim-existing` mantém `findOrCreateLeadForEmail` — ao fazer login com password, lead é encontrado/criado e ligado. |
| **Esqueci-me da password mas conta existe** | Link no form de login → reset flow → email Supabase nativo. |
| **Email com OAuth Google existente, password tentativa** | `signInWithPassword` falha com "Invalid credentials". Copy do erro sugere "Já usaste Google? Tenta entrar com Google". |
| **Rate limiting** | Não há primitivo backend; aceitamos lacuna (per regras Lovable). Tracking de tentativas para alarmar mais tarde. |
| **Phone field residual em DB** | Coluna `leads.phone` mantém-se (não migrar agora); só removemos do payload e UI. |

---

## 7 · Testes a adicionar / actualizar

### Unit
1. `start.password.test.ts`:
   - novo email + password válida → cria user + lead + cookie + créditos.
   - novo email sem password → 400 `PASSWORD_REQUIRED`.
   - email já existe em `auth.users` → 409 `EMAIL_ALREADY_EXISTS`, sem cookie.
   - email já existe como lead mas sem auth user (legacy) → ainda cria auth user e liga.
2. `check-email.password.test.ts`: devolve `{ exists }`, **não chama** `sendVerificationEmail`.
3. `claim-existing` (existente): adicionar caso onde `access_token` vem de `signInWithPassword` (já compatível, mas explicitar).
4. `auth-mode.server.test.ts`: default `password`, parsing das 3 strings, fallback a `password` se inválido.
5. `unlock-flow.schema.test.ts`: password mismatch → erro; password < 8 → erro; phone field removido.

### Integração / e2e (manual checklist no PR)
- Novo utilizador via modal `/analyze/$username` → relatório abre.
- Novo utilizador via `/checkout/report-full` → checkout avança.
- Utilizador existente entra → relatório abre.
- Password errada → erro genérico + link de reset.
- Reset flow end-to-end.
- `/login` público mostra form normal (sem auto-login).
- Admin com `BETA_AUTOLOGIN=1` ainda consegue o atalho (CLI/local).

---

## 8 · Não tocar

Checkout/EuPago, pricing, `credit_ledger`, `lead_entitlements`, `report_full_9`, packs, 30d/90d, competitor, cache, enrichments, Report Lab, blocos lab. Phone column em DB. Schema `auth.*` directamente.

---

## 9 · Pergunta única antes de implementar

Comprimento mínimo de password: **8** (compatível com HIBP) ou **10**? Default proposto: **8 caracteres + HIBP check** activo no Supabase. Confirmar antes de Fase 1.
