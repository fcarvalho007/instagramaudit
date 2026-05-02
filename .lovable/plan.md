## Auditoria do pipeline atual

### 1. O actor atual (`apify/instagram-scraper`) não devolve dados de comentários individuais

Confirmado. O actor unificado (`apify/instagram-scraper`, chamado em `src/routes/api/analyze-public-v1.ts:92`) recebe `directUrls` + `resultsType: "details"` e devolve **uma linha por perfil** com `latestPosts[]`. Cada post contém apenas `commentsCount` / `comments` (número inteiro). Não devolve objectos de comentário, autores, texto, nem replies.

### 2. O campo `permalink` está disponível e preservado

Confirmado. O payload normalizado já inclui `permalink` em cada post (ex: `https://www.instagram.com/p/DXru9YbjmYN/`). O tipo `EnrichedPost` em `src/lib/analysis/normalize.ts:266` declara `permalink: string | null` e o normalizer popula-o a partir de `raw.permalink`, `raw.postUrl` ou `raw.url`. Também está disponível `shortcode`.

O permalink é armazenado no `normalized_payload.posts[].permalink` dentro de `analysis_snapshots`.

### 3. Post URLs estão preservados no snapshot

Todos os 12 posts do perfil de teste têm `permalink` válido no `normalized_payload`. Não são descartados.

### 4. O schema actual suporta métricas derivadas de comentários sem guardar comentários crus

Sim. O campo `normalized_payload` é JSONB e já contém subcampos como `content_summary`, `format_stats`, etc. Um novo objecto `comment_intelligence` pode ser adicionado ao `normalized_payload` sem migration, dado que é JSONB livre. Alternativa: coluna dedicada (ver recomendação abaixo).

### 5. Recomendação de armazenamento

**JSONB dentro de `normalized_payload`** — preferido. Razões:
- Não requer migration de schema
- Mantém o padrão existente (tudo no mesmo snapshot)
- Os agregados são pequenos (~500 bytes)
- A feature é opcional/PRO — o campo simplesmente não existe para reports FREE
- Evita tabela separada que complicaria joins e cache invalidation
- Os comentários crus **nunca são persistidos** (processados em memória no servidor, só os agregados são guardados)

---

## Arquitectura proposta

### Fluxo de dados

```text
1. Profile analysis (existing) → normalized_payload + posts[]
2. If PRO flag active:
   a. Extract top N post permalinks (max 12, ordered by engagement desc)
   b. Call apify/instagram-comment-scraper with those URLs
   c. Process comments in memory:
      - Count total comments, total replies
      - Detect owner replies (ownerUsername === profile.username)
      - Aggregate into commentIntelligence object
   d. Attach commentIntelligence to normalized_payload
   e. Store snapshot as usual
3. If FREE: skip step 2, commentIntelligence absent
```

### Actor input payload (comment scraper)

```json
{
  "directUrls": [
    "https://www.instagram.com/p/DXru9YbjmYN/",
    "https://www.instagram.com/p/DXpABC123/"
  ],
  "resultsLimit": 50,
  "includeNestedComments": true,
  "isNewestComments": true
}
```

Actor ID: `apify/instagram-comment-scraper` (alt: `SbK00X0JYCPblD2wp`)

### Actor output mapping

Cada item do dataset:

| Campo Apify | Uso |
|---|---|
| `ownerUsername` | Comparar com `profile.username` para detectar replies da marca |
| `text` | Não persistido (GDPR). Pode ser usado para sentiment em memória |
| `timestamp` | Pode servir para reply latency (futuro) |
| `likesCount` | Métrica de qualidade da conversa |
| `repliesCount` | Contagem de sub-replies |
| `replies[].ownerUsername` | Detectar replies da marca em sub-threads |

### Objecto `commentIntelligence` (guardado no snapshot)

```typescript
interface CommentIntelligence {
  available: boolean;
  source: "apify_comments";
  samplePosts: number;
  sampleComments: number;
  sampleReplies: number;
  ownerUsername: string;
  ownerRepliesCount: number;        // replies + top-level comments by owner
  ownerReplyRatePct: number;        // ownerReplies / audienceComments * 100
  postsWithOwnerReplyPct: number;   // % of sampled posts with >= 1 owner reply
  audienceCommentsCount: number;    // total comments minus owner's own
  topConversationPost?: {
    postUrl: string;
    commentsCount: number;
    ownerRepliesCount: number;
  };
  limitations: string[];
}
```

### Detecção de replies da marca

```typescript
const isOwner = (username: string, profileUsername: string) =>
  username.toLowerCase().trim() === profileUsername.toLowerCase().trim();

// Para cada post:
// 1. Iterar top-level comments → se isOwner → ownerReply++
// 2. Iterar replies[] → se isOwner → ownerReply++
// 3. Audience comments = total - owner comments
```

---

## Custo estimado

- Preço Apify: ~$1.90/1000 comentários (PPR)
- Para 12 posts × 50 comentários = 600 comentários máx = ~$1.14 por análise PRO
- Com `includeNestedComments`: replies contam como items extra, potencialmente 2x = ~$2.28 worst case
- Custo do profile scraper atual: ~$0.05–0.10
- **Impacto total**: +$1–2.50 por análise PRO (20x o custo do scraper base)

### Controlo de custos

| Config | Valor | Onde |
|---|---|---|
| `COMMENT_SCRAPER_ENABLED` | `false` (default) | `app_config` ou secret |
| `COMMENT_SCRAPER_MAX_POSTS` | `12` | Constante no código |
| `COMMENT_SCRAPER_RESULTS_LIMIT` | `50` | Constante no código |
| `COMMENT_SCRAPER_INCLUDE_REPLIES` | `true` | Constante no código |
| `maxTotalChargeUsd` | `3.00` | Passado ao Apify como hard cap |

---

## Riscos de privacidade

| Risco | Mitigação |
|---|---|
| Usernames de comentadores | Nunca persistidos. Processados em memória apenas para comparação `=== owner` |
| Texto de comentários | Nunca persistido. Descartado após agregação |
| GDPR right to erasure | Não aplicável — não guardamos dados pessoais de terceiros |
| Perfil do owner | Username já está no snapshot (dados públicos do próprio utilizador) |
| `limitations[]` | Array de strings estáticas, sem dados pessoais |

---

## Alterações ao UI

### Localização: Block 02 → Card Q05 "Resposta"

**Se `commentIntelligence` não disponível** (FREE ou feature desativada):
- Card Q05 mantém-se exactamente como está
- Adicionar teaser discreto no final do card:

```
"Análise de respostas da marca disponível no plano Pro."
```

**Se `commentIntelligence` disponível** (PRO):
- Subsecção adicional dentro do Q05, após o `DiagnosticAudienceHighlight` existente
- Título: **"A marca participa na conversa?"**
- Estados:
  - `ownerReplyRatePct >= 30` → "Marca responde ativamente" (emerald)
  - `ownerReplyRatePct >= 10` → "Responde pontualmente" (amber)
  - `ownerReplyRatePct > 0` → "Presença mínima na conversa" (amber)
  - `ownerReplyRatePct === 0` → "Não foram detetadas respostas da marca" (rose)
  - `sampleComments < 5` → "Sem dados suficientes" (slate)

- Métricas visíveis:
  - "X respostas da marca em Y comentários públicos analisados"
  - "A marca respondeu em Z% das publicações analisadas"

- Transparência (copy fixo):
  - "Análise de comentários públicos — não inclui DMs"
  - "Não inclui comentários ocultos, apagados ou visíveis apenas com login"
  - "Resultados podem variar consoante o que está publicamente acessível"

### Ficheiros a alterar (UI)

- `src/components/report-redesign/v2/report-diagnostic-block.tsx` — adicionar subsecção condicional ao Q05
- Novo componente: `src/components/report-redesign/v2/report-comment-intelligence.tsx`

---

## Ficheiros a alterar/criar (backend)

| Ficheiro | Acção |
|---|---|
| `src/lib/analysis/comment-scraper.server.ts` | **Novo** — wrapper do actor de comentários |
| `src/lib/analysis/comment-intelligence.ts` | **Novo** — lógica de agregação pura (sem I/O) |
| `src/lib/analysis/types.ts` | Adicionar `CommentIntelligence` interface |
| `src/routes/api/analyze-public-v1.ts` | Adicionar chamada condicional ao comment scraper após profile scrape |
| `src/lib/report/snapshot-to-report-data.ts` | Ler `comment_intelligence` do payload e expor no `AdapterResult` |

### Schema (sem migration necessária)

O `normalized_payload` JSONB ganha um campo opcional:

```json
{
  "comment_intelligence": {
    "available": true,
    "source": "apify_comments",
    "samplePosts": 8,
    ...
  }
}
```

---

## Rollout

1. **Fase 0** (actual): Nada muda. Feature não existe.
2. **Fase 1**: Criar infra-estrutura backend (scraper wrapper, aggregator, types). Feature desativada por `COMMENT_SCRAPER_ENABLED = false`.
3. **Fase 2**: Criar componente UI condicional no Q05. Testar com perfil de teste e flag manual.
4. **Fase 3**: Ligar a flag PRO quando o sistema de planos existir.

**Nenhuma alteração ao**: free report flow, profile/post scraper, PDF, auth, pricing UI, locked files, schema DB.
