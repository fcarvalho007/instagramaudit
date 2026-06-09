# Refinamento UX do modal de onboarding (password mode)

## Mudanças propostas

### A. Painel navy do final step (novo utilizador)

`src/i18n/locales/pt/gate.json` — bloco `onboarding.final.left`:

- **eyebrow**: manter `"ÚLTIMO PASSO"`
- **title**: `"O teu relatório fica a um clique"` → `"A tua área privada"`
- novo **subtitle**: `"Criamos uma conta segura para guardar este relatório e os próximos que gerares."`
- **bullets** (substitui as actuais `report`/`save`/`credits` no caminho analyze):
  - `"Relatório guardado na tua conta"`
  - `"Acesso protegido por palavra-passe"`
  - `"Dados privados e associados ao teu email"`
  - `"Podes voltar aos relatórios quando quiseres"`
- novo **securityNote**: `"A tua palavra-passe nunca é enviada por email nem guardada em texto visível."`
- **Caminho `checkout`**: manter copy actual (compra associada à conta, recibo, sem subscrição) — não tem o mesmo problema.

`src/components/onboarding/onboarding-modal.tsx` — `FinalStepBody` aside (linhas 836–890):
- Adiciona subtitle por baixo do `title`.
- Substitui a lista de bullets analyze pelas 4 novas (icon mini check em cyan).
- Adiciona rodapé com a security note num cartão glass compacto (`bg-white/5 border border-white/10 rounded-lg p-3`, ícone shield-check à esquerda, texto `text-[12.5px] text-white/70`).
- Mantém estrutura visual existente (dark navy `bg-content-primary`, cyan eyebrow); sem mudar grid nem responsive.

### B. Campos de password — simplificar para um único campo

Decisão: **remover `confirm_password`**. Justificação:
- O show/hide toggle já está em funcionamento (linhas 1001–1016), permite ao utilizador validar o que escreveu.
- Erros típicos de typo são detectados via fluxo de reset (`/reset-password`) já existente.
- Reduz fricção no formulário (menos um campo, menos altura mobile).
- A reentrada da password ainda existe noutros pontos (Supabase HIBP server-side valida força).

Alterações:
- `src/lib/unlock-flow.ts`: remove `confirm_password` do schema e a regra de matching no `superRefine` (mantém apenas validação de `password`).
- `src/components/onboarding/onboarding-modal.tsx`:
  - Remove bloco do campo "Confirmar palavra-passe" (linhas 1052–1088) e `showConfirm` state.
  - Remove `confirm_password` de `defaultValues` (linha 175).
  - Mantém campo `password` único com show/hide e indicador de força + hint.
  - Hint actualizado para: `"Mínimo 8 caracteres, com letras e números. Validamos contra palavras-passe comuns."`
- `src/lib/__tests__/unlock-flow.test.ts`: remove asserts de matching; mantém testes de min length, letras e números.
- CTA mantém `"Criar conta e abrir relatório"` (já em `gate.json:242`).

### C. Login panel (utilizador existente)

`src/components/onboarding/onboarding-modal.tsx` — `LoginPanel` (linhas 1237–1374). Estas strings são hardcoded; passo a aplicar directamente sem novas keys i18n (mantém escopo focado).

- eyebrow: `"Entrar na conta"` → `"ENTRAR NA CONTA"` (uppercase via `.text-eyebrow-sm`, já aplica)
- title: `"Bem-vindo de volta"` → `"Já existe uma conta com este email"`
- description: `"Este email já tem conta. Introduz a tua palavra-passe para continuar."` → `"Introduz a tua palavra-passe para abrir o relatório. Os teus dados continuam protegidos."`
- CTA do botão (linha 1346): `"Entrar e continuar"` → `"Entrar e abrir relatório"`
- Adicionar reassurance text por baixo dos action buttons:
  > "Só o titular da conta consegue aceder aos relatórios guardados."
  Pequeno (`text-[12px] text-content-tertiary`), com ícone shield-check.
- "Esqueceste-te?" link já está implementado (linhas 1304–1311).
- "Não és tu? Usar outro email" já está (linhas 1361–1370) — mantém.

### D. Remoção de copy de verificação por email

`src/i18n/locales/pt/gate.json`:
- `creditNote` (linha 165): `"Começas com 2 créditos grátis. Esta análise usa 1."` — sem referência a confirmação → manter.
- `newPromise` (linha 181): manter (já não menciona verificação).
- `subtitle` da secção `otp` (linha 272): orphan (modal já não usa OTP). Manter no ficheiro para não partir traduções externas, mas confirmar que não é renderizada.
- `phoneLabel/phoneHint` em `entry` (99–101) e `final.right` (225–227): orphans. Não renderizadas. Manter.

Como não há mais copy live de verificação, nada a remover no JSX.

### E. Phone field — confirmação

Já não é renderizado em `FinalStepBody`. Adicionar teste regressivo.

### F. Testes (`src/components/onboarding/__tests__/`)

Criar `onboarding-modal.copy.test.tsx` com asserts focados (RTL):
1. Renderiza step final em modo `password` → não existe `<input>` com `name="phone"` nem label "Telemóvel".
2. Painel navy renderiza `"A tua área privada"` + bullets `"Acesso protegido por palavra-passe"` + security note.
3. Step final não contém "confirmação do email" nem "verifica o teu email".
4. Submit válido chama `/api/onboarding/start` com `password` e SEM `confirm_password` no payload.
5. LoginPanel renderiza `"Já existe uma conta com este email"` + CTA `"Entrar e abrir relatório"` + reassurance shield.
6. `localStorage` draft não contém `password` (já existe verificação em `useOnboardingDraft`; reforça com assert directo após preencher).

Actualiza `src/lib/__tests__/unlock-flow.test.ts`:
- Remove caso "passwords não coincidem".
- Mantém: min 8, letra obrigatória, número obrigatório.

## Fora de scope (não tocar)

Payments, EuPago, créditos, packs, webhooks, conteúdo do relatório, 30d/90d, competidor, force refresh, cache, admin, schema DB, `/api/onboarding/start` server, `claim-existing`, `auto-login`.

## Ficheiros tocados (estimado)

- `src/i18n/locales/pt/gate.json` (copy do painel navy)
- `src/components/onboarding/onboarding-modal.tsx` (FinalStepBody aside + remoção confirm field + LoginPanel copy)
- `src/lib/unlock-flow.ts` (schema sem confirm_password)
- `src/lib/__tests__/unlock-flow.test.ts` (ajuste)
- `src/components/onboarding/__tests__/onboarding-modal.copy.test.tsx` (novo)

## Riscos

- **Schema change `confirm_password`**: removido também do tipo `UnlockFormValues`. Verifico se outros consumidores usam (`rg confirm_password src/`); se houver callers, ou ajusto ou mantenho confirm field. Vou validar antes de tocar.
- **CTA testid**: mantém `data-testid="onboarding-submit"` para não partir Playwright.
- **Mudança de copy do LoginPanel**: hardcoded → safe; sem dependentes i18n.

## QA manual a entregar

1. Abre modal de relatório com email novo → painel navy mostra "A tua área privada" + 4 bullets + nota de segurança; form tem 1 campo de password com toggle; submeter cria conta + abre relatório.
2. Abre modal com email já existente → screen mostra "Já existe uma conta com este email" + reassurance shield; login OK abre relatório; password errada mostra erro sem criar conta.
3. Inspecciona `localStorage.onboarding_draft_v1` após preencher → sem `password`.
4. DevTools Network: payload `/start` não inclui `confirm_password`.
5. Sem campo "Telemóvel" visível em nenhum step.
