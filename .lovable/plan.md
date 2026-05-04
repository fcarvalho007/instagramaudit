
## Audit Results

### 1. Files involved

| File | Role |
|------|------|
| `src/components/report-redesign/v2/report-post-comparison.tsx` | Main component: `PostComparisonBlock`, `PostGroup`, `PostCard` |
| `src/components/report-redesign/v2/report-overview-block.tsx` | Parent — renders `PostComparisonBlock` at line 121 |
| `src/lib/report/snapshot-to-report-data.ts` | Data builder — produces `enriched.topPosts` and `enriched.bottomPosts` (NOT to be modified) |

### 2. Current data available per post

| Field | Available | Source |
|-------|-----------|--------|
| `id` | Yes | snapshot |
| `permalink` | Yes | derived from snapshot permalink or shortcode |
| `shortcode` | Yes | snapshot |
| `caption` | Yes | truncated to 200 chars |
| `format` | Yes | "Reel" / "Carousel" / "Imagem" |
| `likes` | Yes | numeric |
| `comments` | Yes | numeric |
| `engagementPct` | Yes | rounded to 2 decimals |
| `date` | Yes | formatted pt-PT short date |
| `mentions` | Yes | array of handles |
| `thumbnailUrl` | Yes (optional) | proxied via `/api/public/ig-thumb?url=...` |

### 3. Missing fields

None for this layout. All required data (date, format, engagement, likes, comments, caption excerpt, thumbnail, permalink) is already present.

### 4. Thumbnail 3:4 aspect ratio

Currently thumbnails use `aspect-square` (1:1). Changing to `aspect-[3/4]` is purely a CSS change on the card — no data/backend impact. The `object-cover` class already handles cropping regardless of source image dimensions.

### 5. Thumbnail proxy

Yes, thumbnails are already proxied via `/api/public/ig-thumb`. The `thumbnailUrl` field in enriched posts already contains the proxied URL. No changes needed.

### 6. Card click behaviour

Yes, cards are already clickable links when `permalink` exists. The component uses a conditional `<a>` wrapper with `target="_blank"` and hover effects.

### 7. Section usage

`PostComparisonBlock` is used only in `report-overview-block.tsx` (line 121). Not used anywhere else.

### 8. Locked files

Neither `report-post-comparison.tsx` nor `report-overview-block.tsx` appear in `LOCKED_FILES.md`. Safe to modify.

### 9. AI/editorial insight

Yes — the section already receives `renderInsight("topPosts")` which renders the AI insight card below the posts. The new "LEITURA IA" bottom card will replace/enhance this slot.

---

## Implementation Plan — "Variante 2 · Pódio e Perigo"

### Files to edit

1. **`src/components/report-redesign/v2/report-post-comparison.tsx`** — full rewrite of the layout (same exports, same props)

### Files that must NOT be touched

- `src/lib/report/snapshot-to-report-data.ts` (data logic)
- `src/components/report-redesign/v2/report-overview-block.tsx` (parent wiring stays identical — same component name, same props)
- Backend, adapter, auth, admin, PDF, loading screen, global tokens
- All files in `LOCKED_FILES.md`
- Block 2 and engagement benchmark card

### Implementation steps

**Step 1 — New header**
- Eyebrow: `text-eyebrow-sm` "MELHORES E PIORES PUBLICAÇÕES"
- Title: `font-sans text-[24px] md:text-[28px] font-bold` "Os extremos do conteúdo"
- Subtitle: computed dynamically — "2 que voaram e 2 que caíram nos últimos [windowLabel]. [X]x de diferença entre o melhor e o pior." where X = best engagementPct / worst engagementPct

**Step 2 — VS comparison bar**
- Horizontal strip with subtle gradient: blue → white → amber
- Left: best engagement value in cyan/blue
- Center: circular "VS" badge
- Right: worst engagement value in amber/orange
- Clean, thin, Iconosquare-style

**Step 3 — Two-column mirrored layout with central divider**
- CSS Grid: `grid-cols-[1fr_auto_1fr]` on desktop, stacked on mobile
- Left column: 2 best post cards (blue/cyan accent)
- Center divider: vertical line with "[X]x" multiplier badge and "DIFERENÇA ENTRE EXTREMOS" label
- Right column: 2 worst post cards (amber/orange accent)

**Step 4 — Compact post cards**
- Thumbnail: `w-[80px] md:w-[100px] aspect-[3/4]` with `object-cover`, rounded corners
- Format chip overlay on thumbnail
- Date + rank chip row
- Caption excerpt (line-clamp-2)
- Metrics row: likes, comments, engagement %
- Click behaviour preserved (permalink → `<a>` wrapper)
- Best cards: blue/cyan accent colours
- Worst cards: amber/orange accent colours

**Step 5 — Bottom AI/editorial reading card**
- Replace current `renderInsight()` slot with a styled wrapper
- Label: `text-eyebrow-sm` "LEITURA IA · COMPARAÇÃO DE EXTREMOS"
- Background: subtle blue → white → amber gradient
- The `renderInsight()` content renders inside this wrapper
- No changes to insight data or logic

### Design constraints respected
- No glow, no heavy shadows, no neon, no dark panels
- Semantic tokens for colours/surfaces
- `font-display` only for H1 (report title) per memory rules
- `font-sans` (Inter) for all card text
- JetBrains Mono only for raw numeric values
- Mobile-first responsive

### Risk assessment

**Low risk.** Single file rewrite with identical exports and props. Parent wiring unchanged. No data/logic changes. All data fields already available.
