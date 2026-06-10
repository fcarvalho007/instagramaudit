## Limpeza mobile — fase 2 (P1 + P2 restantes da auditoria)

Continuação directa da auditoria aprovada. Tudo aqui é apresentação/CSS; nenhum patch toca lógica de payments, cache, credits, blocos lab, snapshots ou backend. Sem mudança de desktop visível — todos os fixes adicionam breakpoints `sm:` para preservar o estado actual a ≥640 px.

---

### Patch 5 · Shell + handles compare (320 safety net)

- `report-shell-v2.tsx:193,222` — `px-5 md:px-6 lg:px-8` → `px-4 sm:px-5 md:px-6 lg:px-8`. Em 320, ganha 8 px úteis e elimina o risco da chip absoluta do `editorial-identity-card` sair do container.
- `compare/compare-table.tsx:46` — header `Th` com `truncate max-w-full` → permitir 2 linhas em mobile (`line-clamp-2 sm:truncate`). Handles longos passam a ser legíveis.
- `report-post-comparison.tsx:765` — tooltip `max-w-[220px]` → adicionar `max-w-[calc(100vw-2rem)]` para não sair do viewport em 320.

### Patch 6 · Mobile bottom nav legível (P1-5)

`report-block-nav.tsx` (mobile bar, linhas 1678–1746):
- Em 320–374, esconder labels textuais (`<span>` com `shortLabel`) e mostrar só ícones (≥56 px de toque garantidos por `min-h-[64px]`).
- Em 375+, manter labels mas reduzir o número de blocos visíveis na rail para 4 + botão Menu (verificar `visibleIndices` / `maxVisible` e adicionar variação por viewport).
- Mantém o sheet/menu completo intacto.

### Patch 7 · Engagement benchmark chart — gutters mobile (P1-6)

`report-engagement-benchmark-chart.tsx` (linhas 163, 238, 259, 282):
- Os `min-w-[56px]` / `min-w-[48px]` dos labels esquerdo+direito comem ~210 px de gutters fixos em 320.
- Em `<sm`, esconder a coluna direita de labels duplicada (mostrar valor apenas in-bar via `text-white` overlay) e baixar `min-w-[56px]` baseline para `min-w-[48px]` à esquerda.

### Patch 8 · Tipografia mínima 12 px em `report-block-nav.tsx` (P2-1)

Substituir `text-[11px]` e `text-[10px]` em UI textual (rótulos de progresso, helper text, badges) por `text-xs` (12 px). Mantém `text-[10px]` apenas em ticks decorativos do progress segment, se existirem. ~25 ocorrências identificadas no audit.

### Patch 9 · Limpeza `slate-*` no relatório (P2-3)

Substituir `slate-*` por tokens semânticos nos 9 ficheiros restantes (já fiz competitor-modal no patch anterior):
`premium-callout.tsx`, `report-kpi-grid-v2.tsx`, `report-themes-feature.tsx`, `report-source-label.tsx`, `report-overview-attention-row.tsx`, `report-overview-cards.tsx` (restantes ocorrências), `report-benchmark-evidence.tsx`, `report-positioning-banner.tsx`, `report-diagnostic-grid-v2.tsx`.

Mapping: `text-slate-400/500/600/700` → `text-content-tertiary/secondary/primary`; `bg-slate-50/100` → `bg-surface-muted`; `border-slate-200` → `border-border-default`; `ring-slate-200` → `ring-border-default`.

### Patch 10 · Polish mobile residual (P2-2 + P2-4)

- `compare-stat-block.tsx`, `report-hero-v2.tsx` chips: remover `whitespace-nowrap` em headlines longas — substituir por `text-balance` ou deixar wrap natural.
- `overview/format-card.tsx:481` — coluna proporção `w-[88px]` em base → `w-[80px] sm:w-[104px] md:w-[128px]` para libertar 8 px ao bloco esquerdo em 320.

---

### Patches deliberadamente NÃO incluídos

- **`StickyUnlockBar` FAB collapse** — descartado: confirmei que `ReportUtilityBar` não está montado, logo não há dupla barra real. O comportamento actual da unlock bar mobile (com `mb-[72px]` para libertar o bottom nav) é correcto.
- **Substituir `EngagementInfoTooltip` por Popover shadcn** — já resolvido no patch 3 (anterior) tornando o trigger `<button>` focusable.
- **Migração de qualquer slate-* fora de `report-redesign/v2` + `report/`** — fora de escopo desta auditoria.

---

### Validação

Após cada patch:
1. `bunx vitest run` para snapshots/unit tests existentes.
2. Spot-check visual em 320/375/768/1024 via browser preview (`/reports/<id>` se houver, ou via `/analyze/<handle>` em cache).

### Ordem proposta

5 → 6 → 7 → 8 → 9 → 10. Independentes; podem ser revertidos individualmente.

Aprovas a entrada em build mode para correr os 6 patches por esta ordem?