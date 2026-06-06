# Auditoria — Sidebar do report + top bar de acções

> Apenas plano. Nada será editado até aprovação.

## 1. Ficheiros inspeccionados

Sidebar e navegação
- `src/components/report-redesign/v2/report-block-nav.tsx` — `ReportBlockSidebar` (desktop) + `ReportBlockTopTabs` (mobile bottom tabs + drawer Sheet).
- `src/components/report-redesign/v2/block-config.ts` — fonte central de `COMMERCIAL_SECTIONS` (7 secções com `tier: "free" | "pro"`).
- `src/components/report-redesign/v2/use-active-block.ts` — scroll-spy `useActiveBlock(ids)` + `scrollToBlock(id)`.

Top bar e acções
- `src/components/report-redesign/v2/report-shell-v2.tsx` — composição: hero + period selector no mesmo cartão flex (lines 213–228); sidebar 2-col abaixo (lines 244–252).
- `src/components/report-redesign/v2/report-hero-v2.tsx` — identidade compacta (avatar, handle, tier, followers/posts) + ações inline (Add competitor → `scrollToBlock("benchmark")`, PDF, Share).
- `src/components/report-redesign/v2/analysis-period-selector.tsx` — chip activo (sample free) + 4 janelas premium locked (`30/60/90/365`) com popover que chama `handlePremiumAccessClick("analysis_period_selector", …)`.
- `src/components/report-redesign/v2/report-utility-bar.tsx` — sticky utility bar duplicada (após scroll do hero) com Add competitor + PDF + Share.

Estado & gating
- `src/components/report-redesign/v2/premium-cta-context.tsx` — `PremiumCtaProvider` + `usePremiumCta()` (snapshotId, handle, variant, `premiumUnlocked`, `handlePremiumAccessClick(source, meta?)`, `trackPremiumWindowInterest(days)`).
- `src/routes/analyze.$username.tsx` e `src/routes/admin_.report-preview.$username.tsx` (callers do shell) — passam `unlocked` (lead capturado) e `premiumUnlocked` (Pro pago).

## 2. Estrutura actual da sidebar

- Variant `internal_lab`: lista flat dos 6 blocos (Q01–Q06). Mantém-se.
- Variants comerciais (`public_mvp`, `pro_preview`):
  - `buildCommercialSidebarItems(premiumUnlocked)` baseado em `COMMERCIAL_SECTIONS`.
  - Render via `SidebarList`:
    - `ProgressSummary` (barra 7 segmentos).
    - Secção `available_now` com items "incluido" (01–02 quando free; 01–07 quando premium).
    - Cartão `PremiumBlockCard` (premium não-unlocked) ou `ContinueReadingCard` (estado pré-lead). CTA "Desbloquear" → abre dialog premium via `handlePremiumAccessClick("sidebar")`.
- Mobile: `ReportBlockTopTabs` fixo no fundo com 3 tabs visíveis + botão Menu que abre o `Sheet` com a mesma lista.

Desktop: sidebar `hidden lg:block`, `w-64 xl:w-72`, `sticky top-24`, scroll interno se ultrapassa `100vh-7rem`.

## 3. Estrutura actual da top bar de acções

Dois layers a coexistir:

- Hero card (sempre visível): `ReportHeroV2` à esquerda (identidade + Add competitor + PDF + Share) e `AnalysisPeriodSelector` à direita (1 chip active + 4 windows premium locked) — tudo num único `flex` border-radius 2xl.
- `ReportUtilityBar` (sticky `top-16/20`, aparece após scroll): duplica Add competitor + PDF + Share.

"Add competitor" hoje **não está gated por entitlement**: é apenas um `scrollToBlock("benchmark")`. Em `pro_preview` o bloco `benchmark` nem sequer aparece (commercial structure não inclui blocos 03–06 lab). O botão é, na prática, um shortcut visual sem lógica de adição real.

## 4. Sinais para detectar free vs paid

- `premiumUnlocked: boolean` — prop autoritativa (vem da route, baseada em entitlements/credits). Fluxo: route → `ReportShellV2` → `ReportBlockSidebar`/`ReportBlockTopTabs` + `PremiumCtaProvider`.
- `unlocked: boolean` — lead capturado (continuação grátis), independente de Pro.
- `variant: ReportVariant` — `"public_mvp" | "pro_preview" | "internal_lab"`. Pro real e lab não devem mostrar o cartão de purchase.
- `useReportVariant()` + `usePremiumCta().premiumUnlocked` dentro da sidebar evitam prop drilling extra se quisermos.

Para a nova sidebar usaremos **`premiumUnlocked` (do `PremiumCtaProvider` ou da prop) + `variant !== "internal_lab"`** como contrato único de "free vs pro".

## 5. Comportamento responsive actual

- Desktop ≥ `lg`: sidebar lateral `w-64`/`w-72`, sticky top-24, scroll interno.
- Tablet/`md`: sidebar oculta; aparecem as bottom tabs.
- Mobile: bottom tabs fixas com 3 secções visíveis ao redor da activa + botão Menu (Sheet bottom sheet).

Period selector e Add competitor estão **só na top bar** — em scroll, o `ReportUtilityBar` mostra Add competitor + PDF + Share, mas **não** os period chips. Period chips desaparecem do viewport assim que o utilizador faz scroll.

## 6. Nova sidebar proposta — uma componente, dois estados

Continuamos com `ReportBlockSidebar` + `ReportBlockTopTabs` como única superfície, e adicionamos uma nova secção. Estrutura:

```
LEITURA GRATUITA
  01 Visão geral       — Grátis
  02 Engagement        — Grátis

RELATÓRIO COMPLETO
  03 Frequência editorial — Premium
  04 Mix de formatos      — Premium
  05 Publicações-chave    — Premium
  06 Contexto estratégico — Premium
  07 Prioridades de acção — Premium

EXPLORAR
  Período de análise
    [chips de janelas]   ← funcional em Pro, locked em Free
  Concorrentes
    [add competitor]     ← funcional em Pro, locked em Free
    [contagem 0/3]       ← Pro apenas

[Cartão de estado no fundo]
  Free → "Desbloquear relatório completo · 9€"
         + lista de benefícios (5 secções, períodos, concorrentes)
  Pro  → "Relatório completo · 7 secções desbloqueadas"
```

Items em "RELATÓRIO COMPLETO" continuam a navegar via `scrollToBlock(id)` quando `premiumUnlocked`; em free, clicar dispara `handlePremiumAccessClick("sidebar_section", { section: id })` (já existe pattern equivalente — só estendemos o `source` enum).

### 6.1 Estado FREE

- Secções 01–02 navegáveis (verde "Grátis" pequena).
- Secções 03–07 visíveis com chip "Premium", click abre dialog premium.
- **EXPLORAR**:
  - Período: chip da janela actual marcado como activo (mesmo string que hoje, `t("selector.active_sample", { count })`); restantes janelas (30/60/90/365) como chips locked. Click → mesmo handler `handlePremiumAccessClick("sidebar_period", { selected_window })`.
  - Concorrentes: botão "Adicionar concorrente" com cadeado. Click → `handlePremiumAccessClick("sidebar_add_competitor")`.
- Cartão final:
  - Título: "Desbloquear relatório completo".
  - Bullets: "5 secções premium", "Filtros de período", "Comparar concorrentes".
  - CTA principal: "Desbloquear · 9€" (preço lido de `PUBLIC_PRODUCTS.report_full_9.priceLabel`, igual ao sticky bar).
  - Versão compacta (sidebar estreita / mobile sheet): apenas botão "Desbloquear · 9€".

### 6.2 Estado PRO (`premiumUnlocked === true`)

- Todas as 7 secções activas e navegáveis (mesma lista, sem cadeado).
- **EXPLORAR**:
  - Período: chips funcionais. **Importante:** hoje o `AnalysisPeriodSelector` em Pro continua a abrir popover locked porque o componente trata sempre as janelas como premium. Para suportar Pro funcional precisamos de uma das duas vias:
    1. Habilitar selecção real de janela (requer wiring com snapshot/query state) — fora do âmbito desta UI-only mudança.
    2. **Manter chips como visual + futuro hook**: por agora, em Pro os chips ficam não-locked (sem cadeado), mas a selecção continua a ser informativa (mostra "amostra · N dias observados"). Marcamos com TODO técnico explícito para ligar à lógica real de re-query num passo seguinte.
  - Concorrentes: botão "Adicionar concorrente" funcional. Reusa fluxo já existente — se hoje **não existe** flow real, mostramos contagem `"0 de 3 concorrentes adicionados"` e o click faz `scrollToBlock("benchmark")` (continuidade), com TODO para ligar ao manager real.
- Cartão final substituído por estado de conclusão:
  - Título: "Relatório completo".
  - Subtítulo: "7 secções desbloqueadas".
  - Sem botão de compra. Apenas check icon discreto.

> **Nota explícita ao utilizador:** a UI será preparada para Pro funcional, mas a lógica real de re-query por janela e o manager de concorrentes ficam fora desta iteração (são alterações de dados/comportamento, não de UI). Marcamos com `data-todo="…"` ou comentário no código para o seguimento.

## 7. Comportamento sticky / compacto em scroll

- Sidebar desktop: continua `sticky top-24` com scroll interno. EXPLORAR aparece imediatamente abaixo de RELATÓRIO COMPLETO; o cartão de estado fica colado ao fundo do painel (via `mt-auto` num wrapper flex-col `min-h-full`).
- Em viewports baixos (`< 720px` altura), o scroll interno mantém EXPLORAR + cartão sempre alcançáveis.
- Mobile bottom tabs continuam a focar navegação rápida entre secções (sem EXPLORAR no rail — caberia no Sheet). EXPLORAR vai dentro do Sheet drawer (`Menu`), na mesma ordem.
- O `ReportUtilityBar` actual deixa de mostrar Add competitor (e em Free, também o utilitário deixa de o mostrar — passa a viver na sidebar). PDF + Share continuam na utility bar (só em scroll do hero). Period chips deixam de viver na top bar.

## 8. Comportamento mobile detalhado

- Bottom tabs: sem mudanças funcionais.
- Sheet drawer (botão Menu): herda a nova estrutura inteira (LEITURA GRATUITA / RELATÓRIO COMPLETO / EXPLORAR / cartão de estado). EXPLORAR aparece em forma compacta (chips em wrap), CTA de unlock em largura total.
- Em mobile, o sticky `StickyUnlockBar` já existente continua a tratar do CTA persistente em scroll quando o Sheet está fechado. Sem duplicação.

## 9. Top bar — alterações propostas

`ReportHeroV2`:
- **Remover** o botão "Adicionar concorrente" (vai para a sidebar EXPLORAR).
- **Manter** identidade (avatar, handle, tier, followers, posts).
- **Manter** PDF + Share (utilitários básicos).

`AnalysisPeriodSelector` no shell:
- **Remover** do cartão da hero (deixa de partilhar o flex com `ReportHeroV2`).
- O componente fica disponível para reutilização caso seja preciso noutro contexto, mas no shell deixa de ser renderizado.
- Em vez disso, dentro da sidebar EXPLORAR usamos uma variante compacta dos mesmos chips (extraindo a lógica de "chip activo + chips locked" para um sub-componente partilhado, ou reutilizando o existente em layout vertical).

`ReportUtilityBar`:
- **Remover** Add competitor.
- Manter PDF + Share.

Resultado: top bar passa a ser **identidade + 2 utilitários (PDF/Share)**. Controlos de leitura (período, concorrentes, unlock) migram para a sidebar onde permanecem visíveis durante o scroll.

## 10. Ficheiros a editar (na implementação)

- `src/components/report-redesign/v2/report-block-nav.tsx` — adicionar secção EXPLORAR + cartão de estado dual (free CTA / pro completed). Refactor pequeno para o `SidebarList` aceitar slots ou para introduzir um sub-componente `<ExploreSection>`.
- `src/components/report-redesign/v2/report-shell-v2.tsx` — remover `AnalysisPeriodSelector` do cartão da hero (continuar a passar `sampleSize`/`observedDays` para a sidebar via props novas).
- `src/components/report-redesign/v2/report-hero-v2.tsx` — remover botão "Adicionar concorrente".
- `src/components/report-redesign/v2/report-utility-bar.tsx` — remover botão "Adicionar concorrente".
- `src/components/report-redesign/v2/analysis-period-selector.tsx` — extrair (ou expor) um modo vertical/compacto para a sidebar (sem mudar comportamento de gating).
- `src/components/report-redesign/v2/premium-cta-context.tsx` — adicionar 2 novos `source` ao union `PremiumCtaSource` (`"sidebar_period"`, `"sidebar_add_competitor"`). Tracking.
- `public/locales/pt/report.json` — chaves novas: `nav.explore.title`, `nav.explore.period_label`, `nav.explore.competitors_label`, `nav.explore.add_competitor`, `nav.explore.competitors_count`, `nav.status.unlocked_title`, `nav.status.unlocked_subtitle`, `nav.unlock.cta_full`, `nav.unlock.cta_compact`, `nav.unlock.benefits.*`.

Não tocar:
- `block-config.ts` (`COMMERCIAL_SECTIONS` já é fonte única).
- Lab variant rendering (continua flat).
- `PUBLIC_PRODUCTS`, checkout, EuPago, entitlements, scoring, snapshot, scraping, schema, geração de report.
- Outros cards de report.

## 11. Riscos e salvaguardas

- **Risco:** sidebar fica densa em laptops pequenos. **Mitigação:** EXPLORAR colapsa para ícones+labels curtos em `lg` (sidebar 256px), expande em `xl+`. Cartão de estado pode reduzir para variante compacta apenas com o botão "Desbloquear · 9€".
- **Risco:** Pro real ainda não tem flow de selecção de janela ligado. **Mitigação:** chips Pro permanecem visualmente activáveis mas sem efeito real, com TODO documentado. Sem alterações em data fetching.
- **Risco:** remover Add competitor da top bar pode "esconder" o controlo para utilizadores actuais. **Mitigação:** sticky bottom bar / sidebar EXPLORAR ficam sempre visíveis (sticky em desktop, Sheet em mobile).
- **Risco:** lab preview parar de mostrar period selector. **Mitigação:** lab variant continua a NÃO ter EXPLORAR (mantém lista flat), e period selector pode continuar a aparecer no admin top bar se necessário — verificável durante a implementação. Decisão para já: lab mantém comportamento actual.
- **Risco:** duplicação de eyebrows / espaçamento desalinhado entre LEITURA GRATUITA / RELATÓRIO COMPLETO / EXPLORAR. **Mitigação:** introduzir um único `<SidebarGroup>` interno (sem ser shadcn) com header consistente (`text-eyebrow-sm text-content-tertiary`, gap 8/12px).
- **Risco:** tracking inflacionado por novos `source` de CTA. **Mitigação:** adicionamos exactamente 2 sources ao union já existente — sem mudar contrato downstream.

## 12. Validação (na fase de implementação)

1. `/analyze/frederico.m.carvalho` (free): sidebar mostra 7 secções com badges correctos, EXPLORAR com chips de período locked e Add competitor locked, cartão "Desbloquear · 9€".
2. `/admin/report-preview/frederico.m.carvalho?variant=pro_preview` (simula Pro): sidebar mostra 7 secções todas activas, EXPLORAR com chips funcionais visualmente (sem cadeado), cartão "Relatório completo · 7 secções desbloqueadas".
3. `/admin/report-preview/frederico.m.carvalho?variant=internal_lab`: sidebar mantém lista flat existente — sem regressão.
4. Top bar: sem chips de período, sem botão Add competitor. Mantém identidade + PDF + Share.
5. `ReportUtilityBar` em scroll: PDF + Share apenas.
6. Mobile: Sheet drawer mostra EXPLORAR + cartão de estado. Bottom tabs continuam funcionais.

---

## 13. Pedido de aprovação

Posso avançar para implementação com este plano? Em particular confirmar:

1. **Em Pro, os chips de período ficam visuais sem ligar ainda a re-query de snapshot** (UI-only nesta iteração). OK?
2. **Add competitor em Pro mantém apenas `scrollToBlock("benchmark")` por agora** (sem flow de adição real), com contagem `"0 de 3"` informativa. OK?
3. **`ReportUtilityBar` e `ReportHeroV2` perdem Add competitor; period selector sai da hero card.** OK?

Posso prosseguir?
