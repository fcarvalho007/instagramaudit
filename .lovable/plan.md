
# QA Visual — Area Autenticada (`/app/*`)

## PASS / FAIL

| #  | Critério | Estado | Notas |
|----|----------|--------|-------|
| 1  | Sidebar desktop — hierarquia e active state | PASS | Highlight correto via `startsWith`, brand + nav + user footer bem estruturados |
| 2  | Topbar mobile — hamburger + nav | PASS | `aria-label` presente, fecha ao navegar, logout visível |
| 3  | Report cards — alinhamento e badges | PASS | Badges com ícone + texto (não só cor), secondary badges (PDF, delivery) claros |
| 4  | Stats bar | PASS | Grid 2→4 cols responsivo |
| 5  | Empty state | PASS | Ícone + copy + CTA "Analisar perfil" |
| 6  | Loading state | PASS | Spinner centrado em todas as páginas |
| 7  | Error state | PASS | Bordas vermelhas, mensagem legível |
| 8  | Timeline (detail) — estrutura semântica | FAIL | Usa `<ol>` com `<li>`, mas os steps não têm `aria-current` nem `role="status"` |
| 9  | Hardcoded `bg-[#F0F4FA]` no layout | FAIL | `app-layout.tsx:13` — deve usar token `bg-surface-muted` ou equivalente |
| 10 | Hardcoded `bg-[#F0F4FA]` no loading shell | FAIL | `app.tsx:53` — mesmo problema |
| 11 | Copy — "ativares" (2.ª pessoa) | FAIL | `app.reports.tsx:316` — "para quando ativares" é 2.ª pessoa informal |
| 12 | Copy — "Podes" (2.ª pessoa) | FAIL | `app.reports.$id.tsx:353` — "Podes descarregar" |
| 13 | Copy — "Consulta" (imperativo tu) | FAIL | `app.reports.tsx:256`, `app.account.tsx:108`, `app.plan.tsx:104` — imperativo informal |
| 14 | Copy — "Analisa" (imperativo tu) | FAIL | `app.reports.tsx:293` |
| 15 | Copy — "descarrega" (imperativo tu) | FAIL | `app.reports.tsx:256` |
| 16 | Buttons sem `aria-label` | FAIL | Botões de save/cancel nome-edição (`app.account.tsx`), download PDF, "Regenerar PDF" — sem aria-label |
| 17 | Plan cards — 3-col em mobile | PASS | Grid `sm:grid-cols-3` cai para 1-col em mobile, OK |
| 18 | Plan — "Em breve" badge | PASS | Distingue plano atual vs futuro com badge + lock icon |
| 19 | Focus states | PASS (parcial) | Links/buttons herdam `transition-colors` e `:hover`, mas não há `focus-visible:ring` explícito nos botões custom |
| 20 | `text-[11px]` / `text-[13px]` font sizes | ACEITÁVEL | Decorativo/local — consistente dentro do dashboard, não justifica token |

## Correções de copy (todas impessoais, sem "tu/tua/teu")

| Ficheiro | Linha | De | Para |
|----------|-------|----|------|
| `app.reports.tsx` | 256 | "Consulta as análises pedidas e descarrega os relatórios disponíveis." | "Análises pedidas e relatórios disponíveis para download." |
| `app.reports.tsx` | 293 | "Analisa um perfil público para começar…" | "Analisar um perfil público para começar…" (infinitivo) |
| `app.reports.tsx` | 316 | "…para quando ativares." | "…para quando for ativado." |
| `app.reports.$id.tsx` | 353 | "Podes descarregar o PDF…" | "O PDF pode ser descarregado diretamente, se disponível." |
| `app.account.tsx` | 108 | "Consulta e gere as informações da conta." | "Informações e definições da conta." |
| `app.plan.tsx` | 104 | "Consulta o plano atual e compara as opções disponíveis." | "Plano atual e opções disponíveis." |

## Migração de tokens (categoria A — deve migrar)

| Ficheiro | Linha | Valor | Substituir por |
|----------|-------|-------|----------------|
| `app-layout.tsx` | 13 | `bg-[#F0F4FA]` | `bg-surface-muted` |
| `app.tsx` | 53 | `bg-[#F0F4FA]` | `bg-surface-muted` |

Nota: todas as cores Tailwind utilitárias (`bg-emerald-50`, `text-slate-900`, etc.) são **aceitáveis como decorativas/locais** — são status badges e não representam tokens de superfície do sistema.

## Acessibilidade — correções mínimas

1. **Botões icon-only** (save/cancel em `app.account.tsx`, download PDF em `app.reports.$id.tsx`) — adicionar `aria-label`.
2. **Botão "Regenerar PDF — em breve"** (disabled) — adicionar `aria-disabled="true"` e `aria-label`.
3. **Timeline** (`app.reports.$id.tsx`) — adicionar `aria-current="step"` ao step ativo e `role="list"` na `<ol>`.
4. **Focus ring** — adicionar `focus-visible:ring-2 focus-visible:ring-blue-300` nos botões custom (download PDF, logout, edit name).

## Resumo

- **14 FAIL** (6 copy, 2 token, 4 accessibility, 2 focus)
- **Nenhum problema de overflow mobile** no código (grid responsivo, `truncate`, `min-w-0`)
- **Nenhum problema de layout desktop** (sidebar 240px + content max-w-1180 OK)
- Todas as correções são cirúrgicas — nenhuma altera lógica, estrutura de dados ou ficheiros locked
