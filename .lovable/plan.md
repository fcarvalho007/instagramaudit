
# Orbital Particle Effect Around Score Ring

## Files

| Action | File |
|--------|------|
| Create | `src/components/report-redesign/v2/overview/score-orbit-background.tsx` |
| Edit   | `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` |

No other files changed. No data logic, score calculation, AI, backend, PDF, or locked files touched.

---

## New Component: `ScoreOrbitBackground`

**Props:** `family: ScoreFamily` (from score-utils)

**Approach:** Tiny `<canvas>` element (150x150), absolutely positioned behind the score ring. Uses `requestAnimationFrame` for smooth, low-cost animation.

### Particles
- 20 particles, each a small dot (radius 1–2.5px).
- Distributed on 2 concentric orbits (inner ~38px, outer ~55px radius).
- Slow rotation: each particle orbits at its own speed (8–20 seconds per revolution).
- Very low opacity: 0.15–0.35 per particle.
- Occasional subtle size pulse (sinusoidal, slow).

### Colour by family
- `danger`: `rgba(163, 45, 45, opacity)` — rose/red
- `warning`: `rgba(186, 117, 23, opacity)` — amber
- `success`: `rgba(29, 158, 117, opacity)` — emerald

These are local decorative RGBA values documented inline in the component.

### Accessibility
- `aria-hidden="true"` on the canvas.
- `pointer-events-none`.
- Checks `prefers-reduced-motion: reduce` via `matchMedia` — if active, renders nothing (canvas hidden).

### Performance
- Pure `requestAnimationFrame` loop, no React state updates.
- Cleanup via `useEffect` return (cancels rAF).
- Canvas is tiny (150x150 CSS px, uses `devicePixelRatio` capped at 2 for retina).
- 20 particles = negligible draw cost.

---

## Integration in `editorial-identity-card.tsx`

Wrap the score ring area (lines 166–183) in a `relative` container. Place `ScoreOrbitBackground` as the first child with `absolute inset-0`. Keep `ScoreRing` and labels above with `relative z-10`.

```text
<div className="relative flex flex-col items-center shrink-0">
  <ScoreOrbitBackground family={globalFamily} />
  <div className="relative z-10 flex flex-col items-center">
    <ScoreRing ... />
    <span>de 100</span>
    <span>Crítico / A melhorar / Forte</span>
  </div>
</div>
```

---

## Validation

1. `bunx tsc --noEmit` — 0 errors
2. `bunx vitest run` — all pass
3. Visual QA at desktop viewport
4. Visual QA at 375px — no horizontal overflow
5. Confirm score number and label remain readable
6. Confirm no click interactions blocked
