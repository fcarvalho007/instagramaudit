
# Auditoria Apify → Snapshot → Relatório

## Executive summary

- **Actor**: `apify/instagram-scraper` (unified, `resultsType: "details"`, `resultsLimit: 12`, hard cap `maxItems=1`, `maxTotalChargeUsd=$0.10`).
- **Captura**: o normalizador (`normalize.ts → enrichPosts`) **já lê** os campos ricos (videoDuration, coauthorProducers, taggedUsers, locationName, musicInfo, isPinned, productType, caption_length, businessCategoryName, externalUrls, isBusinessAccount). A **snapshot persistida atual** (`frederico.m.carvalho`, id `683e4c21…`, criada 16:27 UTC) **NÃO contém** estes campos — foi gerada por uma versão do código anterior ao R4-A, ou os valores vieram nulos/vazios e a serialização JSON omitiu chaves opcionais.
- **AI v2**: existe geração (`generateInsightsV2`) e adapter (`snapshot-to-report-data.ts → buildAiInsightsV2`), mas **a snapshot atual só tem `ai_insights_v1`** — `has_v2 = false`. O wiring R3.1 está pronto no código, mas não há dados v2 persistidos para esta snapshot.
- **Knowledge layer**: temos apenas agregações 1D (format_stats, top_posts, heatmap, hashtags). **Zero cruzamentos 2D** persistidos ou renderizados.

**Veredicto: PARCIAL.** O actor escolhido é o certo e o normalizador foi expandido. Falta (a) **invalidar a snapshot do Frederico** para forçar repopulação com os campos R4-A, (b) confirmar que os campos novos chegam não-nulos do actor, e (c) construir a camada de cruzamentos 2D (R4-B) e renderizá-la.

---

## 1. Pipeline atual (mapa)

```text
Browser
  └─POST /api/analyze-public-v1 (analyze.$username.tsx)
       │
       ├─Allowlist + kill-switch (apify-allowlist.ts)
       ├─Cache lookup (analysis_snapshots.cache_key, 24h TTL)
       │
       ├─[fresh] runActorWithMetadata("apify/instagram-scraper")
       │         input: { directUrls, resultsType:"details", resultsLimit:12 }
       │
       ├─normalizeProfile(row)            → profile
       ├─computeContentSummary(latestPosts) → content_summary
       ├─enrichPosts(latestPosts, followers) → posts[12] + format_stats
       ├─[opt] DataForSEO Trends           → market_signals_free
       ├─computeBenchmarkPositioning       → benchmark
       │
       ├─storeSnapshot(BASE)               ← persistência resiliente fase 1
       ├─generateInsights (v1)             → ai_insights_v1
       ├─generateInsightsV2 (R3, KB-aware) → ai_insights_v2
       └─storeSnapshot(ENRICHED upsert)    ← fase 2 (mesmo cache_key)

Render: /analyze/$username
  └─snapshotToReportData(payload)
       └─ReportEnriched { profile, content_summary, posts, format_stats,
                          marketSignalsFree, aiInsightsV2, ... }
       └─ReportShell + 9 secções
```

---

## 2. Tabela de cobertura — Raw → Normalizado → Persistido → Render → AI

Legenda: ✅ presente · ⚠️ código preparado mas snapshot atual não tem · ❌ ausente

### 2.1 Profile

| Apify raw | Normalizado | Persistido (snapshot atual) | Render | AI ctx |
|---|---|---|---|---|
| username | profile.username | ✅ | ✅ | ✅ |
| fullName | profile.display_name | ✅ | ✅ | ✅ |
| biography | profile.bio | ✅ | ✅ | ✅ |
| profilePicUrlHD | profile.avatar_url | ✅ | ✅ | – |
| followersCount | profile.followers_count | ✅ | ✅ | ✅ |
| followsCount | profile.following_count | ✅ | ✅ | – |
| postsCount | profile.posts_count | ✅ | ✅ | – |
| isVerified | profile.is_verified | ✅ | ✅ | – |
| businessCategoryName | profile.category | ⚠️ ausente | ❌ | ❌ |
| externalUrls[] | profile.external_urls[] | ⚠️ ausente | ❌ | ❌ |
| isBusinessAccount | profile.is_business | ⚠️ ausente | ❌ | ❌ |
| highlightReelCount | profile.highlight_reel_count | ⚠️ ausente | ❌ | ❌ |
| hasChannel | profile.has_channel | ⚠️ ausente | ❌ | ❌ |

### 2.2 Posts (12)

| Apify raw | Normalizado | Persistido | Render | AI ctx |
|---|---|---|---|---|
| id / pk / shortcode | id, shortcode | ✅ | ✅ | – |
| url / permalink | permalink | ✅ | ✅ | – |
| type / productType / isVideo | format, is_video | ✅ | ✅ | ✅ |
| caption / edge_media_to_caption | caption (≤500ch) | ✅ | ✅ | ✅ (excerpt top-3) |
| likesCount, commentsCount | likes, comments | ✅ | ✅ | ✅ |
| takenAtTimestamp | taken_at, taken_at_iso, weekday, hour_local | ✅ | ✅ (heatmap) | – |
| displayUrl/thumbnailUrl | thumbnail_url | ✅ | ✅ | – |
| videoViewCount/videoPlayCount | video_views | ✅ (null) | ⚠️ | – |
| **videoDuration** | video_duration | ⚠️ ausente | ❌ | ❌ |
| **productType** ("clips","feed") | product_type | ⚠️ ausente | ❌ | ❌ |
| **isPinned** | is_pinned | ⚠️ ausente | ❌ | ❌ |
| **coauthorProducers[]** | coauthors[] | ⚠️ ausente | ❌ | ❌ |
| **taggedUsers[]** | tagged_users[] | ⚠️ ausente | ❌ | ❌ |
| caption length | caption_length | ⚠️ ausente | ❌ | ❌ |
| **locationName/location** | location_name | ⚠️ ausente | ❌ | ❌ |
| **musicInfo** | music_title | ⚠️ ausente | ❌ | ❌ |
| (derivado) hashtags[] | hashtags[] | ✅ | ✅ | – |
| (derivado) mentions[] | mentions[] | ✅ | ⚠️ pouco | – |
| (derivado) engagement_pct | engagement_pct | ✅ | ✅ | ✅ |

### 2.3 Outras secções

| Bloco | Persistido | Render |
|---|---|---|
| `content_summary` (avg_likes, comments, ER, posts/wk, dominant_format) | ✅ | ✅ |
| `format_stats` (count, share_pct, avg_engagement_pct por formato) | ✅ | ✅ |
| `competitors[]` | ✅ (vazio neste teste) | ✅ |
| `market_signals_free` (DFS Trends) | ✅ | ✅ |
| `ai_insights_v1` | ✅ | ✅ (legacy) |
| `ai_insights_v2` (9 secções) | ❌ | adapter pronto, sem dados |

### 2.4 Apify dataset campos NÃO solicitados (não vêm do actor com este input)

- **firstComment / latestComments[]**: `apify/instagram-scraper` precisa `resultsType: "comments"` (run separado) → custo extra. **Não capturamos.**
- **alt text** (`accessibilityCaption`): vem em alguns runs do actor — **não lemos.**
- **sponsored markers** (`isAd`, `partnership`): vem ocasionalmente — **não lemos.**
- **carousel slide count** (`childPosts.length` ou `images.length`): vem em sidecars — **não lemos.**
- **post dimensions** (`dimensions.width/height`): disponível — **não lemos.**

---

## 3. Inspeção da snapshot real `frederico.m.carvalho`

```
id: 683e4c21-60e0-4045-b43a-dfcd85fe9896
created_at: 2026-04-29 16:27:41 UTC · expires_at: +24h

normalized_payload top-keys:
  profile, content_summary, posts(12), format_stats,
  competitors(0), market_signals_free, ai_insights_v1
  (ai_insights_v2: AUSENTE)

profile keys: username, display_name, avatar_url, bio,
  followers_count(9456), following_count(2290), posts_count(2617),
  is_verified(true)
  → SEM: category, external_urls, is_business, highlight_reel_count

posts[0] keys: id, shortcode(null), permalink, format, caption, hashtags(5),
  mentions([]), is_video, taken_at, taken_at_iso, weekday, hour_local,
  likes(5), comments(0), video_views(null), thumbnail_url, engagement_pct(0.05)
  → SEM: video_duration, product_type, is_pinned, coauthors,
         tagged_users, caption_length, location_name, music_title

format_stats: Reels 25% (ER 0.05) · Carrosséis 75% (ER 0.13) · Imagens 0%
content_summary: avg_likes 10, comments 0, ER 0.11, posts/wk 6, dominant=Carrosséis
market_signals_free: present (status, trends, keywords, ...)
ai_insights_v1: present (insights, model, cost, source_signals)
```

**Diagnóstico:** o snapshot é **anterior** à versão do `enrichPosts` que escreve os campos R4-A — ou foi gerado em modo onde o actor não devolveu esses campos (e como são opcionais, foram omitidos). Sem invalidação + re-run, o adapter `snapshot-to-report-data` continua a entregar o subconjunto v1 ao relatório.

---

## 4. Sinais de alto valor descartados (priorização)

### Alta prioridade (ROI imediato em conhecimento editorial)

| Sinal | Razão | Estado |
|---|---|---|
| `video_duration` (Reels) | Permite cruzar duração × views/ER → "Reels de 15-30s rendem +X%" | actor: ✅ · normalizador: ✅ · snapshot: ⚠️ |
| `productType` ("clips" vs "feed" vs "igtv") | Distingue Reels nativos de vídeo de feed | idem |
| `is_pinned` | Posts fixados distorcem médias — devem ser flagged ou excluídos | idem |
| `coauthorProducers[]` | Detecta colabs (lift de alcance ~2-3× típico) | idem |
| `tagged_users[]` | Mapeia rede de marcas/parceiros | idem |
| `caption_length` | Cross caption length × ER (curto vs longo) | idem |
| `category` (businessCategoryName) | Define vertical → benchmark mais preciso | idem |
| `external_urls[]` | "Link in bio" → infere CTA/funil | idem |

### Média prioridade

| Sinal | Razão |
|---|---|
| `location_name` | Cluster geográfico (limitado em PT) |
| `musicInfo` | Trends de áudio (Reels) — útil mas datado |
| `highlight_reel_count` | Maturidade da conta |
| Carrossel slide count | Slides × ER (ótimo > 5 slides?) |
| `accessibilityCaption` (alt) | Sinal SEO + acessibilidade |

### Baixa prioridade / não disponível neste actor

| Sinal | Estado |
|---|---|
| First comment / latest comments | Requer 2º run (`resultsType:"comments"`) → custo |
| Stories / Highlights media | Requer outro actor |
| Insights privados (impressions, reach, saves) | Apenas via Graph API + token do owner |
| Sponsored / `isAd` | Inconsistente neste actor |
| Post dimensions | Disponível, baixo valor analítico |

---

## 5. Camada de informação atual vs camada de conhecimento em falta

### Atual (1D — agregações)

- `content_summary` (médias)
- `format_stats` (3 formatos: count, share, ER)
- Top posts por ER (sort em runtime)
- Heatmap weekday × hour (renderizado)
- Best days (derivado client-side)
- Hashtags / mentions (lista)
- `market_signals_free` (Trends DFS)
- `ai_insights_v1` (texto livre por área) e `ai_insights_v2` (9 secções, **não populadas**)
- Benchmark positioning (vs `benchmark_references`)

### Em falta (2D — cruzamentos = conhecimento)

| Cruzamento | Pergunta editorial que responde |
|---|---|
| **hashtag × format** | "Que hashtags performam melhor em Reels vs Carrosséis?" |
| **format × hour** | "Reels às 19h ou Carrosséis às 12h?" |
| **caption_length buckets × ER** | "Captions curtas (<80) vs médias vs longas — qual ganha?" |
| **hashtag_count × ER** | "Sweet-spot de # por post (3-5? 8-12?)" |
| **slides × ER** (carrosséis) | "5 slides é o ótimo?" |
| **video_duration buckets × views/ER** | "≤15s, 15-30s, 30-60s, >60s — qual converte?" |
| **mentions/collabs × ER** | "Colabs trazem +X% de ER?" |
| **comments / likes ratio** | "Conteúdo conversacional vs vanity likes" |
| **engagement trend slope (últimos 12)** | "Está a crescer ou a desacelerar?" |
| **competitor format gap** | "Eles fazem +60% Reels e ganham +X ER" |
| **market demand × content themes** | Cross DFS keywords × hashtags do perfil |
| **pinned lift** | "Pinados rendem +X% vs orgânico" |

Nenhum destes está a ser computado nem persistido nem fornecido ao OpenAI.

---

## 6. Avaliação de risco

- **Custo zero adicional por turn** para extrair os sinais R4-A: o actor já está a devolver os campos no mesmo run (`addParentData:false`, `resultsType:"details"`, `resultsLimit:12`). É só ler.
- **Risco médio:** depender de campos opcionais do actor sem fallback ⇒ código já trata com `pickNumber/pickString` defensivos.
- **Risco baixo:** snapshot atual sem campos v2/R4-A → invalidar uma snapshot de teste é seguro (TTL 24h, owner-controlado).
- **Risco a evitar:** chamar `resultsType:"comments"` ou subir `resultsLimit` sem cap de custo — fora do âmbito.

---

## 7. Roadmap recomendado (próximos prompts)

### Sprint A — Capturar mais sinal (R4-A finalização)
1. Invalidar a snapshot atual do `frederico.m.carvalho` (1 update SQL `expires_at = now()`).
2. Re-correr `/analyze/frederico.m.carvalho` para repopular **com** os campos novos.
3. Validar no DB que `posts[].video_duration / coauthors / is_pinned / caption_length` estão presentes e que `profile.category / external_urls / is_business` aparecem.
4. Logar (read-only) % de posts com cada campo preenchido — reality check do que o actor realmente devolve para perfis PT.

### Sprint B — Derivar cruzamentos editoriais (R4-B)
Criar `src/lib/report/cross-references.ts` (puro, sem I/O) que produza:
- `hashtagFormatMatrix`, `formatHourHeatmap`
- `captionLengthBuckets`, `hashtagCountBuckets`
- `videoDurationBuckets`, `slideCountBuckets`
- `pinnedLift`, `collabLift`, `mentionNetwork`
- `commentsToLikesRatio`, `engagementSlope`
- `competitorFormatGap`

Integrar em `snapshot-to-report-data.ts → ReportEnriched.crossRefs`.

### Sprint C — Renderizar knowledge cards no relatório
Adicionar 3-5 "Insight cards" editoriais (NOT chart spam) em `report-format-breakdown.tsx` e `report-best-time.tsx`:
- "Reels de 16-30s rendem 2.4× mais que >60s"
- "Carrosséis às 19h-21h superam manhã em 38%"
- "Captions de 80-150 caracteres são o sweet-spot"

Usar tokens `tokens-light.css` (insight box variants já definidas).

### Sprint D — Alimentar OpenAI com contexto mais rico
Estender `InsightsContext` com `crossRefs` (subset compacto, sem PII) → prompts v2 ganham fundamentação numérica em vez de generalidades.

### Sprint E — Knowledge Base ligação
Cruzar `hashtags`, `category`, `format_stats` com `knowledge_benchmarks` e `knowledge_notes` por `vertical` → fundamentar recomendações em evidência curada.

---

## 8. Próximos prompts sugeridos

1. **R4-A.1 (1 prompt)** — Invalidar snapshot Frederico + re-correr + validar campos novos no DB.
2. **R4-B (1 prompt)** — Criar `cross-references.ts` + types + testes unitários.
3. **R4-C (1 prompt)** — Wire `crossRefs` em 2-3 secções do relatório com 3-5 insight cards.
4. **R4-D (1 prompt)** — Estender `InsightsContext` v2 com `crossRefs`; re-gerar v2 para Frederico.
5. **R4-E (1 prompt opcional)** — Cruzar com `knowledge_benchmarks` por categoria.

---

## Verdict

**Estamos a usar dados Apify suficientes? → PARCIAL.**

- O actor escolhido é o correto e o input é eficiente (1 run, 12 posts, custo capado).
- O normalizador já está pronto para extrair ~15 campos adicionais de alto valor.
- A snapshot persistida atual está atrasada relativamente ao código → **invalidar+re-correr é o passo zero**.
- Falta a camada 2D (cruzamentos) que transforma informação em conhecimento editorial — é onde está o maior salto de valor por unidade de esforço.

Aprova avançar com **Sprint A (R4-A.1)** primeiro: invalidar + repopular + validar?
