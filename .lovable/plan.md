# Prompt 10 · Refinamentos visuais finais

Alterações cirúrgicas em **6 ficheiros**. Sem novas dependências. Sem novos componentes partilhados (apenas `MiniDonut` interno).

## Estado actual confirmado

- **Cohort**: usa fundos sólidos `revenue-700/800` com texto branco — efeito "botão". ✅ precisa polir.
- **Concentração**: 3 quadrados 38×38 com label dentro — sem proporcionalidade visual.
- **Volume diário**: `chartFailed` está em `#E24B4A` (vibrante) e `chartQueued` em `#888780` — pedido pede `#A32D2D` e `#B4B2A9`. `chartDelivered` já é `#1D9E75` ✅.
- **AdminAvatar**: cor vem de `variant` (`ACCENT_500[variant]`), sem hash do handle.
- **IntentSection**: `CardHeader` com `subtitle` mas sem gap explícito antes da lista.
- **LegacyAccessSection**: usa `variant="flush"` (não `subtle`); falta etiqueta "LEGADO" como sinalização. (Nota: pedido refere-se a `subtle` — actual é `flush`, mas o problema visual é o mesmo: pouco contraste.)
- **KPICard**: padding contextual existe (`!p-4/5/6/8`) mas sem controlo de `gap` interno entre eyebrow/value/sub.

## Alterações por ficheiro

### 1. `src/components/admin/v2/receita/cohort-section.tsx`
- Reescrever `retentionStyle` para devolver `{ bg, fg, border }` com fundos suaves esmeralda (palette do prompt: `#E1F5EE`, `#E8F7EF`, `#EFF8F2`, `#F4F9F4`, `#F7F8F4`) e texto em tons escuros.
- Adicionar `border: 1px solid` à célula renderizada.
- Aplicar a mesma palette à legenda de escala no rodapé.

### 2. `src/components/admin/v2/receita/plans-section.tsx`
- Criar componente local `MiniDonut({ pct, color, label })` — SVG 56×56, círculo de fundo `#F0EFEA`, anel preenchido por `strokeDasharray` proporcional, label central em mono.
- Substituir o `<span>` quadrado por `<MiniDonut>` na lista `MOCK_CONCENTRATION`.
- Cores por tier: Top 10% `#04342C`, Top 25% `#1D9E75`, Bottom 50% `#97C459`. Mapear pela ordem dos itens (índice 0/1/2) já que os mocks têm essa ordem.

### 3. `src/components/admin/v2/admin-tokens.ts` (uma constante)
- Mudar `chartFailed: "#E24B4A"` → `"#A32D2D"`.
- Mudar `chartQueued: "#888780"` → `"#B4B2A9"`.
- (Mantém `chartDelivered: "#1D9E75"`.)
- Em `charts-section.tsx`: adicionar `cursor={{ fill: "rgba(31,30,27,0.04)" }}` ao `<Tooltip>` do BarChart.

### 4. `src/components/admin/v2/admin-avatar.tsx`
- Adicionar array `DETERMINISTIC_COLORS` (8 hex da palette tokens) e `colorFromSeed(seed: string)` (hash 31 + mod).
- Adicionar prop opcional `seed?: string`. Quando presente, sobrepõe `variant`.
- Aplicar `seed={profile.handle}` em `top-profiles-section.tsx` e `profiles-table-section.tsx` (perfis Instagram). **Não** alterar `clientes/*` (mantêm cor por estado).

### 5. `src/components/admin/v2/visao-geral/intent-section.tsx`
- Adicionar `mt-4` (16-18px) à `<ul>` de "Pesquisas repetidas" e à correspondente em "Últimos relatórios" para criar respiração entre header e primeiro item.

### 6. `src/components/admin/v2/sistema/legacy-access-section.tsx`
- Manter `variant="flush"` (já é equivalente a default sem padding, e funciona com o accordion).
- Adicionar eyebrow `LEGADO` em mono ao lado/acima do título "Cockpit técnico legado":
  ```tsx
  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-admin-text-tertiary mr-2 px-1.5 py-0.5 border border-admin-border rounded">Legado</span>
  ```

### 7. `src/components/admin/v2/kpi-card.tsx` + `admin-stat.tsx`
- Adicionar `SIZE_GAP: Record<KPISize, number> = { sm: 8, md: 12, lg: 14, hero: 18 }`.
- Passar para `AdminStat` via nova prop `gap?: number` (ou `style={{ gap: ... }}` no wrapper). `AdminStat` já tem `<div>` raiz — adicionar `style={{ display: "flex", flexDirection: "column", gap }}`.
- Remover `mb-2` do `<p>` eyebrow e `mt-1.5`/`mt-1` dos sub para evitar duplicação com gap.

## Verificação

```bash
grep "5DCAA5\|9FE1CB" src/components/admin/v2/receita/cohort-section.tsx
grep -c "MiniDonut" src/components/admin/v2/receita/plans-section.tsx
grep "colorFromSeed" src/components/admin/v2/admin-avatar.tsx
grep "SIZE_GAP" src/components/admin/v2/kpi-card.tsx
```

Build: typecheck/build são executados pelo harness.

## Não fazer

- Não tocar em mock data, ordem de secções, `/report.example`, cockpit legado.
- Não alterar tokens globais (apenas dois hex em `ADMIN_LITERAL`).
- Não criar componentes partilhados novos.

## Checkpoint

- ☐ Cohort com fundos suaves + bordas
- ☐ Concentração com 3 mini-donuts SVG
- ☐ Volume diário cores `#1D9E75` / `#A32D2D` / `#B4B2A9` + cursor subtil
- ☐ AdminAvatar com `seed` + aplicado em perfis Instagram
- ☐ IntentSection respira (gap 16+)
- ☐ Cockpit legado com etiqueta "LEGADO"
- ☐ KPICard com `SIZE_GAP` interno
