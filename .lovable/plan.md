
# Refinar Caption Intelligence — Pergunta 04

## Current State

The Caption Intelligence section already exists with good structure:
- **Data layer** (`caption-intelligence.ts`): themes, content type mix, recurring expressions, CTA patterns, editorial reading, action bridge — all working
- **UI component** (`report-caption-intelligence.tsx`): Shell with header, snapshot row, 2-column layout, all sub-blocks rendered with SourceBadge
- **No Q05 exists** as a separate component — previous merges already consolidated caption data into Q04
- **No premium teaser** or scope transparency note exists yet

## Changes

### 1. Update Shell header (report-caption-intelligence.tsx)

- Add subtitle: *"Baseado na leitura das legendas publicas dos posts analisados — nao inclui transcricao do que e dito em video."*
- Change badge text from "Baseado em N posts" to "Baseado em N legendas" (since sampleSize already counts only posts with non-empty captions)

### 2. Add data transparency note

Below the ActionBridgeStrip (before the existing hashtag note), add a small transparency block:

> "Esta analise le as legendas publicas dos posts analisados. Nao inclui audio, video, texto dentro das imagens ou transcricao dos Reels."

Keep the existing hashtag separation note.

### 3. Add Premium teaser strip

After the transparency note, add a subtle Premium teaser card with lock icon and PRO badge:

> **Analise Premium: incluir transcricao de videos/Reels**
> "Esta versao analisa as legendas publicas. No plano Premium, a leitura pode incluir transcricao de Reels/videos, hooks falados e comparacao entre o que e dito e o que e escrito."

Style: muted gold accent (using existing token system), small lock icon, compact card.

### 4. Refine Editorial Reading block visual identity

- Add a subtle accent-gold left border (2px vertical line)
- Use Sparkles icon (already imported) for the AI badge area
- When source is "ai", apply slightly more editorial styling to the body text

### 5. Minor refinements

- Ensure the `classifyCaptionPattern` result from `block02-diagnostic.ts` is not rendering a separate Q05 card anywhere (confirmed: it's used only for verdict/priorities, not rendered as a card)
- No changes needed to `caption-intelligence.ts` data layer — the structure already matches the spec

## Files to edit

| File | Action |
|------|--------|
| `src/components/report-redesign/v2/report-caption-intelligence.tsx` | Edit Shell header, add transparency note, add Premium teaser, refine EditorialReadingBlock styling |

## Files NOT touched

- No provider/schema/OpenAI/PDF/admin changes
- No changes to `caption-intelligence.ts` (data layer already correct)
- No changes to `report-diagnostic-block.tsx` (orchestration already correct)
- No changes to locked files
- No new dependencies

## Validation

- `bunx tsc --noEmit` must pass
- `bunx vitest run` must pass
- Mobile-first: no overflow at 375px
