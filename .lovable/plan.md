## Goal

Re-shape Block 02 · Diagnóstico on `/analyze/$username` so it stops feeling like a repeat of Block 01 and the AI reading. It should become a focused **editorial diagnostic** — only lenses backed by real data, with cautious wording, and a layout that never leaves an orphan card.

This is a **read-only replan**. No code changes in this turn.

---

## 1 · Audit — what data already exists

From `SnapshotPayload` / `SnapshotPost` / `ReportData` / `ReportEnriched`:

| Signal | Source | Status |
|---|---|---|
| Captions | `posts[].caption`, `caption_length` | ✅ available |
| Hashtags | `posts[].hashtags` | ✅ available |
| Mentions / coauthors | `posts[].mentions`, `coauthors`, `tagged_users` | ✅ available |
| Likes / comments | `posts[].likes`, `posts[].comments` | ✅ available |
| Engagement % per post | `posts[].engagement_pct` | ✅ available |
| Post format | `posts[].format`, `keyMetrics.dominantFormat`, `dominantFormatShare` | ✅ available |
| Posting frequency | `keyMetrics.postingFrequencyWeekly`, `windowDays` | ✅ available (already shown in Block 01 → must reinterpret, not repeat) |
| Top hashtags (counted) | `result.data.topHashtags` (extracted by adapter) | ✅ available |
| Top keywords | `result.data.topKeywords` (extracted by adapter) | ✅ available |
| Mentions summary | `result.enriched.mentionsSummary` | ✅ available |
| Top posts | `result.enriched.topPosts` | ✅ available |
| Engagement vs benchmark | `keyMetrics.engagementBenchmark/DeltaPct` | ✅ available (already in Block 01) |
| Bio / external link | `enriched.profile.bio`, `profileUrl` | ✅ bio available, link not currently extracted |
| AI insights v2 | `enriched.aiInsightsV2.sections` | ✅ available; rendered above the grid as "Leitura IA" |
| Video views | `posts[].video_views` | ⚠️ optional/sparse, often missing |
| Content type (educativo/promocional/…) | none | ❌ **not safe** without OpenAI classification |
| Funnel stage (TOFU/MOFU/BOFU/loyalty) | none reliable | ❌ **not safe** from current keyword heuristics |

**Conclusion of the audit:** the heuristics currently powering "Tipo de conteúdo dominante" and "Fase do funil mais presente" in `block02-diagnostic.ts` are essentially keyword bingo. They produce false confidence on Portuguese captions (e.g. the word "como" tags everything as Educativo/MOFU) and they invent classification — which violates the spec ("Do not invent content classification").

---

## 2 · Lenses safe to render now

| # | Lens | Backed by | Rationale |
|---|---|---|---|
| A | **Resposta da audiência** | `posts[].likes`, `comments`, `engagement_pct`, `engagementDeltaPct` (delta vs benchmark — *interpreted*, not the raw KPI) | Real data; reframes Block 01's KPI as behaviour |
| B | **Ritmo editorial** | `keyMetrics.postingFrequencyWeekly`, `windowDays`, `posts.length`, dispersion of `taken_at` | Real data; interpreted, not the raw "X posts/week" |
| C | **Dependência de formato** | `keyMetrics.dominantFormat/Share` + `formatBreakdown` per-format engagement | Real data; explains *why* one format dominates |
| D | **Padrão temático (indícios)** | `topHashtags` + `topKeywords` (already in `ReportData`) | Real data; flagged as "indícios" |

## 3 · Lenses to hide (until safer signal exists)

| Lens | Why | When to bring back |
|---|---|---|
| **Tipo de conteúdo dominante** (educativo/promocional/…) | Current keyword heuristic over PT captions overfits and misclassifies. Spec forbids invented classification. | When an OpenAI content-type classifier is added to the insights pipeline. |
| **Fase do funil** (topo/meio/fundo/fidelização) | Same problem — keyword bingo over "compra", "como", "?" produces false confidence. | When AI funnel-stage classification or a richer signal (CTA detection, link clicks) exists. |
| **Padrão das captions** (curtas/médias/longas) | Useful internally but too thin as a standalone editorial card and mostly duplicates length info already implied by the format card. | Could return when paired with a CTA-rate signal worth surfacing. |

These three lenses currently render in `report-diagnostic-grid-v2.tsx` and should be removed from the V2 grid. The pure helpers in `src/lib/report/block02-diagnostic.ts` may stay on disk (no harm, no callers after the swap) or be deleted — cleanup is non-blocking.

---

## 4 · Recommended final structure

Block 02 becomes:

```text
┌─────────────────────────────────────────────────────────┐
│ Section header                                          │
│   02 · DIAGNÓSTICO                                      │
│   O que explica estes resultados?                       │
│   Cruza resposta da audiência, ritmo, formato e temas   │
│   para perceber que padrões editoriais explicam o que   │
│   o Bloco 01 mostrou.                                   │
├─────────────────────────────────────────────────────────┤
│ [Leitura IA — caixa existente, mantém-se]               │
├─────────────────────────────────────────────────────────┤
│ Grelha 2×2 (desktop) · 1 coluna (mobile)                │
│ ┌─────────────┐ ┌─────────────┐                         │
│ │ A · Resposta│ │ B · Ritmo   │                         │
│ └─────────────┘ └─────────────┘                         │
│ ┌─────────────┐ ┌─────────────┐                         │
│ │ C · Formato │ │ D · Temas   │                         │
│ └─────────────┘ └─────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

- **4 cards, always.** No orphan row, no 5-card layout. If a single lens has insufficient data, it renders a graceful empty state inside its own card — the grid stays 2×2.
- **Desktop:** `grid-cols-2`. **Tablet:** `grid-cols-2`. **Mobile:** `grid-cols-1`.
- Card chrome stays exactly as today: white surface, soft border, soft shadow, mono eyebrow, serif title, sans body, optional mono micro-line.
- No alert-style red surfaces. Tones: blue (default), emerald (genuinely strong signal), amber (caution), rose only for genuinely weak signal.

---

## 5 · Exact card titles, eyebrows and copy (pt-PT)

### Card A — Resposta da audiência

- **Eyebrow:** `RESPOSTA`
- **Title:** `A audiência está a responder?`
- **Primary (one of):**
  - `Resposta consistente` (delta ≥ 0, ratio comments/likes ≥ 1.5%)
  - `Resposta moderada` (delta entre −20% e 0, ou ratio entre 0.5% e 1.5%)
  - `Resposta tímida` (delta < −20% e ratio < 0.5%)
  - `Sem dados suficientes` (sample < 4)
- **Micro:** `~{avgComments} comentários · {ratio} % do total de likes`
- **Body (factual, ≤ 2 frases):** explica em palavras o comportamento observado, sem voltar a citar a percentagem de envolvimento (essa fica no Bloco 01).

### Card B — Ritmo editorial

- **Eyebrow:** `RITMO`
- **Title:** `O ritmo de publicação ajuda ou prejudica?`
- **Primary (one of):**
  - `Cadência regular`
  - `Cadência intensa`
  - `Cadência ocasional`
  - `Cadência irregular`
  - `Sem dados suficientes`
- **Micro:** `{postingFrequencyWeekly} publicações/semana · {windowDays} dias analisados`
- **Body:** interpreta a frequência (ex.: "Frequência elevada para o tipo de presença — convém garantir consistência editorial", ou "Cadência espaçada — cada publicação carrega mais peso na perceção do perfil"). Nunca repete o número como tagline.

### Card C — Dependência de formato

- **Eyebrow:** `FORMATO`
- **Title:** `O perfil depende demasiado de um formato?`
- **Primary:** `{Reels|Carrosséis|Imagens}`
- **Micro:** `{share} % das publicações analisadas`
- **Body (3 ramos):**
  - `share ≥ 60%`: `Mais de metade das publicações analisadas é em {formato}. Diversificar pode equilibrar o alcance e a leitura editorial do perfil.` (tone: amber)
  - `share entre 40% e 60%`: `{Formato} lidera, mas há mistura saudável com outros formatos.` (tone: blue)
  - `< 40%`: `Mistura equilibrada de formatos — sem dependência clara de um único tipo de publicação.` (tone: emerald)

### Card D — Padrão temático

- **Eyebrow:** `TEMAS`
- **Title:** `Que temas se repetem nas publicações?`
- **Primary:** lista das 3–4 hashtags mais recorrentes (`#tema1  #tema2  #tema3`), ou as 3 keywords se hashtags estiverem vazias.
- **Micro:** `Indícios a partir de hashtags e palavras recorrentes`
- **Body:** `Estes temas voltam ao longo da amostra e descrevem o território editorial mais consistente do perfil. São indícios, não uma classificação completa.`
- **Empty state:** `Sem temas recorrentes claros — as publicações analisadas variam de tópico ou usam poucas hashtags.`

> Microcopy importante: o card D usa explicitamente "indícios", não "classificação". Cards A, B e C usam linguagem causal ("a audiência tende a…", "o ritmo sugere…"), não absoluta.

---

## 6 · Components to reuse

- `ReportFramedBlock` — wrapper visual dos cards (já em uso).
- `ReportBlockSection` — header da secção (eyebrow `02 · DIAGNÓSTICO`, pergunta, subtítulo).
- `ReportAiReading` (compact) — caixa de Leitura IA acima da grelha (já em uso).
- `ReportPendingAiNotice` — fallback quando a IA ainda não correu.
- `cn` + `REDESIGN_TOKENS` — estilo dos cards.
- Ícones `lucide-react`: `MessageCircle` (A), `CalendarRange` (B), `Layers` (C), `Hash` (D).

## 7 · New lightweight V2 components / helpers to create

Ficheiros pequenos, todos pure, sem novas dependências:

1. **`src/lib/report/block02-lenses.ts`** (novo) — substitui em uso o atual `block02-diagnostic.ts`. Exporta funções puras:
   - `assessAudienceResponse(posts, keyMetrics)` → `{ available, label, ratioPct, avgComments, sampleSize, tone }`
   - `assessEditorialRhythm(keyMetrics, postsCount, windowDays)` → `{ available, label, perWeek, windowDays, tone }`
   - `assessFormatDependency(keyMetrics, formatBreakdown)` → `{ available, dominantLabel, sharePct, secondShare, tone }`
   - `assessThematicSignals(topHashtags, topKeywords)` → `{ available, kind: "hashtags"|"keywords"|"mixed"|"empty", terms: string[] }`
   - Cada função devolve discriminated union com `available: boolean` para que o card render sempre.
2. **`src/components/report-redesign/v2/report-diagnostic-grid-v2.tsx`** — substituído (ou esvaziado e reescrito) pelo novo grid 2×2 com as 4 cards acima. Mantém o nome do ficheiro para minimizar diff no shell.

Helpers existentes que já cobrem hashtags/keywords (`extractTopHashtags`, `extractTopKeywords`) **não precisam de mudança** — o adapter já popula `result.data.topHashtags` e `result.data.topKeywords`.

---

## 8 · Files to change in the next implementation prompt

- ✏️ `src/components/report-redesign/v2/report-diagnostic-grid-v2.tsx` — reescrever para 4 lenses, grid 2×2.
- ➕ `src/lib/report/block02-lenses.ts` — novo módulo puro.
- ✏️ `src/components/report-redesign/v2/report-shell-v2.tsx` — passar `formatBreakdown` e `topKeywords` ao grid (além do que já passa). Sem outras alterações.
- 🗑️ (opcional, não bloqueante) `src/lib/report/block02-diagnostic.ts` — pode ficar como dead-code temporário ou ser removido depois de confirmar que não há outros consumidores.

## 9 · Files that must remain untouched

- `src/components/report-redesign/report-editorial-patterns.tsx` (continua a alimentar o `ReportShell` legacy do PDF).
- `src/components/report-redesign/report-shell.tsx` (legacy, conduz o PDF).
- `src/lib/report/snapshot-to-report-data.ts`, `editorial-patterns.ts`, `text-extract.ts`, `tiers.ts`, `benchmark-input.server.ts`.
- Block 01 (`ReportOverviewBlock`) e Blocks 03–06 dentro de `report-shell-v2.tsx`.
- Routes `/analyze/$username` (lógica), `/report/print/$snapshotId`, `/report/example`.
- Admin pages, OpenAI prompts, validators, providers, schema Supabase, `LOCKED_FILES.md`.

---

## 10 · Risks and ambiguity

- **Card B may feel close to Block 01** se Block 01 já cita "{X} pub./semana" como KPI cru. Mitigação: o tagline do Card B é qualitativo ("Cadência regular"), nunca o número; o número aparece apenas no micro-label.
- **Card D depende de hashtags/keywords não-vazias.** Em perfis muito limpos (sem hashtags) o card cai em empty state. Aceitável — mantém a grelha 2×2.
- **Limiares são heurísticos** (ex.: `share ≥ 60%`, `ratio ≥ 1.5%`). Devem ficar isolados no helper para fácil iteração futura.
- **Remoção dos cards de Tipo de conteúdo / Funil / Captions** muda a expectativa visual de utilizadores que já viram os 6 cards atuais. Aceitável face ao spec ("Do not invent content classification") e ao objetivo editorial.
- **Texto pt-PT:** todos os labels e bodies seguem AO90 e nunca expõem nomes técnicos (`payload`, `engagement_pct`, etc.).

---

## 11 · Acceptance criteria (for the future implementation)

- Block 02 mostra exatamente **4 cards** numa grelha 2×2 em desktop, 1 coluna em mobile (375 px sem overflow).
- Cards A–D respondem às perguntas humanas indicadas; nenhum repete o número-âncora do Bloco 01 (envolvimento %, posts/semana cru, formato dominante % isolado).
- Sem repetição literal da Leitura IA — bodies dos cards são factuais, ≤ 2 frases curtas.
- Não há `tone: "rose"` em surface — apenas dot/eyebrow quando o sinal é genuinamente fraco.
- Empty states usam linguagem cautelosa ("Sem dados suficientes", "Indícios a partir de…") e nunca colapsam a grelha.
- Sem novas dependências, sem chamadas a Apify/DataForSEO/OpenAI/PDFShift/Supabase.
- PDF (`/report/print/$snapshotId`) inalterado: continua a usar o `ReportShell` legacy + `ReportEditorialPatterns` antigo.
- `bunx tsc --noEmit` verde.
- `bunx vitest run` verde (12/12 ou superior se forem adicionados testes ao novo helper).
- `/report/example`, admin, schema, prompts e validators inalterados.
