
# Redesign P04 — Diagnóstico de Legendas

## What changes

Rewrite the content body of `caption-diagnostics-card.tsx` (below the existing CardShell header) into five visually distinct sections: A through E, matching the mockup references. The header (CardShell) remains untouched.

## Files to edit

| File | Action |
|---|---|
| `src/components/report-redesign/v2/caption-diagnostics-card.tsx` | Major rewrite of content body |
| `src/components/report-redesign/v2/report-diagnostic-block.tsx` | Pass `posts` array as new prop to CaptionDiagnosticsCard |

No other files will be touched.

## New props

Add `posts?: EnrichedPost[]` to `CaptionDiagnosticsCardProps`. The parent (`report-diagnostic-block.tsx`) already has the `posts` array — just pass it through.

## Section-by-section design

### A. SOBRE O QUE FALA

- Section eyebrow: "A · SOBRE O QUE FALA"
- Right-aligned badge: "N temas detetados" + "N analises semanticas"
- Sub-header: "ASSUNTOS MAIS RECORRENTES" with subtitle
- Each theme as a numbered row with:
  - Rank number in accent circle
  - Theme label (bold)
  - "Identificado em N posts · sinal mais forte da grelha" (contextual subtitle)
  - Signal badge: "SINAL FORTE" (green), "SINAL MEDIO" (blue/purple), "SINAL FRACO" (grey)
  - Collapsible "Ver evidencia" / "Ocultar" button
- When expanded, show matching posts from the `posts` prop:
  - Match by searching each post's caption for theme keywords (from `evidence` array for semantic themes)
  - Each evidence row: format badge (REEL / CARROSSEL / IMAGEM), date, likes count, caption excerpt with highlighted matching terms, "Abrir" permalink link
  - Bottom of expanded area: "Ver os N posts · descarregar CSV com excertos" link row
- Use `Collapsible` from radix (already in project). Only one theme expanded at a time via local state.
- CSV download: client-side blob export of matching posts (caption, date, likes, permalink). No backend needed.

### B. EXPRESSOES RECORRENTES

- Section eyebrow: "EXPRESSOES RECORRENTES" with subtitle
- Optional "Descarregar CSV" button (top-right)
- 2-column grid (desktop), 1-column (mobile)
- Each expression card:
  - Expression in quotes (bold)
  - Count badge "xN" (top-right)
  - Short interpretation text
  - Warning note if risk exists (triangle icon)
  - Collapsible "Ver posts" button
  - When expanded: show posts whose caption contains the expression, same evidence row format as section A

### Comment engagement sub-section

- "PEDE COMENTARIOS NOS POSTS?"
- Large percentage, strategy badge (ATIVA/OCASIONAL/PASSIVA)
- Explanation text
- Example phrases as pills
- "EXEMPLOS DETETADOS" label above examples

### C. COMO ESCREVE

- Section eyebrow: "B · COMO ESCREVE" with "N padroes estruturais" badge
- Three cards in a row (desktop), stacked (mobile):
  1. **COMO COMECAM** — openings distribution with icons and horizontal bars, "primeiras 8 palavras" subtitle
  2. **COMO ACABAM** — endings distribution with bars, highlight dangerous "Com pergunta 0%" in red/green
  3. **DISTRIBUICAO COMPRIMENTO** — stacked horizontal bar with legend, "N legendas analisadas" subtitle

### D. DIAGNOSTICO EDITORIAL

- Section eyebrow: "C · DIAGNOSTICO EDITORIAL" with "sintese gerada por IA" right-aligned
- Sparkles icon + "SINTESE EDITORIAL · IA" label
- Main diagnosis paragraph (larger text, bold key phrases via `<strong>`)
- 3-column grid below: Funciona (green check), Ponto critico (red X), A observar (amber circle)
- Footer note about public captions, hashtags, and knowledge sources

### E. Quality cards (Hook / Voice / Formulaic)

- Keep existing SemanticPill pattern
- Improve spacing: consistent gap, slightly larger padding
- These remain visually secondary to the diagnostic

## Evidence matching logic

Pure client-side function: given a search term (theme label or expression string) and the posts array, filter posts whose `caption` includes the term (case-insensitive). For semantic themes, also check against the `evidence[]` strings. Highlight matching substring in the excerpt using a `<mark>` tag with subtle background.

Fallback: if no posts match, show "Evidencia nao disponivel no payload atual."

## Technical notes

- Use `useState` for tracking which collapsible is open (one per section)
- Reuse existing design tokens (surface-muted, border-subtle, accent-primary, signal-success/danger/warning, tint-*)
- CSV export: `URL.createObjectURL(new Blob([csvContent]))` with download attribute
- File stays as single module — extract small helpers only if needed for readability
- Mobile-first: all grids collapse to single column on small screens
- No new dependencies
- No provider calls, no backend changes, no PDF changes
