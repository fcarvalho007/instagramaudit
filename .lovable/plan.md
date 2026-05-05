
## Changes

### 1. Hashtag card (P03) — `hashtag-diagnostics-card.tsx`

**Title not serifed:** `font-heading` is undefined. Replace all `font-heading` with `font-display` (maps to Fraunces via `--font-display`).

**Card must occupy full width:** Add `md:col-span-2` to the root wrapper so it spans the full grid like the P04 card already does.

**Eyebrow line:** Change `P03 · HASHTAGS` to `03 · HASHTAGS` (drop the "P" prefix, match mockup).

**KPI card 2:** The mockup shows "USOS REGISTADOS" with the total uses count, not "TODOS OS POSTS TÊM HASHTAGS?". Replace with total hashtag uses KPI.

**Source footer — new format:**
Replace the current verbose footer with a compact line:
```
FONTES: [1] Castmagic · [2] Later · [3] Shopify
```
- Label "FONTES:" in eyebrow style, darker grey (`text-content-secondary`)
- Source names in `text-content-tertiary`, still clickable links
- Remove the `<Info>` icon and the extra explanatory sentence about recommendation

### 2. Caption card (P04) — `caption-diagnostics-card.tsx`

**Source footer — same format:**
Replace the current footer with the same compact `FONTES:` pattern.
Remove the "Análise baseada apenas em legendas públicas..." sentence (move it to a single-line disclaimer above the sources if needed, or drop it — the card header already says "legendas públicas").

### Files changed
- `src/components/report-redesign/v2/hashtag-diagnostics-card.tsx`
- `src/components/report-redesign/v2/caption-diagnostics-card.tsx`

No backend, auth, admin, Block 1, Groups C/D, or locked files touched.
