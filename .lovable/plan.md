## Objetivo

Em mobile (`/analyze/$username`), o cabeçalho do relatório deve ocupar **muito pouco espaço vertical** — tanto o cartão de identidade do perfil como o cartão "Período analisado". O utilizador deve conseguir expandir cada um se quiser ver mais detalhe. Desktop fica inalterado.

## Estado atual (screenshot)

- Cartão do perfil ocupa ~340 px de altura em mobile mesmo no estado "compacto" (avatar 40 px + 3 linhas de métricas a quebrarem + 2 botões em linha separada).
- Cartão "Período analisado" ocupa ~300 px (eyebrow + subtítulo + chips + footnote).
- Juntos consomem todo o viewport antes do utilizador ver qualquer conteúdo.

Meta: reduzir o conjunto para **~120 px** colapsado em mobile (≈2 linhas), mantendo elegância editorial.

## Mudanças

### 1. `src/components/report-redesign/v2/report-hero-v2.tsx` — barra ultra-compacta em mobile

Reformatar a "compact bar" para uma **única linha** em mobile:

```
[avatar 28px] @handle · 10,1K seguidores      [⌄] [↓] [↗]
```

- Avatar: `size-7` (28 px) em mobile, `sm:size-10` mantém.
- Esconder tier badge ("Micro 10K–50K") em mobile (`hidden sm:inline-flex`) — passa só para o painel expandido.
- Métricas em mobile: **uma só métrica** (seguidores) ao lado do handle, separada por `·`. As restantes (publicações, analisadas) ficam reservadas ao painel expandido. `sm:` mostra a linha completa atual.
- Botões PDF / Partilhar: reduzir `size-9` → `size-8` em mobile, ícones `size-3.5`.
- Chevron, PDF e share alinhados na mesma linha à direita (já estão, mas confirmar `self-auto` em mobile em vez de `self-end`).
- Padding do cartão: `px-3 py-2 sm:px-5 sm:py-3`.
- Border radius do cartão: `rounded-xl sm:rounded-2xl` para parecer mais leve.

Painel expandido fica como está (já mostra avatar grande, nome, métricas completas).

### 2. `src/components/report-redesign/v2/analysis-period-selector.tsx` — cartão colapsável

Tornar o cartão de período também colapsável em mobile, espelhando o padrão do hero. Em desktop fica inalterado (sempre expandido).

Layout colapsado em mobile (uma linha):

```
[📅] Últimas 12 publicações · 30 dias                  [⌄]
```

- Estado `expanded` com `useState(false)`; sempre `true` em `sm:` via classe `sm:!block` no conteúdo expandido (ou simplesmente renderizar sempre e esconder o trigger em `sm:hidden`).
- Trigger collapsed (apenas mobile): pill discreta com calendar icon + label ativa + observed days + chevron. Toda a área é clicável (`button` wrapper).
- Conteúdo expandido (chips premium 30/60/90/365 + footnote) só renderiza se `expanded || sm:` (matchMedia não é necessário — usar Tailwind: trigger `sm:hidden`, conteúdo `${expanded ? 'block' : 'hidden'} sm:block`).
- Padding mobile mais apertado: `px-3 py-2.5 sm:px-6 sm:py-5`.
- Border radius: `rounded-xl sm:rounded-2xl`.
- Adicionar i18n keys novas em `pt/report.json` e `en/report.json`:
  - `selector.compact_summary`: `"{{sample}} · {{days}} dias"` (PT) / `"{{sample}} · {{days}} days"` (EN)
  - `selector.expand`: `"Ver janelas premium"` / `"View premium windows"`
  - `selector.collapse`: `"Recolher"` / `"Collapse"`

### 3. Espaçamento entre cartões

- Reduzir `pt-3 pb-2` do hero section para `pt-2 pb-1 sm:pt-3 sm:pb-2`.
- Reduzir `pb-4` do period selector para `pb-2 sm:pb-4`.

## Técnico

- Usar `useState` + classes condicionais Tailwind; sem mudanças de lógica de negócio.
- Manter aria-expanded, aria-controls, focus-visible rings.
- Todos os tokens já existem (`content-primary`, `border-default`, `surface-muted`, etc.).
- Sem alterações em desktop (≥640 px / `sm:`).

## Fora de scope

- Hero do `/` (landing).
- Lógica de premium, popovers de upgrade, tracking events.
- Conteúdo do painel expandido (mantém atual).
- `report.example` (mockup intacto).
- Tokens, fontes, design system.

## Validação

- Mobile 411 px: confirmar header + período colapsados ocupam ≤ 130 px de altura combinados.
- Clicar no chevron de cada cartão expande/recolhe sem layout shift do resto.
- Desktop 1280 px: layout idêntico ao atual.
- pt-PT em todas as labels novas; sem placeholder.

## Checkpoint

- ☐ `report-hero-v2.tsx`: barra compacta em uma linha em mobile
- ☐ `analysis-period-selector.tsx`: estado colapsado em mobile com expand
- ☐ i18n keys novas em pt + en
- ☐ Espaçamentos verticais reduzidos
- ☐ Verificação visual em 411 px e 1280 px
