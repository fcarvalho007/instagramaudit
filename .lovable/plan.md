# Hero — refinamento focado em conversão

Objetivo único: que o olho do utilizador vá direto ao campo "Inserir perfil público do Instagram" e o preencha. Tudo o resto é suporte.

## A. Nova seta — vertical, inequívoca

Remover o PNG manuscrito flutuante (`handdrawn-arrow.png`) do microlabel. Substituir por uma seta SVG inline (chevron-down ou arrow-down do Lucide) posicionada **imediatamente acima do input**, do lado esquerdo, alinhada com o placeholder.

- Em `hero-action-bar.tsx`: eliminar `<img src={handdrawnArrowAsset.url}>` e o respetivo import
- Adicionar `<ArrowDown />` do `lucide-react` com `size={18}`, cor `rgb(var(--hero-cyan))`, dentro de um wrapper absoluto `top: -28px, left: 16px`
- Animação: `hero-hint-bounce` reescrita em `hero-dark.css` para apenas `translateY(0 → 4px → 0)` em 1.8s, sem rotação
- A seta desaparece (`opacity: 0`) quando `.hero-input-zone:focus-within` ou quando o input tem valor (toggle via classe a partir do estado React)
- Mantém-se escondida em mobile (`hidden sm:block`) porque em mobile o input fica logo abaixo do título sem ambiguidade

## B. Realçar o input em repouso

O input passa a "chamar" o utilizador sem ruído:

- Ring permanente subtil: `box-shadow: 0 0 0 1px rgba(56,189,248,0.25), 0 0 32px -8px rgba(56,189,248,0.2)`
- Em hover/focus o ring intensifica: `0 0 0 2px rgba(56,189,248,0.55), 0 0 48px -8px rgba(56,189,248,0.35)`
- Micro-pulse de **1 único ciclo** ao carregar a página (não loop): keyframe `hero-input-attract` 0% → 50% (ring expande para 4px) → 100% (volta a 1px), duração 2.2s, `animation-iteration-count: 1`, delay 1.4s (depois da reveal do título)
- Adicionar `prefers-reduced-motion` guard

Tudo aplicado via CSS em `hero-dark.css` na classe `.hero-input-zone input` — sem mexer em props do componente.

## C. Esconder ScrollIndicator em mobile

Em `hero-section.tsx`, o `<ScrollIndicator />` recebe `className="hidden lg:flex"` (ou wrapper equivalente se o componente não aceitar className). Em mobile o preview já está empurrado para baixo e o scroll é óbvio — o indicador apenas adiciona ruído visual junto ao CTA.

## D. Restart do dev server

Os 504 em `react_jsx-runtime.js` e a falha de `virtual:tanstack-start-client-entry` indicam que o Vite está wedged depois das últimas iterações no hero. Antes de validar visualmente, fazer `restart_dev_server` para limpar o cache de deps. Sem isto, qualquer mudança visual não vai ser fiável no preview.

## Ficheiros tocados

- `src/components/landing/hero-action-bar.tsx` — remover PNG arrow, adicionar `<ArrowDown />` posicionada, classe condicional para esconder quando input preenchido
- `src/styles/hero-dark.css` — reescrever `@keyframes hero-hint-bounce`, adicionar `@keyframes hero-input-attract`, atualizar `.hero-input-zone input` com ring permanente + estados focus/hover, guard de `prefers-reduced-motion`
- `src/components/landing/hero-section.tsx` — `<ScrollIndicator className="hidden lg:flex" />` (verificar se o componente aceita className; se não, envolver em `<div className="hidden lg:block">`)
- `src/assets/handdrawn-arrow.png.asset.json` — apagar (já não usado em lado nenhum, confirmar com grep antes)
- `mem/design/hero-homepage.md` — atualizar regra: "seta = Lucide ArrowDown vertical acima do input, nunca PNG manuscrito"

## Fora de scope

- Conteúdo do `HeroReportPreview`
- Copy do headline/subtitle
- TiltCard (mantém-se como está)
- Logo Instagram fosco no canto (mantém-se)
- Qualquer backend ou i18n novo

## Checkpoint

- ☐ Seta SVG vertical visível acima do input em desktop, ausente em mobile
- ☐ Seta desaparece quando input recebe foco ou tem valor
- ☐ Input com ring cyan permanente subtil + pulse único ao carregar
- ☐ ScrollIndicator escondido em mobile
- ☐ Dev server reiniciado e preview a carregar sem 504
- ☐ PNG `handdrawn-arrow` removido do código e do CDN
