

## Plano — Refactor Apify para actor unificado

### Resumo
Substituir os dois actors (`apify/instagram-profile-scraper` + `apify/instagram-post-scraper`) por **`apify/instagram-scraper`** com `resultsType: "details"`, que devolve o perfil **com `latestPosts[]` embutido** numa única chamada por handle. Isto colapsa 2 chamadas → 1 chamada por handle, alinha com o plano Apify atual, e mantém o contrato normalizado intacto.

### Descobertas-chave
- **Input do actor unificado**: `{ directUrls: ["https://www.instagram.com/<user>/"], resultsType: "details", resultsLimit: 12, addParentData: false }`.
- **Output**: objeto profile com campos **idênticos aos que o `normalize.ts` já lê** — `username`, `fullName`, `biography`, `followersCount`, `followsCount`, `postsCount`, `verified`, `profilePicUrl`, `profilePicUrlHD`, e crucialmente `latestPosts[]` com `type`, `likesCount`, `commentsCount`, `timestamp`, `videoViewCount`, `productType`.
- **Resultado**: `normalize.ts` (`normalizeProfile` + `computeContentSummary`) **NÃO precisa mudar** — as suas signatures já cobrem este shape.

### Ficheiros a modificar (3) e impacto em locked files
| Ficheiro | Mudança | Locked? |
|---|---|---|
| `src/routes/api/analyze-public-v1.ts` | Trocar 2 actor IDs + orquestração para 1 chamada com `latestPosts` | Não |
| `src/lib/analysis/apify-client.ts` | Sem mudança (cliente é genérico) | Não |
| `src/lib/analysis/normalize.ts` | **Sem mudança** (shape coincide) | Não |

Verificado contra `LOCKED_FILES.md` — **zero locked files tocados**.

### Implementação

**1. Em `analyze-public-v1.ts`:**
- Remover `PROFILE_ACTOR` + `POST_ACTOR`. Adicionar `UNIFIED_ACTOR = "apify/instagram-scraper"`.
- Substituir `fetchPostsForHandle()` por `fetchProfileWithPosts(username)` que faz **uma** chamada:
  ```ts
  runActor(UNIFIED_ACTOR, {
    directUrls: [`https://www.instagram.com/${username}/`],
    resultsType: "details",
    resultsLimit: POSTS_LIMIT,
    addParentData: false,
  })
  ```
- Devolve o profile row (que já contém `latestPosts`). Aplicar `normalizeProfile(row)` + `computeContentSummary(row.latestPosts ?? [], followers)`.
- Orquestração: primary + competitors em **paralelo via `Promise.allSettled`** (1 chamada cada). Mais simples que o atual fluxo de 2 fases (batched profiles → posts paralelos).
- Mapeamento de erros mantém-se: `ApifyUpstreamError` 404 → `PROFILE_NOT_FOUND`; outros → `UPSTREAM_FAILED`; falha primary com snapshot recente → stale fallback (já existe).

**2. Cleanup:**
- Eliminar a função `fetchPostsForHandle` (substituída).
- Eliminar a lógica de `Map<lowercase-handle, profile>` que existia para juntar 2 outputs distintos — agora cada handle tem o seu próprio resultado atómico.

**3. Snapshot/cache**: zero mudanças. `normalizedPayload` mantém o mesmo shape (`{ profile, content_summary, competitors }`). `cache_key` mantém-se determinístico.

**4. Frontend contract**: zero mudanças. `PublicAnalysisResponse` idêntico.

### Risco e fallbacks
- **Risco baixo**: shapes do unified actor batem com o normalizer existente. Único campo onde competimos com convenção: `latestPosts` é a fonte de posts em vez de uma chamada separada — `computeContentSummary` já aceita o array.
- **Se `latestPosts` vier truncado** (Apify às vezes devolve <12): `posts_analyzed` reflete o que veio, e o `estimated_posts_per_week` usa o fallback `postsAnalyzed / 4` que já existe.
- **Competitor handling**: continua a tolerar falhas individuais via `allSettled`. Estrutura `CompetitorAnalysis` inalterada.

### O que fica fora deste prompt
PDF, email, payments, admin, OpenAI, landing, legal — não tocados. Cache TTL e benchmark engine — não tocados.

### Checkpoints
- ☐ `PROFILE_ACTOR` + `POST_ACTOR` removidos, substituídos por `UNIFIED_ACTOR`
- ☐ Uma chamada Apify por handle (não duas)
- ☐ `normalize.ts` intacto
- ☐ Snapshot/cache compatível (mesmo shape)
- ☐ Frontend contract estável (`PublicAnalysisResponse` igual)
- ☐ Erros pt-PT preservados
- ☐ Zero locked files modificados
- ☐ Pronto para smoke test imediato

