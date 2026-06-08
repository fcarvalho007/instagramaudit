# Plan — Editorial Comparison Hero (Profile vs Competitor)

Scope: presentation-only redesign of `src/components/report-redesign/v2/overview/comparison-hero.tsx`. No backend, no adapter changes, no other components touched. Single-profile path (EditorialIdentityCard) remains untouched and continues to render when no competitor exists.

## File touched

- `src/components/report-redesign/v2/overview/comparison-hero.tsx` — full visual rewrite, same Props contract, same callsite.

## New visual structure

```text
┌────────────────────────────────────────────────────────────┐
│ EYEBROW: Comparação Pro · {windowLabel} · [janela baseline]│
│                                                            │
│ ┌──────────────────┐   ┌────┐   ┌──────────────────┐       │
│ │ PERFIL (blue)    │   │ VS │   │ CONCORRENTE      │       │
│ │ ◐ avatar 80–96px │   │    │   │ ◐ avatar (purple)│       │
│ │ @handle ✓        │   │    │   │ @handle ✓        │       │
│ │ Nome             │   │    │   │ Nome             │       │
│ │ ────────────     │   │    │   │ ────────────     │       │
│ │ Seguidores  XXk  │   │    │   │ Seguidores  XXk  │       │
│ │ Publicações N    │   │    │   │ Publicações N    │       │
│ │ Envolvimento %   │   │    │   │ Envolvimento %   │       │
│ │ Cadência /sem    │   │    │   │ Cadência /sem    │       │
│ └──────────────────┘   └────┘   └──────────────────┘       │
│                                                            │
│ ▸ Editorial verdict (Fraunces, large, deterministic)       │
│                                                            │
│ Methodology line (impossible to miss — own block, not xs)  │
└────────────────────────────────────────────────────────────┘
```

### Panel design (cinematic)
- Larger panels: rounded-2xl, white surface, subtle top accent bar in side color (blue left, indigo right) — 3px height, full width of card, identity signal.
- Avatar bumped to `size-20 sm:size-24` with side-tinted ring (`ring-2 ring-accent-primary/30` / `ring-compare-competitor/30`) and soft outer glow shadow tuned to the side accent. Fallback path: `CompareAvatar` already renders gradient initials when `avatarUrl == null` — no broken circle.
- Identity block centered on mobile, left-aligned on md+. Verified check inline with handle.
- Metric rows: keep the four existing rows (Seguidores, Publicações na amostra, Envolvimento médio, Publicações por semana) but render as a 2x2 stat grid (label eyebrow above, value in Inter SemiBold tabular-nums text-xl/2xl). Winner side highlighted with side accent color + small "▲" caret; non-winner stays content-primary. Sample row never highlighted.
- Remove any score field. No editorial score appears in this card.

### VS divider
- Desktop: vertical hairline column with a circular badge centered (size-14, white bg, border-default, Fraunces "VS" 2xl, tracking-tight, content-primary). Soft shadow.
- Mobile: horizontal — badge centered between stacked panels, hairline line behind it.

### Methodology line (impossible to miss)
- Dedicated block above the verdict, full-width pill: `bg-surface-muted/60 border border-border-subtle rounded-xl px-4 py-2.5`, text-sm (not text-xs), content-secondary, with a small info dot icon.
- Copy:
  - Always: `Comparação com base nas últimas {N} publicações disponíveis.`
  - When `competitor.windowAligned === false`: append `Concorrente em janela de referência.`
  - When `competitor.hasPosts === false`: append note about reduced detail (kept from current code).

### Editorial verdict
- Below methodology line. Fraunces, text-xl sm:text-2xl, content-primary, leading-snug, with side-accent `▸` glyph.
- Deterministic ladder (kept from current `buildHeroVerdict`):
  1. scale vs response (competitor bigger + primary higher ER, or inverse)
  2. engagement advantage (either side >10% delta)
  3. cadence advantage (either side >25% delta)
  4. fallback: "Os dois perfis apresentam dimensão e envolvimento comparáveis."
- No AI is called.

### Mobile (375px)
- Grid collapses to single column: panel → VS badge → panel. Gaps tightened. Avatar size-16 on mobile. Stat grid stays 2-col inside each panel. No element exceeds card padding; all numbers use `tabular-nums` and `truncate` on handle/name.

## Out of scope (untouched)
- `report-overview-block.tsx` callsite, props contract.
- `EditorialIdentityCard` single-profile path (renders unchanged when no competitor).
- All downstream competitor compare cards (bio, engagement, cadence, format, weekday).
- Adapter, backend, providers, schema, credits, Free/Public.

## Validation checklist
- `/admin/report-preview/nunomarkl?variant=pro_preview&draft=false` — hero reads as a true duel from first glance; methodology line obvious; verdict editorial; winners highlighted; avatars present (real or gradient initials, never broken).
- `/admin/report-preview/frederico.m.carvalho` (no competitor) — EditorialIdentityCard still renders; ComparisonHero not mounted.
- 375px viewport — panels stack with VS badge between; no horizontal overflow; no clipped text.
- No duplicate identity stats appear below the hero (existing block already gated by `mode === 'all' && !firstCompetitor`).
- Typecheck passes.
