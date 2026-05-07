
# Redesign do first fold do relatório público

## Scope

Ficheiros a alterar:
1. **`src/components/report-redesign/v2/report-hero-v2.tsx`** — reescrever o hero card
2. **`src/components/report-redesign/v2/report-shell-v2.tsx`** — simplificar o wrapper do hero (remover grids/gradientes decorativos)
3. **`src/components/report-redesign/v2/overview/comparison-header.tsx`** — corrigir violações slate-*

Ficheiros **não** alterados: lógica de dados, report-shell routing, módulos de visibilidade, PDF pipeline, providers, Supabase schema.

## Current state

O hero actual tem:
- Wrapper com grid subtil (#F8FBFF), 3 radial gradients decorativos, bottom fade
- Hero card com 2 zonas (identity + stats)
- ComparisonHeader com 2 action cards abaixo
- Avatar ring com `slate-*` gradient, CTA com `bg-slate-900`
- Sem breadcrumb, sem top bar, sem status pill "Atualizado"

## Proposed layout

```text
┌─ TOP BAR (lightweight) ───────────────────────────────────────┐
│  InstaBench logo │ Relatórios > @handle │ Atualizado Mai 2026 │
│                                          [PDF] [Share] [+ Novo]│
└───────────────────────────────────────────────────────────────┘

┌─ HERO CARD (single unified card) ─────────────────────────────┐
│                                                               │
│  ┌ avatar ┐  @martimsilvai ✓  Instagram                      │
│  │        │  Martim Silva                         [⬡] [⬡]    │
│  └────────┘  Creative Director · Lisbon                       │
│                                                               │
│  ─────────────────────────────────────────────────────────────│
│                                                               │
│   Seguidores        Publicações         A seguir              │
│     12.4K              847               1.234                │
│                                                               │
│  ─────────────────────────────────────────────────────────────│
│  ● 25 posts em 90 dias  ·  Analisado 4 Mai 2026              │
└───────────────────────────────────────────────────────────────┘

┌─ Action card ─────────┐  ┌─ Action card ─────────────────────┐
│ 👥 Comparar com       │  │ 🌐 Adicionar outra rede           │
│    concorrentes       │  │    (em breve)                     │
└───────────────────────┘  └───────────────────────────────────┘
```

## Changes detail

### 1. report-hero-v2.tsx — full rewrite

**Top bar** (new, inside the hero section):
- Flex row: logo text "InstaBench" (Inter SemiBold) | breadcrumb "Relatórios > @handle" (Inter, text-sm) | status pill "Atualizado {date}" (rounded-full, soft bg) | PDF/Share icon buttons (already exist) | "+ Novo relatório" primary CTA button
- Clean, minimal, `border-b border-border-subtle`

**Hero card body:**
- **Profile area**: avatar left, handle as `font-display text-xl sm:text-2xl` (Fraunces), verified badge, Instagram pill, real name + bio in Inter text-sm
- Remove icon-only action buttons from card (moved to top bar)
- **KPI strip**: 3-column grid, `font-semibold tabular-nums text-2xl sm:text-3xl` for numbers, `text-eyebrow-sm` for labels, subtle `border-l` dividers
- **Meta footer**: slim row, text-xs, content-tertiary, dot separators

**Avatar ring**: replace `from-slate-300 via-slate-200 to-slate-300` with `from-border-default via-surface-muted to-border-default`

**Wrapper simplification**: remove the 4 decorative BG layers (grid, radials, bottom fade). Use a clean `bg-surface-base` or very subtle gradient.

### 2. report-shell-v2.tsx — hero section wrapper

- Remove the `<section>` with hardcoded `#F8FBFF`, grid background, 3 radial gradients, and bottom fade
- Replace with a simple `<section className="bg-surface-base">` wrapper
- Keep `ReportHeroV2` and `ComparisonHeader` rendering unchanged

### 3. comparison-header.tsx — slate fixes

- `bg-slate-900` → `bg-content-primary` (or a semantic dark CTA token)
- `hover:bg-slate-800` → `hover:bg-content-primary/90`
- `SocialCircle bg="bg-slate-900"` → `bg-content-primary`

## Token compliance

- Zero `slate-*` classes in modified files
- Zero `font-mono` in public-facing components
- All text ≥ 12px (`text-xs` minimum)
- Numbers in Inter with `tabular-nums`
- Headings in Fraunces (`font-display`)
- All colours via semantic tokens

## What does NOT change

- Data logic, score calculations, adapter types
- Module visibility, variant features
- Provider logic, Supabase schema
- PDF pipeline, report generation
- ComparisonHeader modal logic (just style fixes)
- Blocks below the first fold
