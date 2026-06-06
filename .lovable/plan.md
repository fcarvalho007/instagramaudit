## Contexto

A sidebar do relatório (`src/components/report-redesign/v2/report-block-nav.tsx`) já é sticky (`sticky top-24`, `max-h-[calc(100vh-7rem)] overflow-y-auto`) e usa `useActiveBlock` (em `use-active-block.ts`) com `IntersectionObserver` + recompute. Todos os IDs alvo (`overview`, `engagement`, `frequencia`, `formatos`, `publicacoes-chave`, `contexto-estrategico`, `prioridades`) já existem no DOM — incluindo nos teaser cards bloqueados — pelo que a base é sólida e não precisa de alterações estruturais grandes.

Falta: (a) deixar as secções bloqueadas ficarem destacadas durante o scroll, (b) ao clicar num item bloqueado fazer scroll para o teaser em vez de abrir o modal, (c) adicionar um estado *compact* da sidebar quando o utilizador sai do topo (avatar + handle numa linha, espaçamento mais apertado, controlos lado-a-lado, CTA compacto "Desbloquear · 9€"). Sem mexer em pagamentos, unlock, períodos, concorrentes, geração de relatório ou métricas.

## Alterações

### 1. `src/components/report-redesign/v2/use-active-block.ts`
Sem alterações. O hook já lida corretamente com listas de IDs arbitrárias.

### 2. `src/components/report-redesign/v2/report-block-nav.tsx`

**Scroll-spy estendido a secções bloqueadas**
- Em `ReportBlockSidebar`, passar **todos** os IDs (`items.map(i => i.block.id)`) a `useActiveBlock` em vez de apenas os `accessibleIds`. Os teasers premium têm âncoras `id="frequencia"`, etc., logo o destaque acompanha o scroll.
- Em `ReportBlockTopTabs` (mobile), continuar a passar apenas `accessibleIds` para a rail visível (mantém UX atual), mas dentro do drawer reutilizar o mesmo `active` global — já partilha o `SidebarList`, sem mudanças extra.

**Click em item bloqueado → scroll, não modal**
- `LockedItemRow` passa a chamar `scrollToBlock(item.block.id)` em vez de `handlePremiumAccessClick("sidebar_section", …)`.
- O modal premium continua acessível através dos chips de período, do botão "Adicionar concorrente" e do CTA principal — esses handlers ficam inalterados.

**Estado compact**
- Novo hook local `useSidebarCompact()` que ouve `window.scroll` (com `passive: true`) e devolve `true` quando `window.scrollY > 220`. Cleanup em `useEffect` standard. Sem dependências novas, debounce via `requestAnimationFrame` para evitar re-renders excessivos.
- `ReportBlockSidebar` propaga `compact` para `ProfileHeader`, `ProgressSummary`, `SidebarList`, `ExploreSection` e `UnlockPromoCard`.
- Diferenças visuais quando `compact=true`:
  - **Padding do `<nav>`**: `p-3` em vez de `p-4 xl:p-5`.
  - **`ProfileHeader`**: avatar size `sm`, layout single-line (`avatar + handle`), subtítulo passa a `"1 de 7 secções"` (free) ou `"Relatório completo"` (paid, sem o pill grande). Sem border-bottom.
  - **`ProgressSummary`**: oculto (free) — a contagem fica no subtítulo.
  - **Grupos**: oculta os eyebrows ("Leitura gratuita" / "Relatório completo" / "Secções"); reduz `space-y-4` → `space-y-2`; `ItemRow` perde o badge "Grátis"/"Premium" (via `showBadge={false}`); `py-2.5` → `py-1.5`.
  - **`ExploreSection`**: oculta o eyebrow "EXPLORAR"; transforma "Período" e "Concorrente" em **dois botões pequenos lado-a-lado** (grid 2 colunas). Em free, ambos com ícone + lock pequeno; em paid, ícones funcionais (calendar + user-plus). Cada botão abre o respetivo flow já existente (`handlePremiumAccessClick("sidebar_period")` / `("sidebar_add_competitor")` em free; UI-only em paid).
  - **`UnlockPromoCard`** (free): substitui o card; mantém apenas o botão CTA dentro de uma pill compacta com label `nav.unlock.cta_compact` → `"Desbloquear · 9€"` (preço dinâmico via `PUBLIC_PRODUCTS.report_full_9.priceLabel`). Sem subcopy. Sem padding extra.
  - **Paid compact**: substitui a pill verde grande por um pequeno indicador inline `✓ Relatório completo` (sem contagem detalhada); sem CTA.
- Transições suaves: usar `transition-all duration-200` no `<nav>` e nos blocos afetados; sem layout shift no body porque o `<nav>` é `sticky` e ocupa coluna própria.

**Acessibilidade**
- Todos os botões mantêm `aria-label` e ficam focáveis.
- O estado ativo continua a usar barra lateral à esquerda (`bg-border-strong`) **mais** texto bold — não depende só da cor.
- `aria-current="true"` no item ativo (já existe).

### 3. Ficheiros não alterados
- `report-shell-v2.tsx`, `report-hero-v2.tsx`, `report-utility-bar.tsx` — intactos.
- `premium-cta-context.tsx`, `payments/products.ts`, `analysis-period-selector.tsx` — intactos.
- `report-overview-block.tsx`, `report-diagnostic-block.tsx` — IDs já no sítio.
- `internal_lab` variant continua no ramo `!isCommercial` sem efeitos do compact.

## Mobile
- `ReportBlockTopTabs` (rail bottom + drawer) **não** recebe estado compact — o padrão mobile mantém-se exatamente como está. Sem sticky desktop forçado em mobile, sem overflow horizontal novo.

## Riscos & salvaguardas
- O recompute do scroll-spy é o mesmo handler do hook existente, já testado.
- O click em item bloqueado deixa de abrir o modal — flow de monetização continua coberto pelos chips do EXPLORAR e pelo CTA principal (sem regressão de conversão visível: o teaser premium destino já contém os seus próprios CTAs).
- `useSidebarCompact` adiciona um listener `scroll` debounced via rAF; impacto negligenciável.
- Sem alterações em `PUBLIC_PRODUCTS`, EuPago, entitlements, lógica de período, concorrentes, geração de relatório, métricas ou schema.

## Validação
1. Desktop: ao fazer scroll para além de ~220 px, sidebar fica compacta (avatar pequeno, espaçamento apertado, CTA "Desbloquear · 9€"); ao voltar ao topo, expande.
2. Scroll-spy: ao percorrer "Visão geral" → "Engagement" → … → "Prioridades de acção", o item correspondente fica ativo na sidebar (incluindo bloqueados nos teasers).
3. Click em item bloqueado faz scroll suave para o teaser, **não** abre modal.
4. Chips de período bloqueados, "Adicionar concorrente" bloqueado e CTA principal continuam a abrir o modal premium existente.
5. Paid: scroll compact mostra `✓ Relatório completo`, sem CTA, controlos EXPLORAR funcionais.
6. Mobile (375): drawer e bottom rail iguais ao estado atual; sem overflow horizontal.
7. Foco por teclado: Tab atravessa todos os itens; `aria-current` correto.
