
# Refine Q05 · Audience Response Card

## Data safety finding

`SnapshotPost` contains only `likes?: number | null` and `comments?: number | null`. No comment text, authors, replies, parent relations, or brand reply data. The card must remain limited to engagement counts.

## Files to edit

| File | Changes |
|---|---|
| `report-diagnostic-card.tsx` | Rewrite `DiagnosticAudienceHighlight` — add status icon, metrics grid, editorial copy, conversation prompt strip |
| `report-diagnostic-block.tsx` | Pass `status` prop to `DiagnosticAudienceHighlight` |

## Files NOT touched

tokens.css, providers, Supabase, OpenAI, PDF, admin, other diagnostic cards, block02-diagnostic.ts (no new helpers needed — all copy is inline in the component).

## Changes in detail

### 1. Status icon (in `DiagnosticAudienceHighlight`)

Add a new prop `status: AudienceResponseStatus` passed from the parent.

Render a large icon area at the top of the highlight:
- `active` → `MessagesSquare`, emerald-50 bg
- `moderate` → `MessageCircleMore`, amber-50 bg
- `concentrated` → `Target`, amber-50 bg
- `silent` → `MessageCircleOff`, rose-50 bg
- `unavailable` → `CircleHelp`, slate-50 bg

Icon size: 36–40px, inside a `size-16 rounded-2xl` container with soft tinted background. `aria-hidden="true"` (the card title already provides the textual label).

### 2. Metrics grid

Replace the current "averages bar" (compressed, truncates "coment.") with a 2×2 grid of `MiniStat` cells (already exists in the file):

| Cell | Label | Value |
|---|---|---|
| Top-left | Gostos médios por post | `{avgLikes}` |
| Top-right | Comentários médios por post | `{avgComments}` |
| Bottom-left | Posts com comentários | `{postsWithComments} de {sampleSize}` |
| Bottom-right | Gostos totais | `{totalLikes}` |

Grid: `grid grid-cols-2 gap-2` on desktop, `grid-cols-1` at `<640px` (mobile stacking). No abbreviations, no truncation. Tabular-nums on all values.

Remove the old `flex` averages bar and the separate "sample context line" — the grid subsumes both.

### 3. Editorial interpretation

Below the metrics grid, add a short sentence keyed to `status`:

- `silent`: "O público reage com gostos, mas quase não conversa publicamente."
- `active`: "Há sinais de conversa pública consistente — o conteúdo não está apenas a ser consumido."
- `moderate`: "Há alguma resposta, mas ainda sem volume suficiente para indicar conversa recorrente."
- `concentrated`: "A conversa existe, mas está concentrada em poucos posts."
- `unavailable`: "As publicações analisadas não devolveram dados suficientes de gostos/comentários para uma leitura fiável."

Styling: `text-[12.5px] text-slate-600 leading-relaxed` — the same weight as existing card body text.

### 4. Conversation prompt strip

If `status === "silent" || status === "moderate"`, render a subtle suggestion strip below the editorial line:

```
Experiência sugerida: testar perguntas fechadas, escolhas A/B ou CTAs de comentário.
```

Styling: `rounded-md bg-blue-50/50 ring-1 ring-blue-100/60 px-3 py-2 text-[11.5px] text-blue-700`. Not for `unavailable`.

### 5. Brand reply disclaimer

For all available statuses (`active`, `moderate`, `silent`, `concentrated`), append a discreet line at the bottom:

```
Resposta da marca a comentários: disponível numa análise avançada com dados de comentários.
```

Styling: `text-[11px] text-slate-400 italic` — same as existing methodology notes. This does not claim brand replies are analysed.

### 6. Top conversation post

Keep the existing `topConversationPost` evidence block unchanged — it already renders correctly. Fix the "coment." abbreviation inside it to "comentários".

### 7. Passing `status` from parent

In `renderAudienceCard` inside `report-diagnostic-block.tsx`, add `status={r.status}` to the `DiagnosticAudienceHighlight` props.

## Accessibility

- Icon has `aria-hidden="true"` (card title is the accessible label)
- Metrics grid uses full unabbreviated labels
- No truncation, no overflow at 375px
- Sufficient contrast (all colours from existing token palette)

## Mobile (375px)

- Metrics grid: `grid-cols-1` below 640px — each cell stacks vertically
- Icon area: centered, `size-14` on mobile
- Conversation prompt strip: full width, wraps naturally
- No horizontal overflow
