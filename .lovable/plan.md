## Contexto

A maior parte da estrutura já existe em `src/components/report-redesign/v2/report-block-nav.tsx` (estados free vs pago, secção EXPLORAR, CTA dinâmico via `PUBLIC_PRODUCTS.report_full_9.priceLabel`, integração com `usePremiumCta`). O top bar (`report-hero-v2.tsx`) e a `report-utility-bar.tsx` já não mostram período nem "Adicionar concorrente". As `COMMERCIAL_SECTIONS` já listam exatamente 7 secções (2 free + 5 pro) com os labels pedidos.

O que falta é alinhar com o mockup: copy/grupos, layout do bloco EXPLORAR, header do estado pago e copy do CTA. Sem tocar em preços, checkout, EuPago, entitlements, unlock, geração de relatório, métricas, schema ou variantes lab.

## Alterações

### 1. `src/components/report-redesign/v2/report-block-nav.tsx`

**Grupos (apenas para estado free)**
- Label do grupo 1: `nav.access.section_free` → "Leitura gratuita" (em vez de "Disponível agora").
- Label do grupo 2: `nav.access.section_premium` → "Relatório completo" (em vez de "Premium").
- Quando `premiumUnlocked=true`, a sidebar mostra um único grupo `nav.access.section_paid` → "Secções" (todas as 7 entradas, sem badges "Grátis"/"Premium" — apenas o item ativo destacado).

**Header do estado pago**
- Substituir o `UnlockedStatusCard` no fim por um pill inline imediatamente abaixo do handle no `ProfileHeader` quando `premiumUnlocked=true`:
  - `✓ Relatório completo · 7 secções` (`nav.status.header_paid`, usa contagem real `COMMERCIAL_SECTIONS.length`).
- A barra de progresso 2/7 (`ProgressSummary`) só é renderizada no estado free.

**ExploreSection — período**
- Reduzir os chips premium ao set do mockup: apenas `30d` e `90d` (remover `60` e `365`). Constante `PREMIUM_WINDOWS = [30, 90]`.
- Chip ativo passa a mostrar `{n} pub.` (ex.: `12 pub.`) com a chave `nav.explore.period_sample` para refletir a métrica real (`sampleSize`).
- Em estado free, ícone de lock pequeno alinhado à direita do label "Período" (como na imagem).
- Em estado pago, chips `30d` / `90d` ficam visualmente clicáveis (`cursor-pointer`, hover ativo) mas mantêm-se sem handler funcional — TODO documentado, sem alterar a lógica de período já existente.

**ExploreSection — concorrentes**
- Free: botão tracejado com lock à direita (já está), sem contagem.
- Pago: botão tracejado com `+` à direita; texto auxiliar imediatamente abaixo do botão (não acima) com `0 de 3 concorrentes adicionados` (`nav.explore.competitors_count`). Mantém o `scrollToBlock("benchmark")` como handler (UI-only).

**UnlockPromoCard**
- Substituir a lista de 3 bullets por um único parágrafo abaixo do botão:
  - `Desbloqueia as 5 secções premium, os filtros de tempo e a comparação com concorrentes.` (`nav.unlock.subcopy`, com `{{count}}` para os 5).
- Botão principal mantém `nav.unlock.cta_full` → "Desbloquear relatório completo".
- Quando o sidebar é "sticky" e o utilizador faz scroll para além do hero (detectar via `IntersectionObserver` num sentinela acima do CTA, ou através do estado já usado pelo `back-to-top-button`), trocar para a variante compacta `nav.unlock.cta_compact` → "Desbloquear · {{price}}". Toda a interpolação continua a usar `PUBLIC_PRODUCTS.report_full_9.priceLabel`.

**Handlers — sem mudanças funcionais**
- CTA principal continua a chamar `handlePremiumAccessClick("sidebar")`.
- Chips de período bloqueados continuam a chamar `handlePremiumAccessClick("sidebar_period", { selected_window })`.
- Botão concorrente em free continua a chamar `handlePremiumAccessClick("sidebar_add_competitor")`.

### 2. `src/i18n/locales/pt/report.json` + `src/i18n/locales/en/report.json`

Adicionar / renomear chaves dentro de `nav`:

- `access.section_free` = "Leitura gratuita" / "Free reading"
- `access.section_premium` = "Relatório completo" / "Full report"
- `access.section_paid` = "Secções" / "Sections"
- `status.header_paid` = "Relatório completo · {{count}} secções" / "Full report · {{count}} sections"
- `explore.period_sample` = "{{count}} pub." / "{{count}} posts"
- `unlock.subcopy` = "Desbloqueia as {{count}} secções premium, os filtros de tempo e a comparação com concorrentes." / equivalente em EN.

Manter `nav.access.available_now`, `nav.premium`, `nav.unlock.benefits.*` e `nav.status.unlocked_*` para não partir consumidores externos (passam a não ser referenciados pelo sidebar mas ficam disponíveis).

### 3. Ficheiros não alterados

- `block-config.ts` — `COMMERCIAL_SECTIONS` já está correto (2 free + 5 pro).
- `report-hero-v2.tsx`, `report-utility-bar.tsx` — já estão limpos de período/concorrente.
- `analysis-period-selector.tsx`, `premium-cta-context.tsx`, `payments/products.ts`, `report-shell-v2.tsx` — intactos.
- Variante `internal_lab` continua a usar o caminho `buildSidebarItems` + `ItemRow` flat, sem alterações.

## Estados resultantes

**Free / public**
- Header: avatar + handle + "Análise de perfil" + barra 2/7.
- Grupo "LEITURA GRATUITA": 01 Visão geral · grátis · 02 Engagement · grátis.
- Grupo "RELATÓRIO COMPLETO": 03–07 com lock pequeno, clique abre modal premium existente.
- EXPLORAR: chip ativo `12 pub.`, chips `30d` / `90d` com lock → modal; botão "Adicionar concorrente" tracejado com lock → modal.
- CTA "Desbloquear relatório completo" → compacto `Desbloquear · 9€` quando sticky; subcopy de uma linha.

**Paid / pro**
- Header: avatar + handle + pill `✓ Relatório completo · 7 secções`.
- Grupo único "SECÇÕES": 01–07 todos clicáveis, item ativo destacado.
- EXPLORAR: chip ativo `12 pub.`, chips `30d` / `90d` clicáveis (UI-only por agora); botão "+ Adicionar concorrente" com `0 de 3 concorrentes adicionados` por baixo.
- Sem CTA de compra.

## Riscos & salvaguardas

- Mobile drawer (`ReportBlockTopTabs`) reutiliza `SidebarList` → todas as alterações propagam automaticamente; testar em viewport 375.
- `internal_lab` usa um ramo separado (`isCommercial=false`) → não é afetado.
- Nenhuma chave i18n removida; só renomeada via override no componente. Apps embebidas que ainda usem `nav.access.available_now` continuam funcionais.
- Sem mudanças em `PUBLIC_PRODUCTS`, `usePremiumCta`, checkout EuPago, entitlements ou cálculos.

## Validação

1. `/admin/report-preview/frederico.m.carvalho` (free): barra 2/7, dois grupos, EXPLORAR com locks, CTA com subcopy nova, compact sticky no scroll.
2. `?variant=pro_preview`: header com pill verde, grupo único, sem CTA, chips funcionais (UI-only), contagem concorrentes.
3. `?variant=internal_lab`: sidebar lab inalterada.
4. Mobile (375): drawer abre, mesma estrutura, sem overflow.
5. Top bar não duplica período/concorrente (já confirmado).
