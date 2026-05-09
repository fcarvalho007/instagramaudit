## Estado actual

`src/routes/admin.report-lab.tsx` já tem o label “Versão do relatório a pré-visualizar” (linha 278). Faltam:

- títulos/descrições das opções `VARIANT_OPTIONS` alinhados com a nova spec
- tabela compacta ao nível dos 6 blocos (01–06) com badges semânticas (Incluído / Parcial 3/5 / Premium / Desbloqueado / Oculto)
- nota explicativa de não-impacto operacional

A tabela existente `ConsolidatedModuleTable` é ao nível de **módulos** (overview/diagnostics/marketSignals/…), não dos 6 blocos pedidos. Mantém-se como está; a nova tabela será uma vista resumida diferente, focada nos blocos.

## Mudanças (admin-only, UI)

Tudo num único ficheiro: `src/routes/admin.report-lab.tsx`.

### 1. Reescrever `VARIANT_OPTIONS`

```ts
const VARIANT_OPTIONS = [
  { value: "public_mvp",   label: "Público geral",        description: "Mostra blocos incluídos, secções premium bloqueadas e CTA de desbloqueio." },
  { value: "internal_lab", label: "Laboratório interno",  description: "Mostra todos os blocos desbloqueados para trabalho/admin." },
  { value: "pro_preview",  label: "Pro Preview",          description: "Simula uma versão paga com todos os blocos desbloqueados." },
];
```

A descrição da variant activa continua a ser renderizada pelo `<p>` actual (linha 300–302) — sem mudanças estruturais.

### 2. Nova tabela compacta `BlockAccessMatrix`

Componente local renderizado **logo abaixo** do bloco do switcher de variant (dentro da mesma `section`, antes do "Estado do snapshot"):

- Cabeçalho: `Bloco · Público · Interno · Pro` (Inter `text-[11px] uppercase tracking-[0.12em] text-admin-text-tertiary`).
- 6 linhas, derivadas de `BLOCKS` (`@/components/report-redesign/v2/block-config`) cruzadas com `getVariantFeatures("public_mvp"|"internal_lab"|"pro_preview")`:
  - `01 Visão geral` … `06 Comparação`
- Para cada célula, mapear o estado do bloco para uma badge:
  - `full` → **Desbloqueado** (ou **Incluído** quando a variant for `public_mvp`)
  - `lightweight` ou `teaser` → **Parcial 3/5** (mostrar apenas `Parcial` para outros blocos sem split conhecido)
  - `hidden` em `public_mvp` → **Premium** (badge âmbar com cadeado pequeno)
  - `hidden` noutras variants → **Oculto** (badge cinza)
- A coluna correspondente à variant seleccionada fica destacada (mesma técnica `bg-admin-surface-muted/40` já usada no `ConsolidatedModuleTable`).
- Colunas centradas, badges Inter SemiBold `text-[10px] tracking-wider`, cores via tokens (`bg-emerald-50 text-emerald-700`, `bg-signal-warning/15 text-accent-gold`, `bg-admin-surface-muted text-admin-text-tertiary`).

### 3. Função utilitária `blockBadge(state, variant)`

```ts
function blockBadge(state: FeatureVisibility, variant: ReportVariant, blockId: string) {
  if (state === "hidden") {
    return variant === "public_mvp"
      ? { label: "Premium",     cls: "bg-signal-warning/15 text-accent-gold border border-signal-warning/30" }
      : { label: "Oculto",      cls: "bg-admin-surface-muted text-admin-text-tertiary" };
  }
  if (state === "lightweight" || state === "teaser") {
    return blockId === "performance"
      ? { label: "Parcial 3/5", cls: "bg-signal-warning/15 text-accent-gold" }
      : { label: "Parcial",     cls: "bg-signal-warning/15 text-accent-gold" };
  }
  // full
  return variant === "public_mvp"
    ? { label: "Incluído",     cls: "bg-emerald-50 text-emerald-700" }
    : { label: "Desbloqueado", cls: "bg-emerald-50 text-emerald-700" };
}
```

### 4. Nota explicativa

Imediatamente abaixo da tabela, renderizar:

```tsx
<p className="mt-2 text-[12px] text-admin-text-tertiary">
  Esta pré-visualização não gera novas análises nem altera dados. Apenas muda visibilidade e contexto comercial.
</p>
```

### 5. Fora de scope

- Não tocar em `ConsolidatedModuleTable`, `ModuleVisibilityMatrix`, `ReportShellV2`, `report-variant.ts`, `block-config.ts`.
- Não tocar em providers, scoring, PDF, Supabase, edge functions.
- Não alterar query strings nem persistência das prefs (`writeLabPrefs`).

## Validação

- Build automático do harness corre `tsc`.
- `bunx vitest run` no fim para garantir 124/124 verde.
- Smoke manual em `/admin/report-lab`:
  - Trocar entre as 3 variants e confirmar coluna destacada + descrição alinhada.
  - Tabela mostra `Incluído/Incluído/Parcial 3/5/Premium/Premium/Premium` na coluna **Público**.
  - Tabela mostra `Desbloqueado` em todas as 6 linhas nas colunas **Interno** e **Pro**.
  - Nota visível por baixo da tabela.

## Checkpoint

☐ `VARIANT_OPTIONS` com novos títulos e descrições.
☐ Nova `BlockAccessMatrix` (6 linhas × 4 colunas) renderizada abaixo do switcher.
☐ Badges Incluído / Parcial 3/5 / Premium / Desbloqueado / Oculto aplicadas corretamente por variant.
☐ Coluna activa destacada.
☐ Nota explicativa abaixo da tabela.
☐ Sem mudanças em lógica, providers, PDF, Supabase ou scoring.
☐ `bunx vitest run` verde.