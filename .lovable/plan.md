## Refinamentos do Hero (homepage)

Foco: o utilizador tem de perceber imediatamente que basta colar o perfil. Tudo o resto suporta esse gesto.

### 1. Subtítulo — singular + uma linha em desktop
- `src/i18n/locales/pt/landing.json` → `hero.subtitle`: "Diagnóstico profissional para melhorar a presença digital."
- `src/i18n/locales/en/landing.json` → "Professional diagnostics to improve your digital presence." (mantém)
- Em `hero-section.tsx`, no `<BlurRevealText>` do subtítulo:
  - reduzir tamanho desktop: `text-[1.0625rem] md:text-base lg:text-[1.0625rem]` (~17px) com `whitespace-nowrap` apenas em `lg:` e remover `max-w-xl` no breakpoint `lg` para garantir uma linha.
  - mobile mantém `text-base leading-[1.55]` e várias linhas (já cabe).

### 2. "em segundos" — "g" cortado
Causa: `leading-[1.02]` no h1 corta descendentes do Fraunces.
- Em `hero-section.tsx`, ajustar a heading para `leading-[1.1] sm:leading-[1.08] lg:leading-[1.06]` e adicionar `pb-2` ao h1 (ou `pb-[0.15em]`) para reservar espaço de descendente.
- Verificar que `BlurRevealText` não aplica `overflow: hidden` que corte — se aplicar, mudar para `overflow-visible` no wrapper interno.

### 3. Seta junto a "Inserir perfil público do Instagram"
Problema actual: seta posicionada com `left: calc(... + 21ch)` aterra em cima do texto e parece partida.
Solução:
- Remover posicionamento absoluto baseado em `ch`.
- Tornar o microlabel `inline-flex` com a seta como **irmão inline** à direita do texto, com `position: relative` e `top: -10px` / `transform: rotate(-15deg)`.
- Tamanho: `w-10 h-auto`, opacidade `0.85`, sem `drop-shadow` neon (filtro apenas `invert(1) brightness(1.1)`).
- Animação `hero-hint-bounce` mantém-se mas com amplitude menor (translateY 0→3px, 2s).
- Esconder em `< sm` (já está) e também quando o input tem foco (adicionar classe via `:focus-within` no wrapper da bar).

### 4. Refine do flow no preview (lado direito)
Foco: a imagem deve **suportar** o input, não competir com ele.
- Reduzir `opacity` do logo IG de `0.12` → `0.07` e `blur(2px)` → `blur(4px)`.
- Reduzir `scale` do TiltCard de `1.02` → `1.01` e `tiltLimit` de `8` → `5` (menos agressivo, mais editorial).
- Adicionar `opacity: 0.92` ao wrapper do `HeroReportPreview` em desktop e `0.85` quando o input do hero tem foco (via classe condicional num Context simples ou via `:has(.hero-bar:focus-within)` no contentor pai — usar a abordagem CSS `:has` pois o suporte é universal nos browsers alvo).
- Adicionar transição `opacity 250ms ease, transform 400ms ease` para o efeito ser visível.

### 5. Mobile — ordem dos blocos
Actualmente em mobile o report aparece logo a seguir ao action bar (ainda visível "37 / 100" no scroll inicial). Queremos que o foco fique no input.
- Em `hero-section.tsx` ajustar a grid:
  - `order-1` (copy + input) já está.
  - `order-2` no preview → manter, mas adicionar `mt-16 sm:mt-12 lg:mt-0` (era `mt-10`) para empurrar o preview mais para baixo em mobile.
  - Adicionar à secção do hero `lg:min-h-[calc(100dvh-4rem)]` já existe; em mobile remover qualquer altura mínima para o preview não aparecer "above the fold".
  - Garantir que o `ScrollIndicator` aparece **entre** o action bar e o preview em mobile (ou apenas em desktop). Proposta: esconder o `ScrollIndicator` em mobile (`hidden lg:flex`) — em mobile o próprio scroll natural cumpre a função.

### Ficheiros a tocar
- `src/i18n/locales/pt/landing.json`
- `src/components/landing/hero-section.tsx`
- `src/components/landing/hero-action-bar.tsx`
- `src/styles/hero-dark.css`
- `mem/design/hero-homepage.md` (registar regra: subtítulo singular numa linha; seta inline; preview opacity 0.92 idle / 0.85 focus)

### Fora de scope
- Conteúdo do `HeroReportPreview` (mantido).
- Backend, rotas, i18n keys novas.
- Hydration warning é resolvido naturalmente porque o texto pt mudou (cache de SSR atualiza no próximo build).

### Checkpoint
- ☐ Subtítulo singular e numa linha em ≥1024px
- ☐ "segundos" sem corte do "g" em todos os breakpoints
- ☐ Seta inline ao lado do microlabel, sem sobrepor texto
- ☐ Preview com opacidade reduzida + tilt mais subtil + atenua em focus do input
- ☐ Mobile: preview começa claramente abaixo da fold; foco visual no input