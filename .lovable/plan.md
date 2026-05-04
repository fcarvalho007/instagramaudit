
# Premium Analysis Loading Screen

## Audit findings

1. **Files rendering loading screen**: Only `src/components/product/analysis-skeleton.tsx`, used exclusively by `src/routes/analyze.$username.tsx`.
2. **State that triggers it**: The single `status: "loading"` state in `AnalyzePage` — covers initial load, fresh analysis, and retry. There is no granular progress from the backend (single fetch cycle).
3. **Shared**: No — only used by the analyze route. Not used by admin, PDF print, or report blocks.
4. **Impact of changing it**: Zero — isolated component, no other consumers.
5. **Framer Motion**: Not installed. No motion libraries present.
6. **Locked files**: `analysis-skeleton.tsx` is NOT locked. Safe to edit.

## Plan

### What to build

Replace `AnalysisSkeleton` with a premium, animated loading experience inside the same file. No new files needed — the component is self-contained and only has one consumer.

### Animation approach: CSS-only

No dependencies added. Use Tailwind keyframes already available (`animate-pulse`, `animate-fade-in`) plus a few new local `@keyframes` defined via inline `<style>` or Tailwind arbitrary values for:

- A rotating/pulsing analytics ring (SVG circles with `stroke-dasharray` animation)
- Staggered fade-in of progress phase messages
- A subtle shimmer gradient on the background card

### Component structure

```
AnalysisSkeleton({ username })
├── Full-viewport centered layout (light surface background)
├── White card (shadow-card, rounded-2xl, max-w-md, centered)
│   ├── Animated analytics ring (SVG, ~80px, cyan/blue stroke animation)
│   ├── Phase message (cycles through 4 messages via React state + setInterval)
│   ├── Username badge (@frederico.m.carvalho)
│   └── Subtle "Isto pode demorar até 30 segundos" footnote
```

### Loading phase messages (cycle every ~4s)

1. "A recolher dados do perfil…"
2. "A analisar métricas e engagement…"
3. "A comparar com benchmarks do setor…"
4. "A preparar o teu relatório…"

These are cosmetic — the backend has no real progress events. The cycling messages give the perception of progress.

### Mobile behaviour

- Card remains centered, max-w constrained, padded
- Ring scales down slightly on mobile (`size-16 md:size-20`)
- Text remains readable at 375px

### Files changed

| File | Change |
|------|--------|
| `src/components/product/analysis-skeleton.tsx` | Full rewrite of the component body. Same export name, same props interface. |

No other files touched.

### Risk level

**Very low.** Single file, single consumer, no backend changes, no locked files, no new dependencies, CSS-only animations.

### Not changed

- Backend / analysis pipeline
- Global tokens, styles.css, tokens-light.css
- Locked files
- Admin, report blocks, PDF route
- Cache logic, budget constants
- No new dependencies

### Confirmation

No code was changed during this audit.
