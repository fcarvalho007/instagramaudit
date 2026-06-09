## Redesign do report-entry modal — plan (sem código)

Foco: simplificar o fluxo de entrada do relatório, remover o passo do meio, e forçar verificação de propriedade quando o email já existe. Sem mexer em Free/Pro, créditos, competitor, 30d/90d, checkout.

---

### 1. Mapa do fluxo actual

```
┌───────────────────────────────────────────────────────────────┐
│  Trigger: hero → "analisar @username"                         │
│  Componente: OnboardingModal (onboarding-modal.tsx, 1126 li.) │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
  Step 0 · IntroStepBody
   ├─ "Cria conta e abre o relatório grátis" + handle context
   ├─ CTA primária: "Começar grátis"            → step 1
   └─ Link discreto: "Já tens conta? Entrar"    → view="login"
        │                                              │
        ▼                                              ▼
  Step 1 · Step1Name                          LoginStepBody (view="login")
   └─ full_name                                ├─ pede só email
        │                                      ├─ POST /api/onboarding/login
        ▼                                      │   (LOGIN_BACKEND_READY=false →
  Step 2 · Step2Context  ◀── REMOVER          │    stub "verifica o teu email")
   ├─ profile_ownership (4 chips)              └─ não autentica de facto
   └─ goal (4 chips)
        │
        ▼
  Step 3 · Step3EmailGdpr
   ├─ email + phone opcional
   ├─ gdpr_consent (obrig.) + marketing_consent (opt.)
   └─ POST /api/onboarding/start
        ├─ upsert leads BY email_normalized (sem verificação!)
        ├─ grantInitialCredits (idempotente)
        ├─ setLeadCookie (lead_session HMAC)
        └─ onSuccess → /analyze/$username
```

**Problema de segurança actual:** `start.ts` faz upsert cego por email — qualquer pessoa que digite o email de um utilizador existente recebe um `lead_session` válido e abre os relatórios guardados desse lead. É exactamente o que o pedido manda corrigir.

**Friction actual:** Step 2 (relationship + goal) adiciona 2 cliques sem valor imediato para o utilizador; é tracking interno disfarçado de UX.

---

### 2. Mapa do fluxo proposto

```
┌───────────────────────────────────────────────────────────────┐
│ Trigger inalterado                                            │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
  Entry modal (single screen, mobile-first)
   ┌─────────────────────────────────────────┐
   │  Eyebrow: "RELATÓRIO GRATUITO"          │
   │  H1: "Cria conta e vê o relatório"      │
   │  Sub: "Vais analisar @{handle} — é      │
   │       grátis."                          │
   │                                         │
   │  ╔═════════════════════════════════════╗│  ← painel primário
   │  ║ ✨ Criar conta grátis  [Novo aqui] ║│    destacado (navy outline)
   │  ║ "Recebes 2 análises grátis e o      ║│
   │  ║  relatório fica guardado."          ║│
   │  ║ [ email__________________ ]         ║│
   │  ║ [    Criar conta e abrir →     ]    ║│
   │  ╚═════════════════════════════════════╝│
   │                                         │
   │  ─────────────────────────────────────  │
   │  Já tens conta?     Entrar com email →  │  ← secundário, discreto
   │                                         │
   │  Respeitamos o RGPD · sem spam          │
   └─────────────────────────────────────────┘
        │
        ▼
  POST /api/onboarding/check-email  { email, handle }
   ├─ leads_exists? false → "new"
   └─ leads_exists? true  → "existing"
        │
        ├──► new  ─────────────────────────────────────┐
        │                                              │
        │                                              ▼
        │                                  Final step (2-col editorial)
        │                                  ┌────────────┬────────────────┐
        │                                  │ LEFT navy  │ RIGHT form     │
        │                                  │ (cinematic)│ (compact)      │
        │                                  │            │                │
        │                                  │ Vais ler o │ Nome           │
        │                                  │ relatório  │ Email (preench.)│
        │                                  │ de         │ Telemóvel(opc.)│
        │                                  │ @{handle}  │                │
        │                                  │            │ ☑ Tratamento   │
        │                                  │ • Conta    │   dados (obrig)│
        │                                  │   privada  │ ☐ Receber      │
        │                                  │   c/ 2     │   benchmarks   │
        │                                  │   créditos │                │
        │                                  │ • Relatóri.│ [Abrir relat. →]│
        │                                  │   futuros  │                │
        │                                  │   guardados│                │
        │                                  └────────────┴────────────────┘
        │                                              │
        │                                              ▼
        │                                  POST /api/onboarding/start
        │                                  (mesmo endpoint, sem step 2)
        │                                              │
        │                                              ▼
        │                                  lead_session + redirect /analyze
        │
        └──► existing  ────────────────────────────────┐
                                                       ▼
                                          OTP verify panel (in-modal)
                                          ┌─────────────────────────────┐
                                          │ "Confirma que é a tua conta"│
                                          │ Enviámos código para ana@…  │
                                          │ [ _ _ _ _ _ _ ]             │
                                          │ [   Confirmar e abrir →   ] │
                                          │ Reenviar (30s)  ·  Voltar   │
                                          └─────────────────────────────┘
                                                       │
                                          POST /api/onboarding/verify-otp
                                           ├─ supabase.auth.verifyOtp
                                           ├─ link leads ↔ auth.user
                                           ├─ setLeadCookie
                                           └─ redirect /analyze/$handle
```

Resultado: 1 ecrã de entrada + 1 ecrã final (form ou OTP). Step 2 desaparece. Decisão "novo vs existente" é determinística e segura.

---

### 3. Componentes / rotas / state afectados

**Frontend**
- `src/components/onboarding/onboarding-modal.tsx` — refactor profundo. Mantém shell `<Dialog>` mas substitui os sub-componentes:
  - `IntroStepBody` → `EntryStepBody` (single screen com email + dual path).
  - `Step1Name`, `Step2Context` → eliminados.
  - `Step3EmailGdpr` → renomeado para `FinalDetailsStep` em layout 2-col (desktop) / stack (mobile).
  - `LoginStepBody` → substituído por `OtpVerifyPanel` (6 dígitos, reenvio com cooldown).
- `src/lib/leads/build-start-payload.ts` — remover `profile_ownership`, `goal`, `user_type` do payload (campos passam a nullable na DB; sem migration porque já são nullable).
- `src/lib/unlock-flow.ts` — schema reduzido (sem `profile_ownership`/`goal`).
- `src/lib/leads/use-onboarding-draft.ts` — actualizar campos draft (manter `name`, `email`, `phone`).
- `src/lib/tracking/onboarding-events.ts` — manter eventos; adicionar `entry_view`, `entry_continue_new`, `entry_continue_existing`, `otp_sent`, `otp_verified`, `otp_failed`.
- `src/i18n/locales/{pt,en}/gate.json` — nova secção `onboarding.entry` + `onboarding.final` + `onboarding.otp`; deprecar `onboarding.intro`, `onboarding.login`, `onboarding.steps.2`.

**Backend (TanStack server routes — já em `src/routes/api/onboarding/`)**
- `src/routes/api/onboarding/check-email.ts` — NOVO. POST `{ email }` → `{ exists: boolean }`. Rate-limited por IP (mesmo padrão do `start.ts`); resposta uniformemente lenta (constant-time) para evitar email-enumeration timing attack.
- `src/routes/api/onboarding/start.ts` — alterações:
  - Continua a aceitar payload completo apenas no path "new".
  - Adicionar guard: se `leads.email_normalized` já existe E não veio `verified_otp_session=true`, devolver `403 EMAIL_REQUIRES_VERIFICATION` (proteção defesa-em-profundidade caso o cliente não chame `check-email`).
- `src/routes/api/onboarding/request-otp.ts` — NOVO. POST `{ email, handle }` → dispara `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })`. Sempre responde 200 ok (anti-enumeration); só envia se `leads.email_normalized` existir.
- `src/routes/api/onboarding/verify-otp.ts` — NOVO. POST `{ email, code, handle }` → `supabase.auth.verifyOtp({ email, token: code, type: 'email' })`. Em sucesso: linka lead à `auth.user.id` (idempotente), emite `lead_session` (mesmo `setLeadCookie`), e `link_user_to_existing_reports` (RPC já existe).

**State machine no modal** (substitui o actual `step | view`):
```
  type View =
    | { kind: 'entry' }
    | { kind: 'final-new'; email: string }
    | { kind: 'otp'; email: string; sentAt: number }
    | { kind: 'otp-success' }
```

---

### 4. Magic link vs OTP de 6 dígitos — qual integra melhor

Supabase suporta os dois via `signInWithOtp`. Recomendação: **OTP de 6 dígitos**.

| Critério | Magic link | OTP 6 dígitos |
|---|---|---|
| UX no modal | Quebra o flow (utilizador sai para webmail, volta noutra tab) | Fica no modal, cola código, continua |
| Cross-device | Frágil (link aberto noutro browser perde sessão do modal) | Funciona — código é portável |
| Implementação | Precisa de página `/auth/callback` que reabra o `/analyze/$handle` correcto + reenvio de cookie | Apenas POST → `verifyOtp` → cookie |
| Mobile | Tab-switching no iOS perde estado frequentemente | Indolor |
| Já existe na stack | Não há callback dedicado para retomar `handle` | Endpoints podem reutilizar `setLeadCookie` existente |
| Segurança | Equivalente (mesmo backend Supabase, mesma expiração) | Equivalente |

→ **OTP de 6 dígitos com `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })` + `verifyOtp({ type: 'email' })`.** Mantém o utilizador no modal, evita criar página de callback, e tolera fluxos cross-device. Requer apenas que o template de auth email entregue o `{{ .Token }}` (vem por defeito; confirmar em `supabase/config.toml` ou Cloud → Auth → Templates antes de lançar).

---

### 5. Edge cases

| Caso | Comportamento |
|---|---|
| Email já existe como lead | `check-email → existing` → OTP path obrigatório. Nunca emitir `lead_session` sem `verifyOtp` ok. |
| Email já existe como `auth.user` mas sem lead | `check-email → existing` (consultar ambos). OTP confirma. `verify-otp` corre `link_user_to_existing_reports` (RPC já existe). |
| Email não existe em lado nenhum | `check-email → new` → final step. Cria lead + cookie como hoje. |
| Utilizador escreve email errado no entry (typo) | `check-email → new`, segue para final step. Sem prejuízo. |
| Utilizador escreve email de outra pessoa | `check-email → existing` → OTP é enviado para o dono real, atacante não recebe → bloqueado. |
| Flow abandonado entre entry e final | `useOnboardingDraft` já persiste em sessionStorage; reabrir restaura email e nome. OTP NÃO se persiste (sempre regenerado por segurança). |
| Flow abandonado no OTP | Reabrir modal → entry de novo. Se reentrar mesmo email → reenvio de OTP (rate-limited a 30s). |
| Email de verificação não chega | Botão "Reenviar" com cooldown 30s; mensagem com link de suporte. Logamos `otp_send_failed` em `product_events` para diagnóstico. |
| Utilizador clica reenviar repetidamente | Rate-limit cliente (cooldown botão) + rate-limit servidor por email (máx 3 OTPs em 10min). |
| Código errado | `verifyOtp` retorna erro → mostrar "código inválido"; máx 5 tentativas / 10min por email (Supabase Auth já aplica). |
| Código expirado | Supabase devolve `expired_token` → mensagem "código expirou, pede um novo". |
| Utilizador returning com `lead_session` válido | `OnboardingModal` nem abre — o `analyze.$username.tsx` já redirecciona/abre análise quando há cookie. Inalterado. |
| Utilizador returning sem cookie mas com Supabase session | Detectar em `EntryStep` (chamar `supabase.auth.getUser()`) → skip modal, ir directo para `/analyze`. |
| Honeypot / bot | Manter `website` + `_t` no `start.ts` e estender a `request-otp.ts`. |
| Email-enumeration timing attack | `check-email` faz query mas devolve sempre depois de `setTimeout` constante (≈300ms). `request-otp` responde 200 sempre, mesmo quando não dispara. |
| OTP entrega lead a sessão errada (race) | `verify-otp` valida que o `email` do OTP coincide com o `email` do `request-otp` na mesma sessão (assinatura HMAC curta no cookie temporário `otp_session`, 10min TTL). |

---

### 6. Plano de implementação passo a passo

**Fase A — Backend (sem alterar UI)**
1. Criar `src/routes/api/onboarding/check-email.ts` (rate-limited, constant-time).
2. Criar `src/routes/api/onboarding/request-otp.ts` (chama `supabase.auth.signInWithOtp` com `shouldCreateUser:false`; assina cookie `otp_session` HMAC curto com `email_hash + handle + iat`).
3. Criar `src/routes/api/onboarding/verify-otp.ts` (valida `otp_session`; chama `verifyOtp`; linka lead↔user via `link_user_to_existing_reports`; emite `lead_session`).
4. Adicionar guard em `start.ts`: se `leads.email_normalized` existe → `403 EMAIL_REQUIRES_VERIFICATION`. Manter o resto.
5. Confirmar/ajustar template de auth email para incluir `{{ .Token }}` em destaque. Se necessário, scaffold via `email_domain--scaffold_auth_email_templates`.
6. Testes unitários: `check-email`, `request-otp`, `verify-otp`, e o novo branch do `start.ts`.

**Fase B — Refactor do modal (atrás de feature flag `NEW_ONBOARDING`)**
7. Reduzir `unlockFormSchema` e `buildStartPayload` (drop `profile_ownership`, `goal`, `user_type`).
8. Substituir `IntroStepBody` por `EntryStepBody` (single screen, padrão da screenshot enviada).
9. Substituir `LoginStepBody` por `OtpVerifyPanel`.
10. Substituir `Step1`+`Step2`+`Step3` por `FinalDetailsStep` (layout `grid lg:grid-cols-[1fr_1.1fr]`, left navy panel `bg-content-primary text-white`, right form `bg-white`; em mobile vira `flex-col`).
11. Nova state machine `View` no `OnboardingModal`.
12. Tracking: novos eventos no `onboarding-events.ts`.
13. i18n: adicionar `onboarding.entry`, `onboarding.final`, `onboarding.otp` em `pt` + `en`; remover keys de `steps.1/2/3` antigas só depois de remover a flag.
14. Limpar `useOnboardingDraft` (campos reduzidos).

**Fase C — Activar e limpar**
15. Smoke test manual: novo email → final step → análise abre. Email existente → OTP → análise abre. Email existente sem OTP → 403. Reload no meio → draft restaurado.
16. Remover `LOGIN_BACKEND_READY = false` morto e antigas keys i18n.
17. Actualizar/remover `src/i18n/__tests__/onboarding-copy.test.ts` para o novo vocabulário.

---

### 7. Riscos e dependências

| Risco | Mitigação |
|---|---|
| Email-enumeration via `check-email` ou tempo de resposta de `start.ts` | Resposta constant-time + rate-limit + `request-otp` responde 200 sempre |
| Spam de OTPs custar emails ao projecto | Rate-limit 3 OTPs/email/10min + 30s cooldown UI + log em `product_events` |
| Template Supabase Auth não expor `{{ .Token }}` legível | Validar antes da Fase C; se preciso, scaffold via `email_domain--scaffold_auth_email_templates` e personalizar |
| `verifyOtp` cria sessão Supabase Auth que conflitua com `lead_session` | Definir claramente: `lead_session` é o cookie do produto; sessão Supabase é só para "este utilizador é dono do email". `link_user_to_existing_reports` já existe e foi pensado para este caso. |
| Drop dos campos `profile_ownership/goal/purpose` quebrar analytics existentes | Manter colunas em `leads` (já são nullable). Adicionar evento `onboarding_dropped_step2` no migration window para medir impacto. Se forem necessários para business, mover a pergunta para um inquérito pós-relatório opcional (out of scope deste plano). |
| Mobile: 6 inputs OTP partidos por autofill iOS | Usar 1 `<input inputMode="numeric" autoComplete="one-time-code" maxLength={6}>` com mask visual (não 6 inputs separados) |
| Painel navy 2-col em telas estreitas a desperdiçar espaço | `grid` colapsa para 1 col + painel navy vira faixa horizontal compacta no topo (eyebrow + 3 bullets) |
| Bloquear utilizadores legítimos que esqueçam email | Mensagem clara no entry "Se já analisaste antes, usa o mesmo email"; "Entrar com email" leva ao mesmo OTP path |
| Tradução EN incompleta | Adicionar em paralelo com PT na Fase B; teste i18n existente cobre missing keys |

**Dependências externas**
- Supabase Auth email OTP activo (já está — `signInWithPassword` funciona em `login.tsx`).
- Template auth email com `{{ .Token }}` (a confirmar; ferramenta de scaffold disponível).
- `link_user_to_existing_reports(uuid, text)` RPC — já existe em DB.
- `setLeadCookie` / `SESSION_SECRET` — já existem.

Sem migrations de schema necessárias (todos os campos a remover já são nullable em `leads`).

---

### Próximo passo

Confirma:
1. **OTP de 6 dígitos** (recomendado) ou **magic link**?
2. Substituir já o template auth email pelo de Lovable (`scaffold_auth_email_templates`) para garantir branding do código, ou manter o default da Supabase?
3. Feature flag `NEW_ONBOARDING` desejada, ou cutover directo (sem flag) por estarmos pré-launch?

Com estas respostas abro Build Mode e implemento por fases A → B → C.
