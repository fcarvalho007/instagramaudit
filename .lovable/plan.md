## Recommendations Page — Deterministic, Snapshot-Only

Add a 5th A4 page to the existing PDF report containing 4–6 strategic recommendations in European Portuguese. Recommendations are produced by a pure heuristic engine that reads only the snapshot payload already passed to `renderReportPdf`. Zero provider calls (OpenAI, Apify, DataForSEO).

### Approach

A new pure module `src/lib/pdf/recommendations.ts` exposes `buildRecommendations(input)` which returns a ranked list of typed recommendation objects. Each recommendation has a stable `id`, an editorial `title`, a `body` paragraph, and a `priority` score for ordering. The PDF document component renders them as numbered editorial cards.

The engine is fully deterministic: same snapshot ⇒ same output. No randomness, no `Date.now()`, no I/O.

### Heuristic catalogue

Each rule fires only when its preconditions are met. The engine collects every fired rule, sorts by priority desc, and returns the top 6 (minimum 4 when possible — see fallback rules at the bottom).

| id | Trigger condition | Priority | Editorial intent |
|---|---|---|---|
| `engagement_below_benchmark` | `benchmark.status==='available'` and `differencePercent < -10` | 90 | Reforçar ganchos criativos e CTAs claros nos primeiros 3 segundos. |
| `engagement_above_benchmark` | `benchmark.status==='available'` and `differencePercent > 10` | 60 | Capitalizar a vantagem: documentar o que funciona e duplicar a frequência do formato dominante. |
| `engagement_aligned` | benchmark available and `|delta| <= 10` | 40 | Procurar o próximo salto: testar formatos secundários para sair do plateau. |
| `format_concentration_high` | dominant format `share_pct >= 70` | 80 | Recomendar testar o formato com 2.ª maior `avg_engagement_pct` (escolhido determ.). |
| `format_underused_high_perf` | um formato não-dominante tem `avg_engagement_pct` ≥ 1.3× do dominante e `share_pct < 25` | 75 | Realocar parte do calendário para esse formato. |
| `cadence_low` | `estimated_posts_per_week < 2` | 70 | Estabelecer ritmo semanal mínimo de 3 publicações. |
| `cadence_high_low_engagement` | `posts_per_week > 5` e engagement abaixo do benchmark | 55 | Reduzir volume e investir em qualidade narrativa. |
| `top_posts_format_pillar` | top 3 posts partilham o mesmo `format` | 65 | Expandir esse pilar editorial; sugerir 3 ângulos derivados. |
| `top_posts_caption_signal` | top 3 posts têm caption média > 120 chars | 50 | Validar que captions longas geram envolvimento — manter narrativa estendida. |
| `hashtags_sparse` | `posts.length > 0` e `avg_hashtags_per_post < 3` | 55 | Introduzir clusters de 5–8 hashtags estruturados (marca / tema / nicho). |
| `hashtags_repetitive` | conjunto único de hashtags / total < 0.4 | 50 | Diversificar a rotação para alcançar novas audiências. |
| `competitors_outperform` | mediana do `engagement` dos concorrentes com sucesso > engagement do perfil + 25% relativo | 70 | Estudar formatos e cadência dos concorrentes; replicar mecânicas-chave. |
| `bio_weak` | `bio` ausente ou < 40 chars | 35 | Reescrever bio com proposta de valor, prova social e CTA. |

Fallback (sempre presentes para garantir mínimo de 4):
- `consistency_baseline` (priority 25): manter publicação consistente e medir mensalmente.
- `analytics_loop` (priority 20): registar variações de envolvimento por formato a cada 30 dias.

The catalogue gives a comfortable margin — a typical real snapshot fires 6–10 rules; we cap output at 6 and the list is sliced after sorting.

### Data plumbing

Today `renderReportPdf` already receives the full `normalized_payload`. The recommendations engine needs:

- `content_summary` (engagement, dominant_format, posts_per_week)
- `format_stats` (per-format share + avg engagement)
- `posts[]` (top posts theme detection, hashtags counts, caption length)
- `competitors[]` (median engagement comparison)
- `benchmark` positioning (already computed in `render.ts`)
- `profile.bio`

All of these are already in scope inside `render.ts`. The engine receives a single typed input object built locally — no new fetches.

### Files to create

- `src/lib/pdf/recommendations.ts` — pure engine
  - `interface RecommendationInput` (typed, narrow shape derived from snapshot)
  - `interface PdfRecommendation { id, title, body, priority }`
  - `function buildRecommendations(input): PdfRecommendation[]` — returns 4–6 items
  - All copy in European Portuguese (pt-PT, AO90), no Brazilian forms
  - No `Date.now()`, no `Math.random()`, no async

- (optional) `src/lib/pdf/sections/recommendations-page.tsx` — extracted component if it grows past ~80 lines. For initial implementation we'll inline `RecommendationsPage` in `report-document.tsx` like the other pages, keeping the project's current convention. The optional file stays a future refactor.

### Files to edit

- `src/lib/pdf/render.ts`
  - Add a `deriveRecommendationInput(payload, benchmark)` helper next to `deriveTopPosts`
  - Pass `recommendations: buildRecommendations(...)` into `ReportDocument`
  - No new I/O

- `src/lib/pdf/report-document.tsx`
  - Add `PdfRecommendation` to `ReportDocumentInput` (`recommendations?: PdfRecommendation[]`)
  - Add inline `RecommendationsPage({ profile, recommendations, generatedAt })` component
  - Mount after `TopPostsPage` (only when `recommendations.length >= 4`)

- `src/lib/pdf/styles.ts`
  - Add `recoCard`, `recoNumber`, `recoTitle`, `recoBody` styles
  - Reuse existing `PDF_COLORS` palette (cyan accent + ink), no new colours
  - A4-safe layout: vertical stack of cards with `wrap={false}` per card to avoid mid-card breaks

### Page layout (A4, react-pdf primitives only)

```text
┌─────────────────────────────────────────────────────┐
│  INSTABENCH         · @username (header, fixed)     │
├─────────────────────────────────────────────────────┤
│  RECOMENDAÇÕES                                      │
│  Próximos passos prioritários                       │
│  Sugestões editoriais derivadas dos dados…         │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 01  Reforçar ganchos nos primeiros 3 seg   │   │
│  │     Body paragraph (3-4 lines, pt-PT)…     │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │ 02  Testar formato Carousels                │   │
│  └─────────────────────────────────────────────┘   │
│  … (4–6 cards total)                                │
├─────────────────────────────────────────────────────┤
│  InstaBench · DD/MM/YYYY      Página N de M (fixed) │
└─────────────────────────────────────────────────────┘
```

Each card is `wrap={false}` so it never splits across pages. Six average-length cards comfortably fit one A4 page (≈720pt usable height, ≈90pt per card).

### Determinism guarantees

- All ordering uses stable sort keys (priority then id).
- Format selection in `format_concentration_high` uses snapshot data only (the second-highest `avg_engagement_pct`, ties broken by canonical name order Reels > Carrosséis > Imagens).
- No locale-sensitive formatting that depends on env (`Intl` is allowed; same Worker locale per render).
- Same payload ⇒ identical PDF bytes (modulo react-pdf object id sequence, which is stable per document).

### Constraints respected

- No OpenAI / Apify / DataForSEO call introduced.
- No new public endpoint. The `/api/generate-report-pdf` route stays admin-only.
- `/report/example` and all components in `LOCKED_FILES.md` untouched.
- No billing, no email, no schema migration.
- Built-in Helvetica font kept — no font embedding regression.

### Risks / notes

- **Caption-derived rules**: when a snapshot has `posts.length === 0` (legacy), all post-based rules are skipped and the engine falls back to baseline rules. The page still renders ≥4 cards.
- **Hashtag heuristics**: rely on `posts[i].hashtags[]` which is present in enriched snapshots; legacy snapshots without hashtags simply skip those two rules — no error.
- **Editorial tone**: copy will be reviewed for pt-PT correctness (impersonal voice, AO90, no "você"). Examples: "Recomenda-se testar…", "Vale a pena reforçar…".
- **Page overflow**: capped at 6 cards × ~90pt = 540pt → fits A4 with margins. If a card body grows past 4 lines we trim copy at the source; we do not enable `wrap` on cards.

### Validation checklist

- ☐ `bunx tsc --noEmit` passes (harness)
- ☐ `bun run build` passes (harness)
- ☐ Recommendations page mounted in `ReportDocument` after Top Posts when `recommendations.length >= 4`
- ☐ No new imports of `openai`, `apify`, `dataforseo` clients in `pdf/*`
- ☐ No new route file under `src/routes/api/public/`
- ☐ Engine is a pure function with no async / no I/O
- ☐ Copy is European Portuguese (AO90), no Brazilian forms
- ☐ Six rules minimum across the catalogue can fire without any provider data
