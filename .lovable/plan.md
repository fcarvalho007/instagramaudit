## Objetivo

Aplicar os 3 refinamentos menores identificados na revisão anterior do `unlock-modal.tsx` e garantir que o modal está bem adaptado a mobile (375px e abaixo), sem alterar copy, fluxo, tracking ou lógica de negócio.

## Alterações propostas

### 1. Acessibilidade — foco visível no radio (Step 2 e Step 4)

Ficheiro: `src/components/product/unlock-modal.tsx` (componente `RadioGroupCustom`, ~l.880–945)

- Adicionar `peer` ao `<input type="radio" className="sr-only">`.
- No círculo customizado (`<span aria-hidden>` com `border-2`), acrescentar:
  `peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-base`
- Resultado: navegação por Tab passa a desenhar um anel visível à volta do círculo do radio, sem alterar o estado selecionado.

### 2. Botão CTA do Step 5 — usar variant do Button

Ficheiro: `src/components/product/unlock-modal.tsx` (l.1163–1170)

- Substituir `className="… bg-content-primary text-white hover:bg-content-primary/90"` por `variant="default"` (já temático) e manter apenas `className="w-full rounded-lg font-medium mt-4"`.
- Verificar visualmente que `variant="default"` produz o botão escuro pretendido; se não, usar `variant="primary"` consoante o que existe em `src/components/ui/button.tsx` (a inspecionar antes de editar).

### 3. Pricing cards — semântica correta

Ficheiro: `src/components/product/unlock-modal.tsx` (l.1122–1160)

- Remover `aria-disabled` dos dois `<div>` de pricing.
- Substituir por `role="presentation"` (são puramente visuais; CTA principal fecha o modal e nada acontece ao clicar nos cards).
- Manter `cursor-default`.

### 4. Auditoria e ajustes mobile (375px e 320px)

Verificar e, se necessário, ajustar:

- `DialogContent` já tem `sm:max-w-[480px] max-h-[92vh] overflow-y-auto` — OK.
- Step 5 — pricing cards (`grid-cols-2`, l.1122): no card "BUNDLE 5", o badge `★ POUPA €2` está em `absolute -top-2 right-2`. Em 320px o card é muito estreito e o badge pode tocar/sair do limite direito. Ajustar para:
  - reduzir padding do card de `p-3` para `p-2.5` em mobile (`p-2.5 sm:p-3`), ou
  - encurtar badge para `★ -€2` em mobile via `sm:` prefix, ou
  - mover badge para `-top-2 right-1.5` e garantir `whitespace-nowrap`.
  Decisão: aplicar `whitespace-nowrap` + `right-1.5` (mínimo invasivo).
- Step 5 header (l.1004): `px-6 pt-7 pb-5 sm:px-7` — confirmar que o título Fraunces 28–30px não quebra de forma feia em 320px. Já tem `text-[28px] sm:text-[30px]` — OK.
- Step 1 (l.531): `text-[28px] sm:text-[30px]` no DialogTitle — OK.
- Linha de pares de botões "Voltar / Continuar" (l.632, 1229): usar `flex gap-3` com botões `flex-1` para garantir que em 320px ambos cabem; verificar se já está assim, caso contrário adicionar `flex-1`.
- Confirmar que `max-h-[92vh] overflow-y-auto` permite scroll completo no Step 5 em viewports curtos (iPhone SE, 568px de altura).

A auditoria mobile será feita com `preview_ui--set_preview_device_viewport` + screenshot do preview nos 5 steps após as edições.

## Fora de âmbito

- Copy, fluxo, tracking, eventos, lógica de leads/email.
- Step 5 CTA continua a fechar o modal (apenas visual).
- `welcome-back state` mantém-se como está.

## Checkpoint

- ☐ Radio com foco-visível (Step 2 + Step 4) navegável por teclado
- ☐ Step 5 CTA migrado para `variant` do Button sem regressão visual
- ☐ Pricing cards com `role="presentation"` e sem `aria-disabled`
- ☐ Pricing card "BUNDLE 5" sem overflow do badge a 320px
- ☐ Botões "Voltar / Continuar" cabem a 320px
- ☐ Screenshots dos 5 steps a 375px confirmam render correto
