## Fase 2B — Plano: Estender payload de competidor com dados determinísticos

### 1. Confirmações da inspecção

**`src/routes/api/analyze-public-v1.ts` (linhas 991–1118):**
- Cada competidor é buscado via `fetchProfileWithPostsLogged(handle)` — **a mesma chamada Apify** que o perfil primário. O actor devolve `latestPosts[]` no mesmo objecto.
- Hoje esses posts são lidos (`row.latestPosts`), passados a `computeContentSummary(...)` e **descartados** logo a seguir. Só `{ profile, content_summary }` chega a `competitorResults` → `normalized_payload.competitors[]`.
- O perfil primário já passa por `enrichPosts(...)` e persiste `posts[]` + `format_stats` no payload base — esse helper é reutilizável tal como está.

**Conclusão:** todos os dados pedidos (formato, ritmo semanal, top posts, hashtags, captions) **já estão em memória durante o fetch do competidor**. Estender o payload é puramente uma decisão de persistência — zero chamadas adicionais a Apify, OpenAI ou DataForSEO.

### 2. Extensão proposta do payload (mínima e segura)

Local: `normalized_payload.competitors[i]` (entrada com `success: true`). Sem alteração de schema SQL — `normalized_payload` é `jsonb`. Adicionar apenas estes campos novos:

```ts
{
  success: true,
  profile,            // já existe
  content_summary,    // já existe
  // ── novos campos (todos opcionais para back-compat) ──
  posts: EnrichedPost[],          // máx. 12, mesmo helper do primário
  format_stats: FormatStats,      // {Reels, Carrosséis, Imagens}: {count, share_pct, avg_engagement_pct}
  weekday_counts: number[],       // length 7, [Dom..Sáb]
  top_hashtags: Array<{ tag: string; count: number }>, // top 10
}
```

Implementação: dentro do `.map(...)` que produz `competitorResults`, após calcular `summary`, chamar `enrichPosts(posts, profile.followers_count)` (já existente) e derivar `weekday_counts` + `top_hashtags` a partir do `enrichedPosts.posts` (cada post já tem `weekday` e `hashtags`). Helpers determinísticos — sem IO.

### 3. Campos a persistir vs. excluir explicitamente

**Persistir** (já saneados por `enrichPosts`):
- `id`, `shortcode`, `permalink`, `format`, `caption` (cap 500 chars), `hashtags[]`, `mentions[]`, `taken_at`, `taken_at_iso`, `weekday`, `hour_local`, `likes`, `comments`, `video_views`, `thumbnail_url`, `is_video`, `engagement_pct`, `video_duration`, `product_type`, `is_pinned`, `caption_length`, `music_title`.

**NÃO persistir para competidores** (privacidade / ruído / custo de storage):
- `coauthors[]`, `tagged_users[]`, `location_name` — handles/locais de terceiros, irrelevantes para benchmarking competitivo.
- `thumbnail_storage_url` — não pré-fetch base64 de competidores; UI usa apenas `thumbnail_url` (CDN do Instagram funciona do browser). Sem upload para Supabase Storage.
- Raw `latestPosts[]` do Apify — só a forma normalizada `EnrichedPost`.
- Qualquer enriquecimento DataForSEO/OpenAI/visual_cover — competidores ficam puramente determinísticos.

### 4. Notas de privacidade e storage

- Captions e hashtags são públicos por definição (perfil público Instagram analisado por opt-in do utilizador Pro).
- Sem PII de terceiros (coauthors/tagged users excluídos).
- Impacto de tamanho: ~12 posts × ~600 bytes JSON ≈ **~7 KB por competidor** (máx. 2 competidores ⇒ ~14 KB extra por snapshot). `normalized_payload` é `jsonb` e snapshots primários já carregam ~50–150 KB; aumento marginal.
- Sem alteração de schema, RLS, triggers ou índices.

### 5. Confirmações de escopo

- **Zero chamadas novas a providers** — reaproveita o `latestPosts[]` já devolvido na chamada Apify do competidor.
- **Free/Public report não muda** — competidores só existem em runs Pro onde o utilizador adicionou explicitamente concorrentes; payload de runs sem competidores fica idêntico.
- **Snapshots antigos continuam válidos** — todos os campos novos são opcionais; o adapter trata ausência como "não disponível".
- Sem mexer em: pagamentos, EuPago, créditos, entitlements, checkout, pricing, OpenAI, DataForSEO, Apify (lógica), schema SQL.

### 6. Cards desbloqueados por esta extensão

| Card | Dados necessários | Pattern |
|---|---|---|
| **Format Mix vs competidor** | `format_stats` | Pattern 2 (mini-table) |
| **Ritmo semanal (dia-da-semana)** | `weekday_counts` | Pattern 4 (dual bar) |
| **Top posts do competidor** | `posts[]` ordenado por `engagement_pct` | Pattern 5 (lista lado a lado) |
| **Hashtags do competidor** | `top_hashtags` | Pattern 3 (qualitative table) |

(Captions/CTA patterns ficam para fase posterior — exigem heurística ou AI; manter fora desta fase.)

### 7. Prompt exacto para implementação (Fase 2B — Edit Mode)

```
Use Chat/Plan Mode first, then Edit Mode.

Goal:
Persist deterministic per-post competitor data inside
normalized_payload.competitors[] so future cards (Format Mix, Weekday
Rhythm, Top Posts, Hashtags) can render without new provider calls.

Scope:
- src/routes/api/analyze-public-v1.ts: dentro do .map() que constrói
  competitorResults, após computeContentSummary(...), chamar
  enrichPosts(posts, profile.followers_count) e juntar à entrada do
  competidor: posts, format_stats, weekday_counts (length 7, derivado
  de post.weekday) e top_hashtags (top 10 contagem desc, derivado de
  post.hashtags). Tudo opcional.
- src/lib/analysis/types.ts: estender a variante success da
  CompetitorAnalysis com posts?, format_stats?, weekday_counts?,
  top_hashtags? — todos opcionais para back-compat.
- src/lib/report/snapshot-to-report-data.ts: estender o
  competitorBreakdown com os mesmos quatro campos, lidos com guards.
- src/components/report/report-mock-data.ts: adicionar os mesmos
  campos opcionais ao ReportCompetitorBreakdownEntry e popular o mock
  com valores plausíveis.

Excluir explicitamente da persistência por competidor:
coauthors, tagged_users, location_name, thumbnail_storage_url,
qualquer enriquecimento AI/DataForSEO/visual_cover. Sem pré-fetch
base64 de thumbnails de competidores.

Constraints:
- Sem chamadas novas a Apify/OpenAI/DataForSEO.
- Sem alteração de schema SQL nem RLS.
- Free/Public report não muda (só corre quando há competidor Pro).
- Snapshots antigos continuam válidos (todos os campos opcionais).
- Não tocar em payments, EuPago, credits, entitlements, checkout,
  pricing.
- Cap de 12 posts por competidor (já enforced por enrichPosts).

Validation:
1. Pro sem competidor: payload idêntico ao actual.
2. Pro com competidor: normalized_payload.competitors[i] inclui
   posts, format_stats, weekday_counts, top_hashtags.
3. Snapshot antigo sem esses campos continua a renderizar.
4. Typecheck passa.
5. Sem novos provider_call_logs por execução.
```
