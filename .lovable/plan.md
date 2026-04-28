# Apify payload completeness audit + Report v2 data coverage

Modo: read-only + plano. Sem chamadas a Apify. Sem alterações ao /report/example, ficheiros locked ou UI.

---

## 1. Estado actual da integração Apify

- **Actor**: `apify/instagram-scraper` (unified, em `analyze-public-v1.ts:67`).
- **Input**: `{ directUrls, resultsType: "details", resultsLimit: 12, addParentData: false }`. Cost guards: `maxItems: 1`, `maxTotalChargeUsd: 0.10`, `apifyTimeoutSecs: 55`.
- **Output**: `Record<string, unknown>` por handle, com `latestPosts[]` embebido.
- **Pipeline**: `runActor` → `normalizeProfile` + `enrichPosts` + `computeContentSummary` → `analysis_snapshots.normalized_payload`.
- **Top-level persistido**: `profile`, `posts`, `competitors`, `format_stats`, `content_summary`, `market_signals_free`.
- **Snapshot real (`frederico.m.carvalho`)**: 12 posts, `comments_max=3`, 1 post com comments>0 → **`comments=0` é maioritariamente real**, não bug do normalizador.

---

## 2. Matriz de cobertura de campos

Legenda: ✅ persistido · ➖ normalizado mas não persistido · ❌ não capturado · ❓ desconhecido até nova run

### Profile (12 campos pedidos)

| Campo | Pedido a Apify | Normalizado | Persistido | Web | PDF |
|---|---|---|---|---|---|
| username | ✅ | ✅ | ✅ | ✅ | ✅ |
| full_name / display_name | ✅ | ✅ | ✅ | ✅ | ✅ |
| biography | ✅ | ✅ | ✅ | ✅ | ✅ |
| profile_pic_url / HD | ✅ | ✅ (avatar_url) | ✅ | ✅ | ✅ |
| followers_count | ✅ | ✅ | ✅ | ✅ | ✅ |
| following_count | ✅ | ✅ | ✅ | ✅ | ✅ |
| posts_count | ✅ | ✅ | ✅ | ✅ | ✅ |
| is_verified | ✅ | ✅ | ✅ | parcial | ✅ |
| **is_business_account** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **business_category / category** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **external_url** (link na bio) | ✅ | ❌ | ❌ | ❌ | ❌ |
| **highlight_reels_count** | ✅ | ❌ | ❌ | ❌ | ❌ |

### Post (24 campos pedidos)

| Campo | Pedido | Normalizado | Persistido | Web | PDF |
|---|---|---|---|---|---|
| id / pk | ✅ | ✅ | ✅ | parcial | parcial |
| shortcode | ✅ | ✅ | ✅ (null em alguns Reels) | ✅ | parcial |
| permalink | ✅ | ✅ (fallback `/p/{shortcode}/`) | ✅ | ✅ | ✅ |
| caption | ✅ | ✅ (truncado a 500) | ✅ | ✅ | ✅ |
| hashtags | (extraído) | ✅ | ✅ | parcial | parcial |
| mentions | (extraído) | ✅ | ✅ | parcial | parcial |
| likes | ✅ | ✅ | ✅ | ✅ | ✅ |
| comments | ✅ | ✅ | ✅ (real, não bug) | ✅ | ✅ |
| video_views | ✅ | ✅ | ✅ | ✅ | parcial |
| thumbnail_url | ✅ | ✅ | ✅ (URL CDN expira) | ✅ | parcial |
| taken_at / iso | ✅ | ✅ | ✅ | ✅ | ✅ |
| weekday / hour_local | (derivado UTC) | ✅ | ✅ | ✅ | ✅ |
| is_video / format | ✅ | ✅ | ✅ | ✅ | ✅ |
| engagement_pct | (derivado) | ✅ | ✅ | ✅ | ✅ |
| **video_duration** | ✅ provável | ❌ | ❌ | ❌ | ❌ |
| **carousel child_count** | ✅ provável | ❌ | ❌ | ❌ | ❌ |
| **tagged_users** | ✅ provável | ❌ | ❌ | ❌ | ❌ |
| **coauthors / collab** | ❓ | ❌ | ❌ | ❌ | ❌ |
| **location (id + name)** | ✅ provável | ❌ | ❌ | ❌ | ❌ |
| **music / audio (title, artist)** | ✅ Reels | ❌ | ❌ | ❌ | ❌ |
| **alt_text / accessibility_caption** | ✅ provável | ❌ | ❌ | ❌ | ❌ |
| **product_type** (clips/feed/igtv) | ✅ | usado em `classifyFormat` | ❌ persistido cru | ❌ | ❌ |
| **caption_full (sem truncate)** | ✅ | ❌ (cortado a 500) | parcial | ❌ | ❌ |
| **comments_disabled flag** | ✅ provável | ❌ | ❌ | ❌ | ❌ |

### Lacunas por categoria

- **Hashtags/mentions**: extraídos só da caption por regex → perde-se o que vier em campos próprios (`hashtags[]` directo do actor).
- **Comments**: confirmado real. 11/12 posts a 0 não é bug — é Reels novos sem comentários ainda.
- **Verified**: persistido mas o report web não mostra badge.

---

## 3. Campos high-value para Report v2

Ordenados por impacto editorial × custo de implementação:

| # | Campo | Valor para o report | Custo |
|---|---|---|---|
| 1 | **video_duration** | Permite calcular "retention proxy" (views/duração) e separar Reels curtos vs longos | Baixo — só normalizar |
| 2 | **product_type** persistido | Distinguir Reels editorial vs Clips vs IGTV no PDF | Baixo |
| 3 | **carousel child_count** | "Carrosséis longos têm 28% mais engagement" — narrativa concreta | Baixo |
| 4 | **tagged_users** | Detectar collabs, parcerias, marcas → secção "Rede de colaboração" | Médio (precisa UI) |
| 5 | **location** | Mostrar "65% dos teus posts são em Lisboa" | Médio |
| 6 | **music/audio** | Reels: identificar trending sounds reutilizados | Médio |
| 7 | **business_category + external_url** | Hero do report: "Categoria oficial Instagram + link na bio" | Baixo |
| 8 | **caption_full** | Necessário para análise de tom OpenAI (passo 8) — truncate a 500 mata-o | Baixo (subir para 2000) |
| 9 | **alt_text** | Acessibilidade do report + base para análise visual sem chamar Vision API | Baixo |
| 10 | **coauthors** | Detectar collab posts (forma diferente de `tagged_users`) | Baixo se existir |

---

## 4. Storage: o que precisa de Supabase Storage

URLs Apify CDN (`scontent-*.cdninstagram.com`) **expiram** (`oe=...` no URL). Para PDF e share OG images precisam de re-host.

| Asset | Expira? | Estratégia |
|---|---|---|
| `profile.avatar_url` | Sim (poucas horas) | Re-host em `report-pdfs` (ou novo bucket `profile-assets`) na primeira run, persistir URL estável |
| `post.thumbnail_url` | Sim | Re-host só no momento da geração do PDF (12 thumbnails × snapshot) |
| `external_url` (bio link) | Não | Persistir directo |

Importante: **não fazer re-host upfront** para todas as analises — só quando o PDF é pedido. Caso contrário pagamos storage para snapshots que ninguém pediu PDF.

---

## 5. Patch proposto: `raw_field_inventory` (mínimo, seguro)

Objectivo: **descobrir** que campos o actor está realmente a devolver — **sem** persistir os valores (privacidade, tamanho, e ruído).

### Schema

Acrescentar uma 7ª chave top-level a `normalized_payload`:

```jsonc
"raw_field_inventory": {
  "captured_at": "2026-04-28T17:00:00Z",
  "actor": "apify/instagram-scraper",
  "actor_input_hash": "sha256:abc123",
  "profile_keys": ["username", "fullName", "biography", ...],
  "post_keys_union": ["id", "shortcode", "caption", "videoDuration", ...],
  "post_keys_per_index": [
    ["id", "shortcode", ...],   // post 0
    ["id", "shortcode", ...]    // post 1
  ]
}
```

Só **nomes de chaves**, nunca valores. Para arrays/objetos aninhados regista `key.subkey` até profundidade 2.

### Helper: `src/lib/analysis/raw-inventory.ts` (novo, puro)

```ts
export function buildRawInventory(actor: string, input: unknown, raw: Record<string, unknown>): RawFieldInventory
```

### Wire-up: `analyze-public-v1.ts`

Após `runActor` devolver o row cru, antes de o passar a `normalizeProfile`/`enrichPosts`:

```ts
const inventory = buildRawInventory(UNIFIED_ACTOR, actorInput, row);
// ...
storeSnapshot({ ...payload, raw_field_inventory: inventory })
```

Zero impacto no report actual (componentes ignoram chaves desconhecidas).

---

## 6. Run controlada (uma vez, com aprovação explícita)

**Não** corre nesta sessão. Plano para quando aprovado:

1. Implementar `buildRawInventory` + wire-up + cache versioning.
2. Forçar refresh único: chamar `/api/analyze-public-v1` com `frederico.m.carvalho` após invalidar cache (ou usar parâmetro `force=true` se existir; senão `DELETE` linha do cache).
3. Inspeccionar via `supabase--read_query`:
   ```sql
   SELECT normalized_payload->'raw_field_inventory' FROM analysis_snapshots
   WHERE instagram_username = 'frederico.m.carvalho'
   ORDER BY created_at DESC LIMIT 1;
   ```
4. Confirmar:
   - Que campos como `videoDuration`, `childPosts`, `taggedUsers`, `locationName`, `musicInfo` aparecem na lista.
   - Que `commentsCount` está nas keys de **todos** os posts (confirma que o `0` é real, não missing).
5. Custo: 1 chamada Apify ≈ $0.011 (igual às runs actuais).

---

## 7. Plano de implementação em prompts pequenos

### Prompt A — Inventário cru (foundation)
- Criar `src/lib/analysis/raw-inventory.ts`.
- Tipo `RawFieldInventory` em `types.ts`.
- Wire-up em `analyze-public-v1.ts` (uma linha antes de `storeSnapshot`).
- Test deterministico (puro).
- ☐ `bunx tsc --noEmit`

### Prompt B — Cache versioning + refresh controlado
- Adicionar `payload_schema_version: "v2"` ao snapshot.
- Quando lookup encontra `v1`, tratar como cache miss → força nova run (apenas para handles allowlisted).
- Necessário antes do Prompt C para garantir que campos novos chegam aos snapshots existentes.

### Prompt C — Run controlada + leitura do inventory
- Apenas após aprovação explícita.
- Uma chamada a Apify para `frederico.m.carvalho`.
- Output: lista exacta de campos disponíveis.

### Prompt D — Normalizar campos high-value (1-3)
- Adicionar a `EnrichedPost`: `video_duration_secs`, `product_type`, `carousel_child_count`.
- Adicionar a `PublicAnalysisProfile`: `business_category`, `external_url`, `is_business_account`.
- Subir `CAPTION_MAX_LENGTH` para 2000.

### Prompt E — Normalizar campos relacionais (4-6)
- `tagged_users`, `location`, `music_info`. Só os que o Prompt C confirmou existir.

### Prompt F — Asset re-hosting (PDF only)
- Helper `rehostInstagramAsset(url, snapshotId)` no fluxo PDF.
- Chamado só dentro de `public-report-pdf.ts` para avatar + 12 thumbnails.
- Bucket: re-usar `report-pdfs` ou criar `report-assets`.

### Prompt G — Surfacing no web report (sem mudar layout)
- Apenas a partir daqui se mexe na UI, e mesmo assim só dentro dos componentes não-locked.
- Badge verified, categoria, link bio, child_count nos cards de carousel.

---

## Sumário executivo

- **8 campos profile** já capturados, **4 em falta** (business_category, external_url, is_business_account, highlight_reels_count).
- **14 campos post** capturados (incluindo hashtags, mentions, video_views, thumbnail), **10 em falta** com alto valor (video_duration, child_count, location, music, tagged_users, product_type cru, caption_full, alt_text, coauthors, comments_disabled).
- **`comments=0` confirmado real** no snapshot existente — não é bug.
- **Avatar e thumbnails têm URLs que expiram** — re-host só quando o PDF é gerado, não upfront.
- **Próximo passo recomendado**: Prompt A (inventário cru) — zero risco, zero custo extra Apify, dá-nos visibilidade definitiva.

---

## Decisões que preciso de ti

1. Aprovas começar pelo **Prompt A** (inventário cru, sem chamar Apify)?
2. Confirmas o re-host de assets **só no momento de gerar PDF** (não upfront)?
3. Aprovas subir `CAPTION_MAX_LENGTH` de 500 → 2000 no Prompt D? (necessário para OpenAI no passo 8)
4. Para a Run controlada do Prompt C, aprovas o custo de **1 análise fresca a `frederico.m.carvalho`** (~$0.011)?

## Checkpoint

- ☐ Decisão sobre Prompt A / B / C
- ☐ Aprovação de re-host on-demand vs upfront
- ☐ Aprovação CAPTION_MAX_LENGTH 500 → 2000
- ☐ Aprovação 1 run Apify fresca
