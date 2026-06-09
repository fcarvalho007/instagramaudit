# Finalizar auth password-mode

A maioria do trabalho já está no código (password show/hide + strength, Zod apertado, `LoginPanel` com cópia nova, bloco de segurança no email `report-saved`, gate de `BETA_AUTOLOGIN`, testes de `unlock-flow` / `start` / `report-saved`). Faltam 4 pontos do spec.

## Pendente

### 1. Step único de qualificação (item #2 do plano original)
Em `src/components/onboarding/onboarding-modal.tsx`:
- Remover o estado `{ kind: "qualification" }` (e o respetivo `QualificationStepBody` com os dois grids `profile_ownership` + `goal`).
- Adicionar campo `qualification` como `<Select>` dentro do `FinalStepBody`, com as 6 opções do spec (`brand_company`, `marketing_comms`, `consultant_agency`, `content_creator`, `curiosity`, `other`) usando os labels EU-PT já existentes em `src/lib/leads/qualification.ts`.
- Fluxo passa a ser `entry → final | login` (sem ecrã intermédio).
- `src/lib/leads/build-start-payload.ts`: remover o fallback `ownership/goal → qualification` (passa a depender só de `values.qualification`).
- `src/lib/unlock-flow.ts`: tornar `qualification` obrigatório no schema do modal; manter `profile_ownership`/`goal` opcionais por compat dos testes legacy.

### 2. Limpar UI dead de magic-link / OTP (item #5)
- Remover componente `MagicLinkSentPanel` e referências em `FinalStepBody` (linha ~416, branch `password_with_email_verification`). Em `AUTH_MODE=password` o servidor nunca devolve esse estado; se devolver, mostrar erro genérico em vez de painel.
- Manter o tipo `auth_mode` na resposta (back-compat), mas o cliente só reage a `password`.
- Remover chaves i18n órfãs em `src/i18n/locales/pt/gate.json` referentes ao painel magic-link/OTP.

### 3. Cópia final dos CTAs (item #4)
Em `src/i18n/locales/pt/gate.json`:
- `final.right.cta` (atualmente "Gerar o meu relatório") → **"Criar conta e abrir relatório"**.
- `final.right.ctaCheckout` → **"Criar conta e continuar"** (criar a chave se não existir; usar no fluxo checkout).
- `creditNote` → **"2 créditos grátis incluídos na tua conta."** (remover qualquer menção a "após confirmares o email").
- `entry.eyebrowCheckout` → **"Antes de pagar"** (apenas se a chave existir).

### 4. Testes em falta (item #9)
- `src/components/onboarding/__tests__/onboarding-modal.test.tsx` (RTL com mocks de `supabase` + `fetch`):
  - email existente → renderiza `LoginPanel` e **não** chama `/api/onboarding/start`;
  - `signInWithPassword` com sucesso → chama `/api/onboarding/claim-existing` (mock OK);
  - password errada → não há chamada a `claim-existing`;
  - nenhum painel magic-link/OTP renderiza em `AUTH_MODE=password`;
  - `localStorage` (draft) não contém `password` nem `confirm_password` depois de escrever nos inputs.
- `src/lib/rpc/__tests__/auto-login.test.ts`: chamar `autoLogin` sem `BETA_AUTOLOGIN=1` → 403; com flag + email fora do allowlist → 403.

## Fora de âmbito (mantém-se)
EuPago, webhooks, créditos, `report_full_9`, secções de report, admin analytics, `/report.example`, schema DB — nenhuma alteração.

## Entrega esperada após build mode

1. Lista de ficheiros alterados (modal, gate.json, build-start-payload, unlock-flow, 2 novos test files).
2. Confirmação de que o fluxo público é `entry → final (com qualification select + password) | login`.
3. Confirmação de que nenhum painel magic-link/OTP é alcançável em `AUTH_MODE=password`.
4. Resultado de `bunx vitest run` para os ficheiros tocados.
