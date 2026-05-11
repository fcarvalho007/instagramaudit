# Atalhos de páginas no Command Palette do Admin

## Objetivo
Adicionar grupo "Páginas" ao `AdminCommandPalette`, mantendo a pesquisa de leads existente intacta.

## Alterações

**Ficheiro único:** `src/components/admin/v2/admin-command-palette.tsx`

1. Adicionar import de ícones lucide para cada atalho (LayoutDashboard, Receipt, Columns, TableIcon, Zap, FileText, AtSign, FlaskConical, MailCheck, Settings) — espelha o `admin-sidebar.tsx`.
2. Definir constante `PAGE_SHORTCUTS` (array tipado) com label, ícone, `to`, `search?` e `keywords` (para o filtro do `cmdk` apanhar variantes como "pipeline", "kanban", "tabela", "leads", "crm", etc.).
3. Renderizar `<CommandGroup heading="Páginas">` **antes** do grupo de leads, sempre visível (não depende de `isLoading`/`error` da query de leads).
4. Handler `handleNavigate` que fecha o dialog e chama `navigate({ to, search })`.
5. Rota "Perfis" → `/admin/perfis` (rota existe — confirmado no listing).
6. Não incluir `/admin/clientes` nem `/admin/beta-requests`.
7. Atualizar JSDoc do topo do ficheiro.

## Lista exacta de atalhos
| Label | to | search |
|---|---|---|
| Visão geral | `/admin/visao-geral` | — |
| Receita | `/admin/receita` | — |
| Contactos · Pipeline | `/admin/beta-leads` | `{ view: "pipeline" }` |
| Contactos · Tabela | `/admin/beta-leads` | `{ view: "tabela" }` |
| Automações | `/admin/automacoes` | — |
| Relatórios | `/admin/relatorios` | — |
| Perfis | `/admin/perfis` | — |
| Report Lab | `/admin/report-lab` | — |
| Templates Email + SMS | `/admin/email-lab` | — |
| Sistema | `/admin/sistema` | — |

## Validação
- `bunx tsc --noEmit`
- `bunx vitest run`
- Sem novos testes (UI navigation puro; existentes para palette inexistentes)

## Riscos
- `useNavigate` com `search` typed: alguns destinos não declaram schema de search params → cast suave `search: pageSearch as never` quando necessário.
