## Objetivo

Melhorar a leitura mobile (≤640px) da homepage `/`. O screenshot mostra três problemas:

1. **Densidade vertical desigual** — eyebrow → headline → subtítulo → micro-label → caixa @ → trust → mockup. Tudo com gaps semelhantes; falta respiração entre blocos.
2. **Caixa @ + CTA empilhados ocupam muita altura** (input 64px + botão full-width grande + padding 10px), empurrando o mockup para fora do above-the-fold.
3. **Mockup por baixo entra "colado" e sem destaque** — pequeno glow ciano, sem separação clara da action bar; lê-se como "continuação" e não como "prova visual do produto".

## Escopo (apenas UI/CSS, mobile-first)

Ficheiros:
- `src/components/landing/hero-section.tsx`
- `src/components/landing/hero-action-bar.tsx`
- `src/components/landing/hero-report-preview.tsx`

Fora de escopo: tokens globais, copy/i18n, lógica, desktop (≥1024px mantém-se igual), light sections seguintes.

## Mudanças

### 1. `hero-section.tsx` — ritmo vertical mobile

- Padding da `<section>`: `py-10 md:py-24` → `py-8 md:py-24` (menos topo em mobile, header já cria ar).
- Stack de copy: `space-y-5 md:space-y-7` → `space-y-4 md:space-y-7` (eyebrow/headline/sub mais compactos).
- Gap entre coluna esquerda e mockup: `gap-8 lg:gap-12` → `gap-10 lg:gap-12` (mais separação em mobile entre action bar e mockup).
- `pt-4 lg:pt-2` antes da action bar → `pt-2 lg:pt-2` (a action bar já tem micro-label como header próprio).

### 2. `hero-action-bar.tsx` — caixa @ mais compacta em mobile

- Altura do input mobile: `h-16 sm:h-[72px]` → `h-14 sm:h-[72px]` (56px em mobile, mantém 72px desktop).
- Padding wrapper do botão: `p-2.5` → `p-2 sm:p-2.5`.
- CTA mobile: manter full-width mas reduzir altura visual via `size="lg"` já controlado; ok.
- Trust line: margem `mt-3` → `mt-4` (separa do bloco branco).
- Remover `hero-bar-breathe` em mobile via `sm:hero-bar-breathe` (a animação de scale só faz sentido com mais ar à volta; em mobile causa "tremor" perto do mockup). Manter a classe só para `sm:`+; em mobile aplicar estática.

### 3. `hero-report-preview.tsx` — destaque do mockup em mobile

Problemas atuais: glow ciano fraco contra fundo navy + chrome de browser cinzento → o cartão lê-se "morto".

- Adicionar `mt-2 sm:mt-0` ao wrapper (separa visualmente da action bar).
- Reforçar glow em mobile: `-inset-8` → `-inset-6 sm:-inset-8`, `opacity-80` → `opacity-100 sm:opacity-80`, e segundo radial-gradient sutil em violeta no canto inferior esquerdo para ganhar profundidade ("aurora compacta"):
  ```
  background:
    radial-gradient(70% 55% at 65% 35%, rgb(var(--hero-cyan) / 0.32), transparent 70%),
    radial-gradient(50% 50% at 20% 85%, rgb(var(--hero-violet) / 0.18), transparent 70%);
  ```
- Sombra do cartão: aumentar contraste em mobile — adicionar `0 0 0 1px rgba(125,211,252,0.08) inset` para "vidro" mais definido.
- Score "37 / 100": em mobile fica pequeno relativo ao espaço. `text-2xl sm:text-3xl` → `text-3xl sm:text-3xl` e barra de progresso `h-1.5` → `h-2 sm:h-1.5` (mais peso visual no único número que importa).
- Eyebrow do score (`scoreLabel`): `mb-2` → `mb-1.5`.
- KPIs: `text-base` → `text-lg sm:text-base` (mais leitura em mobile).
- Padding interior: `px-4 sm:px-5 pt-5` no primeiro bloco continua; reduzir `pb-5` final para `pb-4` em mobile (`pb-4 sm:pb-5`).
- "Premium rows" blurred: reduzir de 3 para 2 linhas em mobile (`premiumRowKeys.slice(0, isMobile ? 2 : 3)` — sem hook, usar Tailwind: renderizar 3 mas esconder a terceira com `hidden sm:flex`). Mantém promessa premium sem empurrar fold.

## Validação

- `bunx tsc --noEmit` passa.
- Preview a 375px: eyebrow legível, caixa @ não passa metade do ecrã, mockup começa visível com glow notável, score "37 / 100" domina o cartão.
- Desktop ≥1024px inalterado (todas as mudanças são `mobile-only` ou `sm:` overrides que repõem valores atuais).
- Sem novas dependências, sem alterações de tokens globais, sem alterações em ficheiros locked (`hero-dark.css` intacto).

## Checkpoint

- ☐ `hero-section.tsx`: padding + space-y + gap ajustados mobile
- ☐ `hero-action-bar.tsx`: altura input + breathe `sm:` only + trust margin
- ☐ `hero-report-preview.tsx`: glow dual-radial + score maior + 3ª premium row hidden mobile
- ☐ Typecheck verde
- ☐ QA visual @375px
