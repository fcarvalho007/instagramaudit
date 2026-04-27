# Refinamentos · Tab Visão Geral

Consolidação visual + estrutural antes de implementar as restantes 5 tabs do `/admin` v2.

## 1. Refactor estrutural (base para tudo o resto)

Substituir os ~2000 linhas de `style={{...}}` por classes Tailwind + componentes partilhados. Isto desbloqueia coerência visual sem repetir-me em cada tab futura.

**Novo: `src/components/admin/v2/admin-card.tsx`**
- Wrapper único para todos os cartões (KPI, gráficos, tabelas, kanban columns, funil)
- Variants: `default`, `accent-left` (barra colorida 3px à esquerda), `hero` (gradient subtil)
- Padding harmonizado: `p-6` (= 1.5rem) em todos os cartões
- Border: `border border-admin-border` (1px @ 8% opacidade, substitui os 0.5px que desaparecem em 1x DPR)
- Radius: `rounded-xl` (= 12px, token único)

**Novo: `src/components/admin/v2/admin-stat.tsx`**
- Bloco reutilizável valor + label + trend
- Tamanhos: `lg` (números hero, 36px), `md` (KPI standard, 28px), `sm` (inline, 18px)
- Família mono (JetBrains) sempre nos números, Inter nas labels
- Trend opcional com seta + cor semântica

**Refactor de `src/styles/admin-tokens.css`**
- Adicionar `--admin-border: rgb(15 23 42 / 0.08)` e `--admin-border-strong: rgb(15 23 42 / 0.12)`
- Expor todos os tokens como Tailwind utilities via `@theme` do Tailwind v4 (já está no projecto):
  - `bg-admin-bg-canvas`, `bg-admin-bg-surface`, `text-admin-text-primary`, `border-admin-border`, etc.
- Eyebrow class única: `.admin-eyebrow` → JetBrains Mono 11px, uppercase, letter-spacing 0.08em, color neutral-600

**Refactor dos 6 componentes existentes** (`KPICard`, `ProgressBar`, `AdminBadge`, `AdminPageHeader`, `AdminSectionHeader`, `AdminTabsNav`):
- Remover todos os `style={{}}`, usar Tailwind + tokens
- KPI card eyebrow passa a usar `.admin-eyebrow` (corrige inconsistência mono vs Inter)

## 2. Hierarquia de receita (MRR como herói)

Em `revenue-section.tsx`:
- **Card herói (gradient)** passa a ser **MRR €684** com sub-métrica "+38 subscritores activos"
- **Receita total €2.847** desce para `accent-left` (verde)
- **Avulso €1.914** mantém `accent-left` (verde mais claro)
- Adicionar 4º KPI: **ARPU €22.30** (receita total ÷ clientes activos), também `accent-left`
- Subtítulo da página passa de "Visão dos últimos 30 dias" para "Últimos 30 dias" e o título do gráfico fica "Receita diária · últimos 30 dias" (era "Mês corrente"). Janela temporal unificada.

## 3. Funil SVG robusto

Em `funnel-section.tsx`:
- Remover `preserveAspectRatio="none"` → usa o default `xMidYMid meet`
- Mover labels (visitantes / leads / clientes / taxas) para dentro do `<svg>` como `<text>` com coordenadas relativas ao viewBox
- ViewBox passa para `0 0 800 280` (proporção fixa que funciona em qualquer largura)
- Cada layer continua trapézio mas com `<text textAnchor="middle">` posicionado ao centro de cada banda
- Resultado: zero overflow, zero distorção, escala perfeita 320px → 1600px

## 4. Tabs mono (anti-semáforo)

Em `admin-tabs-nav.tsx`:
- Sublinhado da tab activa passa a ser sempre `bg-admin-text-primary` (neutral-900), 2px
- Remover prop `accentColor` por tab — a cor temática vive **dentro** da tab, na barra vertical 3px do `AdminSectionHeader`
- Tab hover: `text-admin-text-primary` + opacity transition
- Tab inactiva: `text-admin-text-secondary`

## 5. Mocks recalibrados

Em `src/lib/admin/mock-data.ts`:
- **Subscrições no gráfico**: passam para €22.30/dia constantes → 30 × 22.30 = €669 (próximo do MRR €684, diferença explicada por upgrades mid-period — credível)
- Ajustar MRR mock para €669 OU manter €684 e variar 1-2 dias (escolho: variar dias para storytelling realista)
- **Custos diários Apify+OpenAI**: regenerar para que ~24 dias estejam abaixo de $0.97 e 2-3 dias acima (picos por análises pesadas). Soma dos 30 dias = $28.29 exactamente (= o que o KPI mostra).
- **Custos avulso vs subscrições**: confirmar que Σ daily revenue = €2.847

## 6. Cockpit legado limpo

Em `src/routes/admin.sistema.cockpit-legado.tsx`:
- Adicionar prop opcional `hideHeader?: boolean` ao `CockpitShell` (ou wrappar num `<div>` com CSS que esconde o primeiro `<h2>` interno via `[&>header]:hidden`)
- Resultado: só o `AdminPageHeader` v2 "Cockpit legado · Operação técnica antiga" + tabs do cockpit por baixo

## 7. Pequenos ajustes que vêm de borla

- `AdminPageHeader`: subtítulo passa de neutral-600 para neutral-700 (mais legível)
- `AdminPageHeader`: aceita prop `actions` e a `AdminAuthShell` move o botão "Terminar sessão" para esse slot na Visão Geral
- Kanban: `<ul>/<li>` semânticos para acessibilidade

## Ficheiros afectados

**Novos (2):**
- `src/components/admin/v2/admin-card.tsx`
- `src/components/admin/v2/admin-stat.tsx`

**Editados (12):**
- `src/styles/admin-tokens.css` (tokens border + eyebrow + Tailwind theme)
- `src/components/admin/v2/admin-page-header.tsx`
- `src/components/admin/v2/admin-section-header.tsx`
- `src/components/admin/v2/admin-tabs-nav.tsx`
- `src/components/admin/v2/admin-badge.tsx`
- `src/components/admin/v2/kpi-card.tsx` (passa a wrapper sobre `AdminCard` + `AdminStat`)
- `src/components/admin/v2/progress-bar.tsx`
- `src/components/admin/v2/visao-geral/funnel-section.tsx`
- `src/components/admin/v2/visao-geral/revenue-section.tsx`
- `src/components/admin/v2/visao-geral/expense-section.tsx`
- `src/components/admin/v2/visao-geral/kanban-section.tsx`
- `src/components/admin/v2/visao-geral/intent-section.tsx`
- `src/lib/admin/mock-data.ts`
- `src/routes/admin.sistema.cockpit-legado.tsx`
- `src/components/admin/v2/admin-auth-shell.tsx` (mover sign-out para header actions)

**Não tocados:**
- Locked files (todos respeitados)
- `/report/example` (intacto)
- `routeTree.gen.ts` (auto-gerado)
- Stubs das outras 5 tabs (receita, clientes, relatórios, perfis, sistema) — refactor não as afecta porque ainda só têm `<StubTab/>`

## Checkpoint (☐ a verificar no fim)

- ☐ Zero `style={{...}}` nos componentes v2 (excepto width dinâmico do ProgressBar e height do BarChart)
- ☐ Bordas `1px` com opacidade 8-12%, visíveis em 1x DPR
- ☐ MRR é o card hero, "últimos 30 dias" coerente em toda a página
- ☐ Funil escala correctamente entre 320px e 1920px sem distorção nem overflow
- ☐ Sublinhado da tab activa é sempre neutral-900, sem cores temáticas no nav
- ☐ Σ MOCK_DAILY_COSTS = $28.29; ≥80% dos dias abaixo de $0.97
- ☐ Cockpit legado sem título duplicado
- ☐ `bunx tsc --noEmit` limpo
- ☐ `bun run build` limpo
- ☐ `/report/example` não foi tocado
- ☐ Nenhum Apify call