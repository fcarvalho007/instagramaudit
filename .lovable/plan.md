## Problema

No mobile (≤414px) os passos 2 e 3 do `OnboardingModal` ficam altos demais para o `max-h-[92vh]` do `DialogContent`. A barra de ações (Voltar / Continuar / Gerar relatório) faz parte do fluxo scrollável, logo o utilizador vê o botão "Continuar" cortado a meio (screenshot do passo 2) e precisa de scrollar para chegar ao CTA — má leitura e fricção real de conversão.

Causas concretas em `src/components/onboarding/onboarding-modal.tsx`:

- `FormStepBody` (l. 717-809): o container é um único `div` com padding `py-7`; o bloco de botões (l. 771) está dentro do mesmo flow scrollable, sem `sticky`.
- `ChipGroup` (l. 873): cada chip tem `min-h-[88px]` + `py-3.5` + ícone `size-[22px]` → 2 grupos de 4 chips em mobile (2 colunas) ocupam ~2×(2×88px + gaps) ≈ 370px só de chips no passo 2.
- `Step3EmailGdpr`: o cartão de consentimentos (l. 1046) usa `p-4 space-y-3` e os labels têm `leading-[1.55]` com texto `[14px]` — cresce muito em 411px.
- Header (l. 719-737) usa `space-y-2.5` + `DialogTitle` `text-[28px]` + `ProgressSegments` extra; em mobile isto come ~140-160px antes de qualquer campo.

## Objetivo

Garantir que, em mobile, o botão primário (Continuar / Gerar o meu relatório) está sempre visível sem precisar de scroll, mantendo o desktop praticamente igual ao atual.

## Alterações (apenas UI, ficheiro único)

Ficheiro: `src/components/onboarding/onboarding-modal.tsx`

1. **Footer sticky no `FormStepBody`**
   - Tornar o `<div>` raiz do `FormStepBody` um `flex flex-col` com `max-h-[92vh]` (ou `h-full` herdando o `max-h` do `DialogContent`).
   - Body do form passa a `flex-1 overflow-y-auto` (com padding mantido).
   - A barra de botões (l. 771) sai de dentro do `<form>` scrollável e fica num footer `sticky bottom-0` com `bg-background`, `border-t`, e `pb-[max(env(safe-area-inset-bottom),0.75rem)]` para respeitar a safe area do Android/iOS. O `<form>` continua a envolver tudo (mantém submit por Enter); o botão `type="submit"` continua no footer.

2. **Densidade no passo 2 (`ChipGroup` + `Step2Context`)**
   - `min-h-[88px]` → `min-h-[68px] sm:min-h-[88px]`.
   - `py-3.5` → `py-2.5 sm:py-3.5`.
   - `gap-2` no chip e ícone `size-[22px]` → `size-[18px] sm:size-[22px]`.
   - `Step2Context`: `space-y-5` exterior → `space-y-4 sm:space-y-5`; `flex flex-col gap-5` → `gap-4 sm:gap-5`.
   - Remover a linha `consequenceLine` em mobile (`hidden sm:block`) — é redundante com o subtítulo no topo e poupa ~32px.

3. **Densidade no passo 3 (`Step3EmailGdpr`)**
   - Cartão de consentimentos: `p-4 space-y-3` → `p-3 space-y-2.5 sm:p-4 sm:space-y-3`.
   - Texto dos labels: `text-[14px] leading-[1.55]` → `text-[13.5px] leading-[1.5] sm:text-[14px] sm:leading-[1.55]`.
   - Hint do telemóvel: ocultar em mobile (`hidden sm:block`) — o "opcional" no label já comunica isto.

4. **Densidade do header em mobile (`FormStepBody`)**
   - Container: `px-5 py-7` → `px-5 py-5 sm:px-9 sm:py-9`.
   - `DialogTitle`: `text-[28px]` → `text-[24px] sm:text-[30px]`, `leading-[1.08]` mantém.
   - `space-y-2.5` no header → `space-y-2 sm:space-y-2.5`.
   - Espaço entre header e form: `mt-5` → `mt-4 sm:mt-5`.

5. **Botões mobile (preservar hierarquia visível)**
   - Manter `flex-col-reverse` (Continuar acima do Voltar em mobile — convenção atual).
   - Reduzir `gap-2.5` → `gap-2` em mobile.
   - Garantir que ambos têm `h-12` consistente (já têm via `size="lg"`).

## Out of scope

- Não alterar copy do `gate.json`.
- Não tocar nos passos 0 (Intro), 1 (Nome) nem `LoginStepBody`.
- Não mexer em lógica, validação, tracking, payload, schemas, rotas, server functions ou tokens globais.
- Sem alterações desktop visíveis (todos os overrides são em mobile via breakpoint `sm:`).

## Verificação

- `bunx tsc --noEmit`.
- Browser tool em viewport 411×742 (o viewport real do user): abrir homepage → escrever handle → entrar no onboarding → screenshot dos passos 2 e 3 confirmando que "Continuar" / "Gerar o meu relatório" estão visíveis sem scroll, e que com scroll o footer fica fixo no fundo.
- Confirmar desktop (1280×720) inalterado com screenshot do passo 2.
