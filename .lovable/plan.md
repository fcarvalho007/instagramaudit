## Objetivo

Aplicar a estrutura "foot-in-the-door" ao modal de lead magnet conforme os 3 mockups: nome primeiro, 3 perguntas rápidas a meio, **email como último passo**, e ecrã final reposicionado para destacar "grátis agora vs premium depois".

## Nova ordem dos passos (visível ao utilizador)

| Passo | Conteúdo | Notas-chave |
|------|----------|--------------|
| 1/5 | Nome | Subtítulo passa a "Para personalizarmos a leitura." (sem "e te tratarmos pelo nome"). |
| 2/5 | Relação com o perfil (`profile_ownership`) | Era o passo 3. |
| 3/5 | Objetivo (`goal`) | Era o passo 4. |
| 4/5 | Como te descreves (`user_type`) | Era o passo 5. |
| 5/5 | Email + telemóvel + consentimentos | Era o passo 2. Submissão final. |

Barra de progresso continua com 5 segmentos; no passo 5 fica completa, reforçando "falta só isto".

## Ficheiros a tocar

1. **`src/i18n/locales/pt/gate.json`** e **`/en/gate.json`** — reescrever blocos `step1…step5`:
   - `step1.subtitle` → "Para personalizarmos a leitura."
   - `step2` agora descreve `profile_ownership` (texto actual do antigo step3).
   - `step3` agora descreve `goal` (texto do antigo step4).
   - `step4` agora descreve `user_type` (texto do antigo step5).
   - `step5` (email) novo título: **"Onde queres receber o resumo do relatório?"**, subtítulo: **"Recebe o resumo por email e o acesso à tua conta privada, com todos os relatórios que pedires no futuro."**
   - Novo `step5.phoneLabel` = "Telemóvel" + `phoneRequiredMark` = "*" + `phoneHint` = "* Ajuda-nos a confirmar o teu acesso, caso o email não chegue."
   - `unlock.continueLong` ("Abrir relatório →") substituído no passo final por nova chave `unlock.openSummary` = **"Abrir resumo"** (com cadeado, como no mockup).
   - Blocos `success.*` actualizados: novo eyebrow "ENVIÁMOS PARA {{email}} · GUARDADO NA TUA CONTA", título "Resumo desbloqueado", subtítulo "Já podes consultar a tua leitura gratuita. Fica associada ao teu email para voltares quando quiseres.", secção "DESBLOQUEADO AGORA · GRÁTIS" com chip "Visão Geral completa", e bloco premium com âncoras + lista de 5 secções (Diagnóstico editorial, Desempenho real da tua conta, Análise ao conteúdo, Procura: Google vs Instagram, Comparação com outros perfis). CTA primário "Ver resumo agora", link secundário "Ver opções premium".
   - Versões EN equivalentes.

2. **`src/components/product/unlock-modal.tsx`**:
   - Atualizar `STEP_FIELD` para o novo mapeamento:
     ```ts
     const STEP_FIELD: Record<2 | 3 | 4, QField> = {
       2: "profile_ownership",
       3: "goal",
       4: "user_type",
     };
     ```
   - `goNext`:
     - Passo 1 → valida `full_name`.
     - Passo 2 → valida `profile_ownership`.
     - Passo 3 → valida `goal` (+ `goal_other_text` se "other").
     - Passo 4 → valida `user_type` (+ `user_type_other_text` se "other").
     - Passo 5 → valida `email`, `phone`, `gdpr_consent` e dispara `handleFinalSubmit`.
   - `StepShellAndForm` renderiza, por passo: `Step1FullName`, `RadioCardField` (ownership), `RadioCardField` (goal), `RadioCardField` (user_type), `Step5EmailPhone` (renomeado a partir de `Step2EmailPhone`).
   - Botão final: ícone cadeado + texto `t("unlock.openSummary")` em vez de "Continuar →".
   - **Lookup de email (`/api/public/unlock-check`)** e o estado `"welcome-back"`: o lookup deixa de fazer sentido a meio do funil (email já é o último passo). Remover a chamada no `goNext`; o backend continua a marcar `returning_lead: true` quando aplicável e o ecrã de sucesso adapta-se na mesma. Manter `WelcomeBackState` como componente morto não vale o ruído — eliminamos. `submitMinimal` deixa de ter call-site e é removido.
   - Atualizar `useStepHeader`: badge "~1 MIN" só no passo 1 (no passo 5 mostramos o badge "último passo" como no mockup; adicionar suporte para um badge alternativo via i18n `step5.badgeLast`).
   - Telemóvel: `Label` com asterisco a azul + nota `phoneHint` por baixo; **continua opcional na validação** (nudge visual, não bloqueio). Não alterar `unlockFormSchema`.

3. **Novo ecrã de sucesso (`SuccessStep`)** reescrito de raiz no mesmo ficheiro:
   - Header com check verde discreto + eyebrow "ENVIÁMOS PARA {{email}} · GUARDADO NA TUA CONTA".
   - Título: "Resumo **desbloqueado**" (verde editorial).
   - Bloco "DESBLOQUEADO AGORA · GRÁTIS" com chip verde "Visão Geral completa".
   - Bloco premium (border subtle): eyebrow "O premium ainda acrescenta mais" + 2 âncoras com ícones (Comparação com concorrentes, Posição exata no teu escalão) + separador + eyebrow "ACESSO A MAIS 5 SECÇÕES" + 5 itens com cadeado.
   - CTA primário: "Ver resumo agora →" (`onClose`).
   - CTA secundário (link): "Ver opções premium" — leva a `/precos` em nova tab (placeholder mas link real para a página existente).

## Fora do âmbito (não tocar)

- `src/lib/unlock-flow.ts`, `src/lib/unlock.server.ts` e `parseFullName` — a payload submetida no passo final mantém-se idêntica.
- `report-unlock` e `unlock-check` (endpoints) — não removemos as rotas, apenas deixamos de chamar `unlock-check` neste fluxo (continua disponível para outros consumidores).
- Schema da BD, premium gates, lógica de pagamento, geração de relatório, emails do Brevo.

## Validação

- Abrir `/analyze/<qualquer-handle>` em desktop e mobile 390×844; passar pelos 5 passos pela nova ordem.
- Confirmar copy exacta dos 3 mockups (passos 1, 5 e ecrã de sucesso).
- Confirmar que telemóvel é opcional na submissão (deixar vazio → submit deve passar).
- Confirmar que `marketing_consent` desmarcado continua a permitir submit.
- Returning lead: voltar a submeter com o mesmo email — sucesso aparece na mesma; sem `welcome-back` flow.
- `bunx tsc --noEmit` ✅
- `bunx vitest run` ✅ (não devem ser tocados testes existentes).

## Output esperado

- Ficheiros alterados: `gate.json` (pt/en), `unlock-modal.tsx`.
- Nova ordem confirmada em screenshot.
- `tsc` + testes verdes.
