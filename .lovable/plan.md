# Phase 1 — Six-block premium report foundation

Read-only plan. Reorganiza visual e estruturalmente o relatório `/analyze/$username` em 6 blocos guiados por perguntas humanas, sem reconstruir nada e sem novas dependências. Reutiliza tudo o que já funciona em `src/components/report-redesign/*`, `src/components/report/*`, `src/components/report-enriched/*`, `src/components/report-market-signals/*`, `src/components/report-share/*` e `src/components/report-tier/*`.

## 1. Files inspected (read-only)

- `LOCKED_FILES.md` — lista de ficheiros foundation (todos os 7 ficheiros chave do `report-redesign` estão LOCKED, excepto `report-editorial-patterns.tsx`).
- `src/routes/analyze.$username.tsx` — composição actual: `ReportThemeWrapper > ReportShell`.
- `src/components/report-redesign/report-shell.tsx` — orquestrador actual (LOCKED).
- `src/components/report-redesign/report-tokens.ts` — tokens visuais (canvas, bandas, cards, tipografia).
- `src/components/report-redesign/report-hero.tsx` — hero premium (LOCKED).
- `src/components/report-redesign/report-kpi-grid.tsx` — 5 KPI cards (LOCKED).
- `src/components/report-redesign/report-framed-block.tsx` — wrapper card branco (LOCKED).
- `src/components/report-redesign/report-ai-reading.tsx` — leitura estratégica IA (LOCKED).
- `src/components/report-redesign/report-editorial-patterns.tsx` — padrões editoriais (NÃO locked, intocado).
- `src/components/report-redesign/report-methodology.tsx` — metodologia (LOCKED).
- `src/components/report-market-signals/report-market-signals.tsx` — secção Procura.
- `src/components/report/*` — temporal, benchmark, formats, competitors, top posts, heatmap, best days, hashtags-keywords.
- `src/components/report-tier/tier-comparison-block.tsx` + `report-share/report-final-block.tsx` — bloco final.

## 2. Strategy: shell wrapper, not shell rewrite

`report-shell.tsx` está LOCKED. **Não vamos editá-lo.** Em vez disso:

- Criar um NOVO orquestrador `ReportShellV2` que recebe os mesmos props (`result`, `snapshotId`, `actions`, `payload`, `analyzedAtIso`).
- Internamente compõe os mesmos componentes locked, mas agrupados em 6 blocos com âncoras (`#overview`, `#diagnostico`, `#performance`, `#conteudo`, `#procura`, `#benchmark`).
- Em paralelo, criar um `ReportSidebarNav` (desktop) e `ReportTopTabs` (mobile) que fazem scroll suave para as âncoras com `IntersectionObserver` para destacar o bloco activo.
- `analyze.$username.tsx` passa a renderizar `ReportShellV2` em vez de `ReportShell`. **`ReportShell` continua a existir** intocado (rollback trivial; e continua a poder ser usado por `report.example` se aplicável — neste caso `report-example` usa o `ReportPage` antigo e não é afectado).

Vantagens:
- Zero risco para `/report/example` e para o shell antigo.
- Rollback = 1 linha em `analyze.$username.tsx`.
- Não toca em locked files.

## 3. New component structure

```text
src/components/report-redesign/v2/
├── report-shell-v2.tsx              # orquestrador novo dos 6 blocos
├── report-sidebar-nav.tsx           # nav lateral desktop (sticky)
├── report-top-tabs.tsx              # nav segmentada mobile (sticky top)
├── use-active-block.ts              # hook IntersectionObserver
├── block-shell.tsx                  # wrapper de bloco: id + eyebrow nº + h2 pergunta + subtítulo
├── block-positioning.tsx            # banner curto "O que mostra o InstaBench"
├── block-overview.tsx               # bloco 01
├── block-diagnostico.tsx            # bloco 02
├── block-performance.tsx            # bloco 03
├── block-conteudo.tsx               # bloco 04
├── block-procura.tsx                # bloco 05 (com microcopy honesto sobre Trends)
└── block-benchmark.tsx              # bloco 06
```

Tudo reutiliza `REDESIGN_TOKENS` já existentes — sem novos tokens globais, sem cores hardcoded.

## 4. Section order and content per block

Posicionamento (entre Hero e bloco 01) — `block-positioning.tsx`:
> "O InstaBench mostra o que o perfil comunica publicamente, como compara com perfis semelhantes e que temas têm procura fora do Instagram."
Três chips: **Conteúdo público** · **Comparação com pares** · **Procura externa**.

**Hero** (mantém-se acima dos blocos, fora da numeração) → `<ReportHero>` locked + insight `hero` v2.

**01 · Overview — "Como está o perfil em geral?"**
- `<ReportKpiGrid>` (locked).
- Mini-card "Como ler este relatório" (3 bullets curtos, novo, dentro de `block-overview`).
- Insight `hero` (se já não usado acima — caso contrário, omitir aqui para evitar duplicação).

**02 · Diagnóstico — "O que explica estes resultados?"**
- `<ReportAiReading>` (locked) OU `<ReportPendingAiNotice>` quando `aiInsights` vazio.
- `<ReportEditorialPatterns>` (existente).

**03 · Performance — "Quando e como reage o público?"**
- `<ReportFramedBlock tone="canvas">` com `<ReportTemporalChart>` + insight `evolutionChart`.
- `<ReportFramedBlock tone="soft-blue">` com `<ReportPostingHeatmap>` + insight `heatmap` + `<ReportBestDays>` + insight `daysOfWeek`.

**04 · Conteúdo — "Que conteúdos têm melhor performance?"**
- `<ReportFramedBlock>` com `<ReportTopPosts>` + insight `topPosts` + `<ReportEnrichedTopLinks>`.
- `<ReportFramedBlock>` com `<ReportFormatBreakdown>` + insight `formats`.
- `<ReportFramedBlock>` com `<ReportHashtagsKeywords>` + insight `language` + `<ReportEnrichedMentions>`.

**05 · Procura fora do Instagram — "Há procura real por estes temas fora da plataforma?"**
- Parágrafo introdutório curto explicando porquê DataForSEO/Google aparece num relatório de Instagram.
- `<ReportMarketSignalsSection>` (existente).
- Insight `marketSignals` v2.
- Microcopy honesto fixo: *"Índice relativo do Google Trends, não volume absoluto de pesquisa."* (já está parcialmente em `market-signals-copy.ts` — confirmar e reforçar no wrapper, sem editar a secção locked).
- **Sem inventar** valores. Quando `status !== "ready"` a secção esconde-se silenciosamente — manter esse comportamento e mostrar empty-state editorial dentro do `block-procura`.

**06 · Benchmark competitivo — "Como se compara com perfis semelhantes?"**
- `<ReportFramedBlock tone="soft-blue">` com `<ReportBenchmarkGauge>` + insight `benchmark`.
- `<ReportFramedBlock>` com `<ReportCompetitors>`; quando `coverage.competitors === "empty"` → `<ReportEnrichedCompetitorsCta>`.

**Pós-blocos (fora da numeração, mantém-se):**
- `<ReportMethodology>` (locked).
- `<ReportTierTeaser>` + `<TierComparisonBlock>`.
- `<ReportFinalBlock>`.
- `BetaFeedbackBanner` (extrair para componente partilhado ou duplicar copy — preferir extrair para `src/components/report-beta/beta-feedback-banner.tsx` para reutilizar entre `ReportShell` e `ReportShellV2` sem editar `ReportShell`; nota: extrair daqui implicaria editar `report-shell.tsx` que é LOCKED → **não extrair, duplicar componente local em V2** com o mesmo `BETA_COPY.feedback`).

## 5. Lightweight wrappers (avoid duplicated headers)

Vários componentes já trazem o seu próprio `<ReportSection>` com eyebrow/título. Para evitar duplo cabeçalho dentro dos blocos:

- `block-shell.tsx` desenha **APENAS** o cabeçalho do BLOCO (eyebrow `01 / 06`, h2 com a pergunta, subtítulo curto). NÃO desenha cabeçalho por componente.
- Continuar a usar `<ReportFramedBlock>` (locked) à volta dos componentes que já têm `<ReportSection>` interno — é exactamente o padrão actual e funciona.
- Para componentes que NÃO têm `<ReportSection>` próprio (ex.: `ReportEnrichedTopLinks`, `ReportEnrichedMentions`), wrappar em `<ReportFramedBlock>` quando isolados ou empilhar dentro do mesmo frame que o componente principal (padrão já usado em `ReportShell`).

## 6. Files to be CHANGED in the implementation prompt

- **Created** (10 ficheiros novos, todos sob `src/components/report-redesign/v2/`):
  - `report-shell-v2.tsx`
  - `report-sidebar-nav.tsx`
  - `report-top-tabs.tsx`
  - `use-active-block.ts`
  - `block-shell.tsx`
  - `block-positioning.tsx`
  - `block-overview.tsx`, `block-diagnostico.tsx`, `block-performance.tsx`, `block-conteudo.tsx`, `block-procura.tsx`, `block-benchmark.tsx`
  - `beta-feedback-banner-v2.tsx` (cópia local, ver §4)
- **Edited** (1 ficheiro):
  - `src/routes/analyze.$username.tsx` — trocar `import { ReportShell }` por `ReportShellV2` em `AnalyzeReady`. Nada mais.

## 7. Files that MUST remain UNTOUCHED

- Todos em `LOCKED_FILES.md`, em particular:
  - `src/components/report-redesign/report-shell.tsx`
  - `src/components/report-redesign/report-hero.tsx`
  - `src/components/report-redesign/report-kpi-grid.tsx`
  - `src/components/report-redesign/report-framed-block.tsx`
  - `src/components/report-redesign/report-section-frame.tsx`
  - `src/components/report-redesign/report-ai-reading.tsx`
  - `src/components/report-redesign/report-methodology.tsx`
  - `src/styles/tokens.css`, `src/styles.css`
- `src/routes/report.example.tsx` e `src/components/report/report-page.tsx`.
- Todos `src/routes/admin.*` e `src/routes/api/**`.
- `src/lib/pdf/**`, `src/lib/dataforseo/**`, `src/lib/insights/**`, `src/lib/analysis/**`, `src/integrations/supabase/**`.
- Schema Supabase, `supabase/config.toml`.

## 8. Mobile and desktop acceptance criteria

Desktop (≥1024px):
- Layout 2-col: sidebar `w-56` sticky à esquerda (top offset = altura do nav global), main `flex-1 max-w-5xl`.
- Sidebar lista os 6 blocos com numeração `01–06`, label curto (Overview, Diagnóstico, Performance, Conteúdo, Procura, Benchmark) e bullet azul a marcar o bloco activo via `IntersectionObserver` (rootMargin `-30% 0px -60% 0px`).
- Click em item → `scrollIntoView({ behavior: "smooth", block: "start" })` para a âncora correspondente.
- Sem overflow horizontal a 1366px.

Mobile (<1024px):
- Sem sidebar. Em vez disso, `<ReportTopTabs>` sticky no topo abaixo do hero, com scroll horizontal interno (`overflow-x-auto snap-x`) e bullet activo.
- Hero, KPI grid e blocos mantêm-se em coluna única, padding `px-5`.
- Sem overflow horizontal a 375px (testar KPI grid 5 cards, market signals chart, top posts grid).

Comuns:
- Cada bloco abre com `<block-shell>`: eyebrow mono `0X · BLOCO`, h2 serif com a pergunta humana, subtítulo curto pt-PT.
- Skeleton claro (não dark) durante loading — `analyze.$username.tsx` já usa `<AnalysisSkeleton>`; manter, mas **confirmar tema light**. Se vier dark, ajustar dentro do skeleton (não locked).
- Quando um sub-componente não tiver dados, esconder-se gracilmente OU mostrar empty-state editorial curto pt-PT — nunca tokens técnicos visíveis.

## 9. Visual QA checklist

- [ ] `/analyze/frederico.m.carvalho` carrega e renderiza os 6 blocos pela ordem definida.
- [ ] Hero + posicionamento aparecem antes do bloco 01.
- [ ] Cada bloco mostra `0X · NOME` + pergunta humana + subtítulo.
- [ ] Sidebar desktop visível ≥1024px, sticky, marca bloco activo ao fazer scroll.
- [ ] Tabs mobile sticky <1024px, scroll horizontal, bullet activo correcto.
- [ ] Smooth scroll funcional ao clicar na nav.
- [ ] Sem duplo cabeçalho dentro de blocos (verificar Top Posts, Heatmap, Hashtags).
- [ ] Sem overflow horizontal a 375 / 768 / 1366.
- [ ] Sem dark loading. Sem "A analisar perfil" residual.
- [ ] Bloco 05 mostra microcopy *"Índice relativo do Google Trends, não volume absoluto de pesquisa."* visível.
- [ ] Bloco 06 sem competidores → mostra `<ReportEnrichedCompetitorsCta>` (existente).
- [ ] Sem tokens técnicos visíveis (`engagement_pct`, `payload`, `snapshot`, etc.) — `humanize()` já cobre o AI; revisitar empty-states novos.
- [ ] Copy 100% pt-PT, ortografia pós-90.
- [ ] `/report/example` continua exactamente igual.
- [ ] Sem novas chamadas a Apify/DataForSEO/OpenAI/PDFShift no Network tab.
- [ ] `bun run build` sem erros TypeScript.
- [ ] `bunx vitest run` sem regressões.

## 10. Risks and ambiguities

1. **Sidebar sticky vs hero altura**: o hero é alto. A sidebar deve começar APÓS o hero (não dentro dele) para não criar coluna vazia em cima. Solução: hero e posicionamento ficam full-width acima; layout 2-col arranca a partir do bloco 01.
2. **`BetaFeedbackBanner` duplicação**: extrair para componente partilhado obrigaria a editar `ReportShell` (LOCKED). Decisão: duplicar localmente em V2 (8 linhas de JSX) reutilizando `BETA_COPY.feedback`. Aceitável e reversível.
3. **`AnalysisSkeleton` tema**: confirmar que renderiza em fundo claro (relatório está em modo light via `ReportThemeWrapper`). Se aparecer dark, pequena correcção tópica num próximo prompt — fora do escopo desta Phase 1.
4. **Bloco 05 quando market signals está `disabled`/`blocked`**: actualmente a secção esconde-se silenciosamente. Em V2, manter o `<block-shell>` sempre visível com um empty-state editorial curto ("Sem sinais de procura disponíveis para este perfil neste momento.") — para a numeração 1–6 não desaparecer.
5. **Insights v2 podem repetir**: o shell actual usa `renderInsightOuter("hero")` logo após o hero, e os blocos já trazem outros insights. Em V2 colocar cada insight uma única vez no bloco mais natural (`hero`→01, `marketSignals`→05, etc.) para evitar duplicação editorial.
6. **Sem novas dependências de animação**: nada de Framer Motion / Magic UI agora. Layout fica preparado (estrutura de cards, tokens, IDs estáveis) para futura camada de micro-interacções num prompt seguinte.

## Implementation checkpoint (próximo prompt)

☐ Criar 13 novos ficheiros sob `src/components/report-redesign/v2/`
☐ Trocar import em `src/routes/analyze.$username.tsx` (`ReportShell` → `ReportShellV2`)
☐ QA visual nas 3 viewports (375 / 768 / 1366)
☐ Confirmar zero edits em locked files e em `/report/example`
☐ Confirmar zero chamadas a providers externos no Network tab
☐ `bun run build` e `bunx vitest run` sem erros
