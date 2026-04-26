
# Redesign do `/admin` — Sistema de design + tab Visão Geral

Este é o **prompt 1 de 6**. Implementa apenas a infraestrutura partilhada e a tab Visão Geral. As outras 5 tabs ficam como stubs "em desenvolvimento". O cockpit legado actual fica acessível como sub-rota em `/admin/sistema/cockpit-legado`.

## Decisões já confirmadas

- **Gráficos**: Recharts (já instalado). Não introduzimos Chart.js.
- **Cockpit actual**: preservado em `/admin/sistema/cockpit-legado`, com link discreto na tab Sistema.
- **Tipografia**: Inter (400/500) + JetBrains Mono para eyebrows. Sem Fraunces no admin novo.

## O que vai ser entregue

### 1. Sistema de design admin

**Ficheiro novo**: `src/styles/admin-tokens.css` — paleta semântica completa do prompt (revenue/leads/expense/signal/danger/info/revenue-alt/neutral em escalas 50-900). Importado a seguir aos tokens existentes em `src/styles.css`.

**Princípios visuais** aplicados em todos os componentes:
- Pesos de fonte: apenas 400 e 500
- Bordas: `0.5px solid rgb(var(--admin-neutral-100))`
- Radii: `8px` (cartões pequenos / badges) e `12px` (cartões grandes)
- Sem sombras nem gradientes (excepto cartão herói "Receita total" e linha sob header)
- Sentence case sempre. Eyebrows uppercase + tracking 0.1em + 11px mono.

### 2. Componentes reutilizáveis

Pasta nova `src/components/admin/v2/` (separada do cockpit legado para não criar conflitos):

- `admin-page-header.tsx` — eyebrow `INSTABENCH · ADMIN` + h1 28px + subtítulo + slot de acções + linha-gradient sutil em baixo.
- `admin-section-header.tsx` — barra vertical 3×16px colorida (prop `accent`) + h2 13px uppercase + subtítulo opcional após "·".
- `admin-tabs-nav.tsx` — navegação horizontal das 6 tabs como `<Link>` TanStack com `activeProps`. Sublinhado 2px na cor temática da tab activa, `margin-bottom: -0.5px` para encavalar a baseline. Cores: visão-geral=leads, receita=revenue, clientes=leads, relatórios=signal, perfis=expense, sistema=neutral.
- `kpi-card.tsx` — 3 variantes via prop `variant`: `default`, `highlighted` (gradiente esmeralda + borda verde 400), `accent-left` (border-left 3px com prop `accent`). Eyebrow + valor 26px + delta opcional (▲/▼) + subtexto.
- `progress-bar.tsx` — 8px altura, fundo cor a 12% + preenchimento sólido. Suporte a `showCap` (linha vertical vermelha em 100%) e variante segmentada (array `segments` para a barra Apify+OpenAI).
- `badge.tsx` (nome final `admin-badge.tsx` para não colidir com shadcn) — variantes revenue/leads/expense/signal/danger/info/neutral, padding 3px 8px, radius 8px (pill), texto sempre em tom 800/900 da família.

### 3. Routing das 6 tabs

Refactorizar `src/routes/admin.tsx` em layout + sub-rotas (file-based TanStack):

```text
src/routes/
  admin.tsx                                  → layout (auth gate + header + AdminTabsNav + <Outlet/>)
  admin.index.tsx                            → redirect para /admin/visao-geral
  admin.visao-geral.tsx                      → tab Visão Geral (conteúdo completo)
  admin.receita.tsx                          → stub
  admin.clientes.tsx                         → stub
  admin.relatorios.tsx                       → stub
  admin.perfis.tsx                           → stub
  admin.sistema.tsx                          → stub + link "abrir cockpit legado"
  admin.sistema.cockpit-legado.tsx           → renderiza o `<CockpitShell/>` actual sem alterações
```

A lógica de auth (Google + allowlist via `/api/admin/whoami`) é movida do `admin.tsx` actual para o novo layout `admin.tsx`. O `<CockpitShell/>` legado continua a funcionar idêntico — só muda o ponto de entrada.

### 4. Tab Visão Geral — 5 secções

Cada secção precedida pelo `<AdminSectionHeader/>` com cor temática. Espaçamento vertical 28px entre secções.

**Secção 1 — Funil de conversão** (barra leads/roxo)
- SVG inline 600×200 com 3 polígonos trapezoidais (`#EEEDFE` → `#CECBF6` → `#534AB7`).
- Texto sobreposto absoluto em cada camada com flex space-between (visitantes/análises, leads/conversão, clientes/conversão).
- Grelha 3-col abaixo (Conversão total, Receita por lead, Valor médio cliente) com 1px gap entre células e overflow hidden para efeito separador.

**Secção 2 — Receita** (barra revenue/verde)
- Linha 1: 3 `<KPICard/>` lado-a-lado — MRR (accent-left verde 500), Avulso 30 dias (accent-left verde-alt 400), Receita total (highlighted/gradiente esmeralda).
- Cartão "Evolução diária": `<BarChart>` Recharts com `<Bar stackId="r" fill="#1D9E75">` (subscrições) + `<Bar stackId="r" fill="#97C459">` (avulso), 26 dias mock, eixo Y €, tooltips em PT, legenda inline customizada à direita do header.

**Secção 3 — Despesa** (barra expense/âmbar)
- Cartão único com 2 zonas separadas por linha 0.5px:
  - Zona superior: 3 colunas com bordas verticais — Apify ($18.42/$29 com `<ProgressBar showCap variant="expense"/>`), OpenAI ($9.87/$25 com `<ProgressBar variant="info"/>`), Despesa total ($28.29 com `<ProgressBar segments={[{value:65,color:'expense'},{value:35,color:'info'}]}/>`).
  - Zona inferior: `<BarChart>` Recharts com stack Apify+OpenAI + `<ReferenceLine y={29/30} strokeDasharray="5 4" stroke="#A32D2D" label={{value:'limite diário · $0.97', position:'right', fill:'#A32D2D', fontSize:10}}/>`.

**Secção 4 — Clientes kanban** (barra leads/roxo)
- Grelha 4-col com 10px gap. Cada coluna é um cartão branco com `border-top: 2px solid <cor>` e radius só nos cantos inferiores. Header com título + subtítulo + `<AdminBadge/>` com contador. 3 cartões mock por coluna em fundo `--admin-neutral-50` com nome + plano/preço.

**Secção 5 — Sinais de intenção** (barra signal/coral)
- Grelha 2-col com 14px gap.
- Cartão esquerdo: 4 linhas mock de pesquisas repetidas (perfil + lead + contador "7×" coral 500 + tempo).
- Cartão direito: 4 linhas mock de últimos relatórios com `<AdminBadge variant="revenue|expense"/>` para estado.

### 5. Mock data

`src/lib/admin/mock-data.ts` — todos os números do prompt como constantes nomeadas (`MOCK_FUNNEL`, `MOCK_REVENUE_KPIS`, `MOCK_DAILY_REVENUE`, `MOCK_EXPENSE`, `MOCK_DAILY_COSTS`, `MOCK_KANBAN`, `MOCK_INTENT_SIGNALS`). Comentário no topo a sinalizar que é mock e que será substituído por queries Supabase em prompt posterior.

## Detalhes técnicos

- **Auth**: a lógica de `useEffect`/`onAuthStateChange`/`whoami` actual é encapsulada num componente `AdminAuthShell` que envolve o `<Outlet/>` no novo `admin.tsx` layout.
- **Recharts ResponsiveContainer**: wrapper com `position: relative` + altura explícita 180px conforme prompt. `<Tooltip/>` customizado em PT.
- **Acessibilidade**: cada gráfico envolvido em `<div role="img" aria-label="...">` com texto fallback `<span className="sr-only">` resumindo os números.
- **Light mode only**: o admin novo força light mode via `<div className="bg-white text-[rgb(var(--admin-neutral-900))]">` no layout — não toca em `dark:` variants. Fica preparado para dark mode futuro mas não implementado.
- **Sem responsivo mobile**: grelhas usam `repeat(auto-fit, minmax(...))` quando faz sentido para não partir em ecrãs ~1024px, mas não há versão mobile.
- **TanStack file-based**: `admin.index.tsx` usa `loader: () => { throw redirect({ to: '/admin/visao-geral' }) }` para redirect server-side.
- **Locked files**: `LOCKED_FILES.md` será verificado antes — nenhum dos componentes do report (`report-*.tsx`) é tocado. O `cockpit-shell.tsx` e panels do cockpit actual ficam **intactos**, apenas mudam de ponto de montagem.

## Ficheiros tocados (resumo)

**Novos**:
- `src/styles/admin-tokens.css`
- `src/components/admin/v2/admin-page-header.tsx`
- `src/components/admin/v2/admin-section-header.tsx`
- `src/components/admin/v2/admin-tabs-nav.tsx`
- `src/components/admin/v2/admin-auth-shell.tsx`
- `src/components/admin/v2/kpi-card.tsx`
- `src/components/admin/v2/progress-bar.tsx`
- `src/components/admin/v2/admin-badge.tsx`
- `src/components/admin/v2/visao-geral/funnel-section.tsx`
- `src/components/admin/v2/visao-geral/revenue-section.tsx`
- `src/components/admin/v2/visao-geral/expense-section.tsx`
- `src/components/admin/v2/visao-geral/kanban-section.tsx`
- `src/components/admin/v2/visao-geral/intent-section.tsx`
- `src/components/admin/v2/stub-tab.tsx`
- `src/lib/admin/mock-data.ts`
- `src/routes/admin.index.tsx`
- `src/routes/admin.visao-geral.tsx`
- `src/routes/admin.receita.tsx`
- `src/routes/admin.clientes.tsx`
- `src/routes/admin.relatorios.tsx`
- `src/routes/admin.perfis.tsx`
- `src/routes/admin.sistema.tsx`
- `src/routes/admin.sistema.cockpit-legado.tsx`

**Editados**:
- `src/styles.css` — `@import "./styles/admin-tokens.css";`
- `src/routes/admin.tsx` — passa a ser layout (gate de auth + header global + tabs nav + `<Outlet/>`); o conteúdo actual (`<CockpitShell/>`) deixa de ser renderizado aqui.

## Validação

- `bunx tsc --noEmit`
- `bun run build`
- Visualmente: percorrer `/admin` → redireciona para `/admin/visao-geral` → ver as 5 secções renderizadas com cores correctas. Clicar em cada uma das outras 5 tabs vê stub. `/admin/sistema/cockpit-legado` mostra o cockpit actual intacto.

## Não faz parte deste prompt

- Conteúdo das tabs Receita, Clientes, Relatórios, Perfis, Sistema (apenas stubs).
- Ligação a dados reais Supabase (vem em iteração posterior).
- Dark mode.
- Responsivo mobile.
- Qualquer alteração ao `/report/example`, `/analyze/$username`, ou aos componentes do report.
- Chamadas Apify.
