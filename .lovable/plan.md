# Final step do onboarding — corte do botão + submit silencioso

Dois problemas reais na screenshot do passo 3 (`/precos` → checkout → modal):

1. O botão primário ("Criar conta e continuar" / "Gerar o meu relatório") aparece cortado a meio ("…continu") em desktop e tablet — o truncate que adicionei no último passe limita o texto dentro do botão em vez de evitar o corte.
2. Ao clicar nada acontece: sem alerta, sem erro, sem network call. É a `react-hook-form` a bloquear silenciosamente porque o `handleSubmit` corre `unlockFormSchema` (que exige `profile_ownership`, `goal`, `user_type`) e algum desses campos pode estar `undefined` sem que o utilizador veja erro nenhum (não há `<FieldError>` para esses campos no passo 3, porque vivem no passo 2).

## Diagnóstico do clique silencioso

`unlockFormSchema` exige:
- `profile_ownership` (required_error: "Escolhe uma opção")
- `goal` (required_error: "Escolhe uma opção")
- `user_type` (default `"creator"` — ok)
- `gdpr_consent` literal true — checkbox visível

Nada no `FinalStepBody` mostra erros de `profile_ownership` ou `goal`. Se por qualquer razão (ex.: utilizador volta atrás, refresh do draft, qualquer reset do form) esses dois ficarem por preencher, o submit fica preso e o utilizador não tem feedback. Solução: nunca permitir submit silencioso. Garantir que erros invisíveis fazem o utilizador voltar ao passo 2 com uma mensagem clara.

## Mudanças

### A. Submit garantido (`FinalStepBody` + handler)

- Em vez de `onSubmit={() => onSubmit()}`, usar um wrapper local que:
  1. Faz `form.trigger()` antes de chamar o submit;
  2. Se houver erros em campos do passo 2 (`profile_ownership`, `goal`, `goal_other_text`), chama um novo callback `onMissingQualification()` que faz `setView({ kind: "qualification", email })` e marca os erros para serem visíveis no passo 2;
  3. Se houver erros em campos do passo 3, garante que o `serverError` no topo mostra "Verifica os campos em falta" e dá foco ao primeiro inválido.
- Adicionar `Alert` resumido no topo do painel direito quando `Object.keys(form.formState.errors).length > 0` mas nenhum campo visível tem erro renderizado (defesa contra silent fail). Copy: "Faltam dados do passo anterior. Volta para completar."
- O `OnboardingModal` passa `onMissingQualification={() => setView({ kind: "qualification", email: view.email })}` ao `FinalStepBody`.

### B. Corte do botão CTA

A raiz do problema é o painel branco direito ter pouco espaço (col split `1fr_1.15fr` em `lg`) para acomodar dois botões `size="lg"` com ícone + label longa. Vou:

- Aumentar o ratio do painel direito: `lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]` (dá ~30px extra ao formulário).
- Reduzir o painel navy `px` em desktop (`lg:px-7` em vez de `lg:px-10` implícito via `sm:px-8`).
- Empilhar os botões em layouts apertados: usar `sm:flex-row` apenas a partir de `md:` (tablet largo). Em mobile e tablet pequeno, ambos full-width, CTA por cima de "Voltar" (CTA continua a aparecer primeiro visualmente, "Voltar" em baixo como `variant="ghost"` text-only para libertar muito espaço).
- Em desktop: manter "Voltar" `variant="outline"`, mas reduzir o seu `size` para `default` (não precisa ser tão proeminente como o CTA) e remover o `min-w-0`/`truncate` do CTA — o texto deixa de cortar porque há espaço.
- Encurtar `onboarding.final.right.ctaCheckout` para "Criar conta" (PT) / "Create account" (EN) — o ícone de cadeado já comunica segurança, "e continuar" é redundante neste contexto (já estão no checkout). Mantém "Gerar o meu relatório" em analyze (cabe perfeitamente).

### C. Refinamentos de UX (mesma página, sem desviar do âmbito)

- Mostrar a string `Voltar` com `←` apenas em desktop; em mobile mostrar texto only para não competir com o CTA.
- Adicionar `aria-live="polite"` ao container do `serverError` para leitores de ecrã anunciarem erros.
- Aumentar contraste do `emailHint` (`text-content-tertiary` → `text-content-secondary`) — está quase ilegível na screenshot.
- Espaçamento: subir o stepper acima do campo Nome com `pb-1` para se descolar visualmente do formulário (agora está colado).
- Garantir que o `OnboardingStepHeader` aparece com `mb-5` também no `FinalStepBody` (atual: só `<OnboardingStepHeader current={3} />` sem margem — explica porque pode parecer encostado).

## Ficheiros a alterar

- `src/components/onboarding/onboarding-modal.tsx`
  - `FinalStepBody`: wrapper de submit com pre-check, prop `onMissingQualification`, Alert defensivo, ajustes de layout dos botões e do grid, `mb-5` no stepper.
  - `OnboardingModal`: passar `onMissingQualification` ao `FinalStepBody`.
- `src/i18n/locales/pt/gate.json` e `src/i18n/locales/en/gate.json`
  - Encurtar `onboarding.final.right.ctaCheckout` ("Criar conta" / "Create account").
  - Adicionar `onboarding.final.right.missingQualification` ("Faltam dados do passo anterior. Volta para completar." / "Missing details from the previous step. Go back to complete.").

## Fora do âmbito

- Schema/server (`unlock-flow.ts`, `/api/onboarding/start`), tracking, OTP, OAuth, EuPago, créditos.
- Refactor do `unlock-modal` antigo.
- Mudar tokens globais ou design system.

## QA manual

1. `/precos` → checkout (logged-out) → modal abre no passo 1 (stepper visível, "Passo 1 de 3").
2. Email novo → passo 2 com 2 cartões. Preencher e avançar → passo 3 ("Último passo" no topo).
3. Botão "Criar conta" (label encurtada) totalmente visível em 1440px / 1280px / 1024px / 820px / 768px / 414px / 375px — sem texto cortado.
4. Submeter com nome + email + GDPR válidos → faz POST `/api/onboarding/start` e avança para OTP.
5. Caso de defesa: simular `form.setValue("profile_ownership", undefined)` via React DevTools antes de submeter → vê Alert "Faltam dados…" e é levado de volta ao passo 2 (não fica preso silenciosamente).
6. Modo analyze (`/analyze/...`) continua a mostrar "Gerar o meu relatório" sem corte.
7. Aria-live anuncia erros para leitores de ecrã.
