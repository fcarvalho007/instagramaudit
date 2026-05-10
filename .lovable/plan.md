# Revisão · Melhorias para `/admin`

Auditei `/admin/visao-geral`, `/admin/sistema`, `/admin/clientes` em desktop (1366) e mobile (375), mais o código da sidebar, do `AdminPageHeader` e do gate. O esqueleto é sólido (sidebar light + Iconosquare-aligned, tokens consistentes), mas há fricções claras de chrome, hierarquia e mobile.

## Problemas identificados

### 1. Topbar inexistente — `ExecutionModeBadge` órfã
A pílula "Cache-only · sem custos" está absoluta no canto superior direito, **sem container**, **sem fundo**, **sem alinhamento** ao header da página. Em mobile sobrepõe-se ao espaço do hamburger. O hamburger por sua vez vive isolado no canto oposto, também flutuante.

### 2. `AdminPageHeader` mistura responsabilidades
- Repete em todas as páginas o eyebrow "INSTABENCH · ADMIN" (redundante — já estamos no admin).
- A barra de acções (`Atualizar`, `Forçar sync`, `Exportar`) compete com o H1 em vez de viver numa topbar global.
- Zero breadcrumbs em sub-páginas (`/admin/sistema/cockpit-legado` aparece sem trilho).

### 3. Sidebar densidade e identidade
- 12 itens + 5 grupos + footer (Demo + Logout) **não cabem em 768px** sem scroll interno → utilizador não vê "Sistema" nem o toggle Demo sem scrollar.
- Brand é só um ícone genérico `BarChart2` (lucide). Devia ser o mark InstaBench.
- Toggle "REAL" em caps sem contexto → label confusa; faltam tooltips em itens de nav quando potencialmente colapsada.

### 4. Sem affordance para command palette
`AdminCommandPalette` existe mas não há botão visível nem hint `⌘K` na topbar — invisível para utilizadores que não conhecem o atalho.

### 5. Mobile — header rasgado
Em 375px o `Cache-only` badge fica solto no topo, o eyebrow ocupa linha própria, o H1 cai numa terceira linha e as acções ainda abaixo. **4 linhas só de header** antes de chegar ao conteúdo.

### 6. Funil em "Visão geral"
- Bar do "Unlock iniciado" desenha 100% mesmo quando o valor absoluto é 1 → induz erro visual face a "Unlock concluído" (0).
- Delta `−1` a vermelho sem legenda do que está a ser comparado.

## Plano de melhorias (3 fases, ordenadas por impacto)

### Fase 1 — Topbar global + header limpo (alto impacto, baixo risco)

Criar `AdminTopbar` em `src/components/admin/v2/admin-topbar.tsx`:

```text
┌─────────────────────────────────────────────────────────────┐
│ ☰  Visão geral                  [⌘K Procurar] [● Cache-only]│
│    Receita · 30 dias                                        │
└─────────────────────────────────────────────────────────────┘
```

- Sticky `top-0`, `h-14`, fundo `surface` com border-bottom token.
- Mobile: hamburger à esquerda dentro da topbar (deixa de ser flutuante).
- Slot central: título compacto + subtítulo (puxado de cada rota via context ou prop).
- Slot direito: trigger `⌘K` (abre command palette) + `ExecutionModeBadge` ancorado.
- `AdminPageHeader` passa a renderizar **apenas** o H1 editorial + acções primárias (Atualizar, Exportar). Eyebrow "INSTABENCH · ADMIN" removido.

### Fase 2 — Sidebar densidade + identidade (médio impacto)

- Substituir `BarChart2` pelo logo InstaBench real (já existe como SVG no marketing header).
- Reduzir `py` dos itens de `py-2` → `py-[7px]`, `gap` `2.5` → `2`, `text-[13px]` → mantém. Ganha-se ~80px verticais.
- Mover footer (Demo switch + Logout) para um menu de avatar/ações na **topbar**, libertando o fundo da sidebar.
- Tornar grupos colapsáveis (`<details>` nativo) com persistência em `localStorage` (`admin.sidebar.<group>=open`).
- Adicionar tooltips nos itens (`@/components/ui/tooltip`) para preparar futura variante mini-icon.

### Fase 3 — Polish funcional (baixo risco, maior clareza)

- **Funil**: largura da bar proporcional ao valor absoluto do passo anterior (não `max-100%`); zero passos sem bar; legenda da delta ("vs período anterior").
- **Breadcrumbs** em sub-rotas (`Sistema / Cockpit legado`).
- **Demo switch**: trocar label "REAL" pelo par `Real ◯ ⬤ Demo` com ícone, dentro do menu da topbar.
- **Command palette hint**: tecla `⌘K` visível e atalho `Ctrl+K` cross-platform.

## Fora de âmbito

- Não tocar em `Header`/`Footer` públicos.
- Não tocar em rotas `/admin/report-preview/*` (mockups visuais).
- Sem mudanças de schema, sem novos endpoints, sem novos secrets.
- Sem refactor das queries do dashboard — só apresentação.

## Ficheiros previstos

```text
NOVO   src/components/admin/v2/admin-topbar.tsx
NOVO   src/components/admin/v2/admin-breadcrumbs.tsx
EDIT   src/routes/admin.tsx                       (introduz topbar, ajusta padding)
EDIT   src/components/admin/v2/admin-page-header.tsx  (sem eyebrow, mais leve)
EDIT   src/components/admin/v2/admin-sidebar.tsx  (logo, densidade, sem footer)
EDIT   src/styles/admin-tokens.css                (var --admin-topbar-height)
```

## Validação

- Browser desktop 1366×768: nada rola na sidebar até "Sistema"; topbar sticky.
- Browser mobile 375×812: header com 1 linha (título + hamburger), badge ancorado.
- `/admin/visao-geral`, `/admin/sistema`, `/admin/clientes` continuam a renderizar (smoke-test via screenshot).
- `tsc --noEmit` verde.

## ☐ Checklist

- ☐ **Fase 1** — Topbar global + header limpo
- ☐ **Fase 2** — Sidebar densidade + brand + grupos colapsáveis
- ☐ **Fase 3** — Funil, breadcrumbs, demo label, ⌘K hint
- ☐ Verificação visual em desktop + mobile
- ☐ tsc verde

> Sugestão: aprovar **Fase 1 isolada primeiro** (resolve o problema mais visível — chrome confuso) e avaliar antes de avançar para Fase 2/3.