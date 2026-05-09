Objetivo: tornar todo o `/admin` confortável em mobile (≤414 px), sem alterar a versão desktop nem mexer em ficheiros de design tokens ou nos previews de relatório.

## 1. Shell global (`src/routes/admin.tsx`)

- Substituir o `padding: "1.75rem"` inline por padding responsivo: `px-4 py-4 md:px-7 md:py-7`.
- Top bar (badge execução + demo switch + terminar sessão): permitir wrap, alinhar à direita só em ≥sm; em mobile passa a `flex-wrap gap-2 justify-between`.
- Garantir que o `min-h-screen` não ganha scroll horizontal: aplicar `overflow-x-hidden` ao wrapper.

## 2. Navegação por separadores (`src/components/admin/v2/admin-tabs-nav.tsx`)

Hoje em mobile os 10 pills empilham em wrap caótico, sem labels de grupo (escondidos em `<sm`).

- Em mobile: transformar a nav numa faixa única com **scroll horizontal** (`overflow-x-auto`, `flex-nowrap`, `snap-x`) e esconder os separadores verticais e eyebrows de grupo.
- Em ≥sm: manter o layout actual com grupos + separadores.
- Adicionar `aria-current` via `activeProps` (já tem) e padding-bottom para a barra de scroll não cortar pills.

## 3. Mini-banner do modo demo

- Em mobile o texto ocupa muitas linhas; reduzir copy a uma linha e mover detalhes para um `<details>` colapsável (“Ver impacto”).

## 4. Sub-páginas (varrimento responsivo)

Para cada rota abaixo, garantir:
- KPI grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (em vez de fixos).
- Tabelas longas: envolver em `overflow-x-auto` com `min-w-[640px]` no `<table>` para preservar legibilidade; cabeçalho sticky onde já existir.
- Filtros/pílulas: `flex-wrap gap-2`, inputs com `w-full sm:w-auto`.
- Page headers (`AdminPageHeader`): título e CTA empilham em mobile, lado a lado em ≥sm.

Páginas a tratar:
- `/admin/visao-geral` — KPIs e secções.
- `/admin/receita` — KPIs + gráfico (forçar largura responsiva do container).
- `/admin/clientes`, `/admin/beta-leads`, `/admin/beta-requests`, `/admin/relatorios`, `/admin/perfis`, `/admin/conhecimento` — sobretudo tabelas e filtros.
- `/admin/sistema` — cards de diagnóstico em coluna única no mobile.

## 5. Componentes partilhados (`src/components/admin/v2/`)

Ajustes pontuais, só onde quebra em mobile:
- `admin-page-header.tsx`: stack vertical em mobile, horizontal em ≥sm.
- `kpi-card.tsx`: garantir `min-w-0` e truncamento de números longos.
- `filter-pills.tsx`: `flex-wrap` + scroll horizontal opcional.
- `report-drawer.tsx`: largura `w-full sm:max-w-[480px]` e padding interno reduzido em mobile.
- `module-visibility-matrix.tsx`: já tem `overflow-x-auto`, validar `min-w` da tabela.

## Fora do âmbito

- `admin/report-lab` (tool denso, otimização mobile separada se for pedida).
- Pré-visualizações `admin/report-preview.*` (já usam o mesmo shell do relatório público).
- `src/styles.css` e ficheiros de tokens (locked).

## Validação

- Browser tool em 375×812 e 414×896, percorrer cada sub-rota: confirmar zero scroll horizontal global, nav legível, tabelas com scroll só dentro do contentor, e KPIs sem corte.
- Revisão rápida em 1280×720 para garantir que desktop fica idêntico ao actual.