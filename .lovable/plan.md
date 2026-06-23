## Diagnóstico

Dois problemas distintos no mesmo ecrã (hero / onboarding modal):

### 1. "Entrar com email" exige email válido antes de avançar
`onboarding-modal.tsx` (linha 638-646) bloqueia o clique no link "Entrar com email →" se o campo de email da entry step não passar `EMAIL_RE`. Resultado: o utilizador clica no link de login, mas em vez de ir para o ecrã de palavra-passe vê o erro "o teu email — parece inválido" (exatamente o do print). Comportamento errado — o link de login devia abrir o ecrã de palavra-passe sem barreira (o utilizador escreve email + password lá dentro).

### 2. Utilizadores autenticados são forçados a passar pelo onboarding modal
`HeroActionBar` (e o fluxo via `/analyze/$username`) abre sempre o `OnboardingModal` quando o utilizador submete o handle, mesmo quando já existe sessão Supabase activa. Para quem já tem conta:
- O modal pede email/conta que já existe → confusão.
- O fluxo natural devia ser: clica → `/analyze/<handle>` → snapshot + report aparecem no painel (`/app/reports`).

A rede de segurança em `analyze.$username.tsx` (linhas 425-473) já enfileira o `report_request` quando há sessão e snapshot, portanto basta saltar o modal.

## Alterações

### A. Skip do modal para sessão activa
- `src/components/landing/hero-action-bar.tsx`: ler sessão com `useAuthSession()`. Se `user` existe, no `handleSubmit` navegar directamente para `/analyze/$username` em vez de abrir o `OnboardingModal`.
- Aplicar o mesmo padrão em qualquer outro entry point que abra o modal sem verificar sessão (revisar e ajustar se necessário em `checkout-account-gate.tsx` — provavelmente já está correcto, mas confirmo).

### B. "Entrar com email" passa a abrir o login sem validar email primeiro
- `src/components/onboarding/onboarding-modal.tsx`, função `goSignIn` (linha 638): remover o early-return da validação. Passar o email só se for válido (caso contrário passar string vazia) e deixar o `LoginView` pedir email + palavra-passe.
- `EntryStepBody`: muda o label para algo mais claro ("Já tens conta? **Entrar →**") e mantém o `onSignInWithEmail` a chamar `goToLoginView(emailOuVazio)`.

### C. Pequena melhoria de copy
- pt: `"haveAccountCta": "Entrar  →"` (sem "com email") — o login screen já indica o email field.
- en: equivalente `"Sign in →"`.

## O que NÃO toco

- `/report.example` (locked).
- Pipeline de PDF, allowlist (já abriste com `APIFY_TESTING_MODE=false`), middleware de auth, `report_requests` schema.
- Lógica de `enqueueReportForCurrentSnapshot` em `/analyze` — já trata o caso de sessão activa.

## Checklist final

☐ Logged-in user no hero → vai direto a `/analyze/<handle>` (sem modal)  
☐ Anonymous user no hero → continua a ver o modal (igual a hoje)  
☐ Clicar "Entrar" abre login view, independentemente do que está no campo email  
☐ Login view permite escrever email + password e autenticar  
☐ Copy pt-PT actualizada ("Entrar →")  
☐ Tests `onboarding-copy.test.ts` ainda passam (a chave continua a existir, só muda o valor)

Confirma e avanço para build.