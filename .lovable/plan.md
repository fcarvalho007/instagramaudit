## Goal

Replace Block 02's current 4-card "alert" grid (used inside `ReportShellV2`) with a real editorial diagnostic of the profile: 6 cards organised in a 3×2 grid that answer human questions about content type, funnel stage, formats, themes, captions and audience response. Strictly read-only over existing snapshot data, no provider calls, no schema changes.

## Approach

The current `src/components/report-redesign/report-editorial-patterns.tsx` is shared between `ReportShellV2` (`/analyze/$username`) **and** the legacy `ReportShell` used by `/routes/report.print.$snapshotId.tsx` (PDF print). Since the brief says "do not touch PDF generation", we must NOT mutate the shared component.

So we will:

1. Add a new V2-only component for Block 02 cards.
2. Add a small pure helper module with deterministic classifiers (content type, funnel stage, caption pattern, audience response).
3. Swap the import inside `report-shell-v2.tsx` only.
4. Leave legacy `report-editorial-patterns.tsx` untouched (PDF/print stays identical).

## Files to create

- **`src/lib/report/block02-diagnostic.ts`** — pure helpers (no I/O).
  - `classifyContentType(posts)` → returns `{ label, confidence: "provavel"|"misto"|"insuficiente", evidence }`. Heuristics over caption keywords + hashtags:
    - Educativo: presence of "como", "passo", "guia", "dica", "aprende", "tutorial", "porque", "razão", "?".
    - Promocional: "promo", "desconto", "código", "compra", "loja", "oferta", "%", "€".
    - Institucional: "equipa", "marca", "missão", "valores", "história", "fundador".
    - Inspiracional: "acredita", "sonha", "motivação", "mindset", "inspira".
    - Entretenimento: emojis density high + short captions + Reels share dominant.
    - Prova social: "cliente", "testemunho", "review", "obrigado", "case", "antes/depois".
    - Returns dominant bucket if its share ≥ 35% AND ≥ 2× second; otherwise "Misto / pouco claro".
  - `classifyFunnelStage(posts)` → buckets posts into TOFU/MOFU/BOFU/Loyalty by signal lists:
    - TOFU: questions, "sabias", "curiosidade", "?", inspirational keywords.
    - MOFU: "como", "guia", "passo", "tutorial", "exemplo".
    - BOFU: "compra", "agenda", "marca já", "link na bio", "WhatsApp", "DM", "€", "%", "promo".
    - Loyalty: "obrigado", "comunidade", "cliente", "testemunho".
    - Output `{ label, sharePct, confidence }` or "Comunicação dispersa" when no bucket ≥ 35%.
  - `classifyCaptionPattern(posts)` → uses `caption_length` averages + question/CTA detection → one of: Curtas e diretas / Médias e explicativas / Longas e educativas / Pouco consistentes / Sem dados suficientes.
  - `classifyAudienceResponse(posts, keyMetrics)` → comments-to-likes ratio + absolute comments avg → label "Audiência ativa" / "Resposta moderada" / "Audiência silenciosa" / "Sem dados suficientes". Returns ratio_pct + comments_avg as evidence. Avoids reusing engagement-rate copy from Block 01.
  - Each function returns a discriminated result `{ available: boolean; ... }` so the card can render a graceful empty state.
  - All functions are pure and unit-testable.

- **`src/components/report-redesign/v2/report-diagnostic-grid-v2.tsx`** — the 6-card grid.
  - Props: `{ patterns, keyMetrics, posts, topHashtags }`.
  - Renders exactly 6 cards (always 6 — empty state with graceful copy when a card has no data, never collapses to 5).
  - Layout: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-fr`.
  - Card: white surface, `rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.08)]`, badge "01"–"06", small dot (semantic tone), serif title, sans body, optional mono micro-label only on cards with quantitative evidence (3, 4, 6).
  - Tone palette: blue (info/analysis) default; emerald only for genuinely strong patterns; amber for caution; rose only for genuinely weak signals. No heavy red backgrounds.

## Files to modify

- **`src/components/report-redesign/v2/report-shell-v2.tsx`**
  - Replace `import { ReportEditorialPatterns } from "../report-editorial-patterns"` with the new `ReportDiagnosticGridV2`.
  - Pass `patterns`, `keyMetrics`, `posts: payload?.posts ?? []`, `topHashtags: result.data.topHashtags`.
  - No other change in the file. The AI reading block above stays as-is.

## Files NOT changed

- `src/components/report-redesign/report-editorial-patterns.tsx` (still used by legacy `ReportShell` → PDF print route).
- `src/components/report-redesign/report-shell.tsx` (legacy, drives PDF).
- `src/lib/report/editorial-patterns.ts`, `snapshot-to-report-data.ts`, all providers, validators, OpenAI prompts, Supabase schema, admin pages, `/report/example`.
- Block 01 (`ReportOverviewBlock`) and Blocks 03–06 in `report-shell-v2.tsx`.

## The 6 cards

| # | Title | Data source | Type |
|---|-------|-------------|------|
| 01 | Tipo de conteúdo dominante | `posts[].caption + hashtags` via `classifyContentType` | Deterministic heuristic |
| 02 | Fase do funil mais presente | `posts[].caption` via `classifyFunnelStage` | Deterministic heuristic |
| 03 | Formato dominante | `keyMetrics.dominantFormat / dominantFormatShare` | Deterministic |
| 04 | Temas e hashtags recorrentes | `result.data.topHashtags` (top 3–4 tags) | Deterministic |
| 05 | Padrão das captions | `posts[].caption_length` + CTA detection via `classifyCaptionPattern` | Deterministic heuristic |
| 06 | Resposta do público | `posts[].likes/comments` via `classifyAudienceResponse` | Deterministic |

## AI-reading anti-duplication

- Card titles are factual labels, not narrative ("Predominância provável: Educativo", not "Este perfil aposta na educação para construir autoridade").
- Card bodies stay ≤ 2 short sentences and reference the *evidence* (counts, %, sample size), never the strategic interpretation.
- Card 6 explicitly avoids the engagement-rate framing used by Block 01's overview KPIs (only comments behaviour + ratio).

## Empty/insufficient data behaviour

Each card always renders. When the helper returns `available: false`, the card shows the same shell with subtle muted body text (e.g. "Amostra insuficiente para inferir um padrão.") and a neutral blue dot. No card disappears, so the 3×2 grid is always intact.

## Acceptance checks (post-implementation)

- `bunx tsc --noEmit` passes.
- `bunx vitest run` passes.
- Visual: 3×2 desktop, 2×3 tablet, 1×6 mobile, no horizontal overflow at 375 / 768 / 1366 px.
- Block 01 and Blocks 03–06 untouched in `report-shell-v2.tsx`.
- Legacy `ReportShell` (PDF) still imports the original `ReportEditorialPatterns` — PDF output is byte-identical.

## Report back

After implementation: files changed, the 6 cards listed, data source per card, which use deterministic heuristics (all 6), missing fields encountered, TypeScript and Vitest results, and confirmation that Block 01 and Blocks 03–06 are unchanged.
