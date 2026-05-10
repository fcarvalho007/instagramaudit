# Refinamento do Sidebar Admin (claro)

## Contexto
O sidebar `/admin` já foi implementado em superfície clara na iteração anterior (`src/components/admin/v2/admin-sidebar.tsx`, 5 grupos eyebrow, 240px fixo, drawer mobile). Esta iteração mantém a direção light-first (memória: "No dark navy backgrounds. No cyan neon. No glow shadows") e refina visual + interação para se aproximar do feel CRM pedido, sem violar tokens.

**Nota sobre "outline/glow cyan":** a memória proíbe cyan neon e glow. Vou interpretar como **outline azul calmo** (`#3772E5`, accent primary já existente) — barra esquerda 2px + halo subtil via `box-shadow` de baixa opacidade do mesmo azul. Sem cyan, sem neon.

## Ficheiros bloqueados
Verificado `LOCKED_FILES.md`: nenhum ficheiro a tocar está bloqueado. `tokens.css` está locked mas só vou adicionar tokens em `admin-tokens.css` (não locked).

## Estrutura final de navegação
Mantida a da iteração anterior (12 rotas, 5 grupos):

- **NEGÓCIO** — Visão geral, Receita, Clientes
- **PIPELINE** — Leads, Pedidos, Automações
- **PRODUTO** — Relatórios, Perfis, Conhecimento
- **LABORATÓRIO** — Report Lab, Email Lab
- **SISTEMA** — Sistema

(Comunicação fica fora até existir rota; pode entrar em PIPELINE depois.)

## Mudanças por batch

### Batch 1 — Tokens (`src/styles/admin-tokens.css`)
Adicionar/ajustar:
- `--admin-sidebar-item-bg-active`: passa a `--admin-info-50` mais leve (8% azul) em vez do fill atual
- `--admin-sidebar-item-active-outline`: novo, `#3772E5` para a barra esquerda 2px
- `--admin-sidebar-item-active-halo`: novo, `rgb(55 114 229 / 0.10)` para box-shadow lateral
- `--admin-sidebar-eyebrow-divider`: navy 6% para separador fino entre grupos
- Confirmar `--admin-sidebar-bg` = `#FFFFFF`, `--admin-sidebar-border` em navy low-alpha

### Batch 2 — Visual do item (`admin-sidebar.tsx`)
- Item active: `border-l-2` azul + bg `admin-info-50` + texto `admin-info-700` + box-shadow halo
- Item hover: bg `admin-surface-muted`, sem shift de layout (compensar o border-l com padding)
- Ícones: `--admin-content-tertiary` por defeito, `--admin-info-700` quando active
- Eyebrow groups: separador hairline 1px entre grupos (não no primeiro)
- Espaçamento vertical entre grupos: 16px → 20px
- `Link` com `activeOptions={{ exact: true }}` para `/admin` index e `exact: false` para grupos com sub-rotas (ex.: `/admin/sistema/cockpit-legado`)

### Batch 3 — Header/branding do sidebar
- Topo: BrandMark compacto (logo + "InstaBench / Admin" eyebrow)
- Border-bottom hairline em navy 8%
- Altura fixa 56px

### Batch 4 — Footer do sidebar
- Manter DemoModeSwitch + Logout (já lá estão)
- Reorganizar para: switch em linha própria, logout como botão `ghost` full-width
- Border-top hairline

### Batch 5 — Mobile drawer (refinar existente)
- Hamburger no topo (já existe)
- Drawer 280px com overlay `rgba(15,23,42,0.40)`
- Confirmar focus trap, ESC, body scroll lock, `aria-modal`
- Fechar ao navegar (via `onOpenChange` no Link click)
- Top bar mobile com BrandMark + hamburger à direita

### Batch 6 — Validação
- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual no preview:
  - `/admin/visao-geral`, `/admin/beta-leads`, `/admin/beta-leads?lead=<id>` (deep link), `/admin/automacoes`, `/admin/email-lab`, `/admin/sistema`, `/admin/sistema/cockpit-legado` (active correcto no pai)
  - Cmd+K (AdminCommandPalette) continua a funcionar
  - Mobile 375px: drawer abre/fecha, sem overflow horizontal
  - Sem hardcoded hex novos (greppar `#[0-9a-fA-F]{6}` em `admin-sidebar.tsx`)

## Fora de âmbito
- Conteúdo das páginas admin
- Adicionar/remover rotas
- Alterar `AdminAuthShell`, `AdminCommandPalette`, lógica de auth
- Backend, providers, schema, emails

## Riscos
- **Memória vs pedido**: o utilizador escreveu "cyan outline/glow" mas memória proíbe. Vou usar azul `#3772E5` calmo e halo de baixa opacidade — se preferires de facto cyan/glow neon, é preciso atualizar a memória primeiro.
- **Border-l shift**: compensar o `border-l-2` com `pl-[10px]` em vez de `pl-3` para não deslocar o ícone quando active.

## Entregáveis
- `src/styles/admin-tokens.css` (editado)
- `src/components/admin/v2/admin-sidebar.tsx` (editado)
- Resultados `tsc` + `vitest` + checklist manual