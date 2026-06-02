## Objetivo

Em mobile, transformar o hero numa "above-the-fold" focada **só** no preenchimento do perfil (eyebrow + título + subtítulo + caixa de input + trust). O mockup do report sai do primeiro ecrã e aparece **abaixo do scroll**, com mais respiração e título maior. Desktop fica inalterado.

## Alterações (apenas `src/components/landing/hero-section.tsx`)

### 1. Reordenar mockup em mobile

Atualmente o grid é `grid-cols-1` em mobile, com a coluna do mockup logo a seguir à coluna do formulário — fica visível ainda no primeiro scroll.

- Adicionar `order-1` à coluna esquerda (copy + action) e `order-2 lg:order-none` à coluna direita (mockup).
- No wrapper do mockup: aumentar a margem superior em mobile (`mt-10 sm:mt-12 lg:mt-0`) para criar separação clara entre o foco principal e a "prova visual" abaixo do scroll.

### 2. Aumentar título em mobile

H1 atual em mobile: `text-[1.75rem]` (28px). Subir para `text-[2.125rem]` (34px) → bom salto sem partir em ecrãs 360px com `text-balance`.

- `text-[1.75rem]` → `text-[2.125rem]`
- `leading-[1.12]` mantém-se
- `max-w-[18ch]` → `max-w-[16ch]` em mobile para forçar quebra elegante em 2 linhas

### 3. Melhorar espaçamento mobile

- Container: `py-8 md:py-24` → `py-12 md:py-24` (mais ar em cima/baixo)
- Stack vertical da coluna esquerda: `space-y-4 md:space-y-7` → `space-y-6 md:space-y-7`
- Eyebrow → H1: mais ar via aumento do `space-y` acima
- `pt-2 lg:pt-2` antes do `HeroActionBar` → `pt-4 lg:pt-2` (separa caixa de input do subtítulo)

### 4. Subtítulo ligeiramente maior em mobile

`text-base md:text-lg` → `text-[1.0625rem] md:text-lg` (17px → respiração editorial).

## Fora de scope

- Desktop (≥1024px) — todas as mudanças são scoped a mobile/sm com prefixos `md:`/`lg:` a preservar o estado atual.
- `HeroActionBar`, `HeroReportPreview`, tokens, copy, i18n.
- Light sections, header, footer.

## Validação

- Preview a 375px: confirmar que acima do scroll vê-se **só** eyebrow + título + subtítulo + caixa de input + trust line; mockup aparece com `mt-10` após scroll.
- Confirmar que o título cabe em 2 linhas sem clipping em 360px.
- Desktop 1280px: layout 2-col inalterado.

## Checkpoint

- ☐ Mockup empurrado para abaixo do scroll em mobile (via `order` + `mt`)
- ☐ H1 mobile a 34px com quebra em 2 linhas
- ☐ Espaçamento vertical aumentado entre eyebrow/título/subtítulo/caixa
- ☐ Subtítulo a 17px em mobile
- ☐ Desktop intacto
