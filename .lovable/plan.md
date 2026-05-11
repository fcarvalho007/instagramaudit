## Refinar modal de unlock — capa + passo final + largura

### 1. Adicionar passo de capa (Step "intro") antes do Passo 1

Ficheiro: `src/components/product/unlock-modal.tsx`

- Acrescentar `"intro"` ao tipo `Step` e tornar o estado inicial `"intro"`.
- Construir `IntroCover` inspirado na imagem de referência (mesma estética visual do lock-gate CTA do relatório), com:

  - Eyebrow esquerda em primary: **+4 secções grátis** · pílula âmbar à direita: **BETA · ACESSO GRATUITO**.
  - Título Fraunces: `Continua a leitura do <em>@{handle}</em>`.
  - Subtítulo Inter (13–14px):
    > Já viste **2 das 6 secções** do relatório. Faltam 4 — desbloqueia-as agora com o teu email. Demora menos de 1 minuto.
  - Lista de 3 cards horizontais com ícone (lucide), título Inter SemiBold e linha de apoio Inter Regular tertiary:
    1. **Diagnóstico editorial** — o que funciona, o que falha, onde estás abaixo do mercado.
    2. **Comparação com perfis pares** — onde estás no benchmark do teu escalão.
    3. **Desempenho, conteúdo e procura** — envolvimento, formatos, hashtags e sinais fora do Instagram.
  - Botão primário largo: **Desbloquear as 4 secções →** → chama `setStep(1)`.
  - Linha inferior subtil (ícones + texto 11px tertiary): `~1 minuto · RGPD · sem spam · BETA · capacidade limitada`.

- Sem barra de progresso na capa. A barra `ProgressSegments` continua a aparecer apenas no fluxo 1→4 (PASSO 1 DE 4 → PASSO 4 DE 4).
- O `goBack` no Passo 1 passa a regressar a `"intro"` em vez de ficar bloqueado.
- Tracking: enviar `unlock_modal_intro_viewed` quando a capa monta e `unlock_modal_intro_cta_clicked` ao clicar no botão (sem PII).

### 2. Passo final — sem preço, um único botão (já parcialmente feito, blindar)

Ficheiro: `src/components/product/unlock-modal.tsx` (`SuccessStep`) e `src/routes/analyze.$username.tsx`.

- Confirmar que `SuccessStep` mantém:
  - Botão único **Ver relatório gratuito agora →** (já presente).
  - Nota por baixo: **Este relatório foi associado diretamente à tua conta.** (já presente).
  - Lista `UNLOCKED_ITEMS` mantém-se (visão geral / diagnóstico / desempenho desbloqueados) — sem preço, sem CTA secundário.
- **Suprimir o `PricingFeedbackSheet`** que abre depois do unlock, porque é onde o preço aparece. Em `analyze.$username.tsx`:
  - Remover o uso de `usePricingFeedbackTrigger` e a renderização do `PricingFeedbackSheet`.
  - Manter o `dispatchEvent(PRICING_PDF_EVENT)` em vigor não faz mal, mas o sheet deixa de existir nesta página.
  - Imports não usados (`PricingFeedbackSheet`, `usePricingFeedbackTrigger`, `PRICING_PDF_EVENT`) ficam removidos.

### 3. Modal mais largo e mais respirado

Ficheiro: `src/components/product/unlock-modal.tsx` (`DialogContent`).

- `sm:max-w-[640px]` → **`sm:max-w-[760px]`** para desktop.
- Padding interno aumenta de `px-6 py-7 sm:px-7 sm:py-8` → `px-7 py-8 sm:px-9 sm:py-9` em todos os passos (capa, 1–4, success, welcome-back).
- Em mobile (<640px) mantém `max-h-[92vh] overflow-y-auto` e padding compacto. Validar a 375px.

### Fora de scope

- Não alterar `unlockFormSchema`, endpoints, eventos de produto nem fluxo de welcome-back.
- Não tocar em `report-shell-v2.tsx` nem nos cards do relatório.
- Não introduzir nova dependência.

### Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual:
  - Modal abre em **capa**, não no formulário.
  - Capa visível e legível em 375px e desktop, sem barra de progresso.
  - Clicar "Desbloquear as 4 secções" leva ao Passo 1 (form com nome/apelido/email).
  - "Voltar" no Passo 1 regressa à capa.
  - Fluxo 1→4 chega a Success com **um botão** + nota; **nenhum sheet de preço aparece** depois.
  - Após sucesso, o relatório abre com Bloco 01 completo (correção da iteração anterior preservada).
  - Sem erros na consola.

### Entrega

- Ficheiros alterados: `src/components/product/unlock-modal.tsx`, `src/routes/analyze.$username.tsx`.
- Resultado de tsc + vitest.