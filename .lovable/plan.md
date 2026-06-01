## Audit Findings — Thumbnail Persistence (frederico.m.carvalho)

### 1. Confirmed failure reason

**Latest fresh run found**: snapshot `683e4c21-60e0-4045-b43a-dfcd85fe9896`, analysis_event de `2026-06-01 14:23:37 UTC`, `data_source=fresh`, `posts_returned=12`, triggered via `POST https://auditprofiles.com/api/analyze-public-v1?refresh=1`.

**Storage**: bucket `post-thumbnails` existe e é `public=true`, mas tem **0 objects** em `storage.objects` (todos os tempos, não só este run).

**Worker logs (last hour, ambos deployments)**:
- ✅ `[thumbnail-cache] prefetched 12/12 thumbnails` @ 14:23:36.713Z
- ✅ `[analyze-public-v1] base snapshot persisted ... ai_insights_v1=pending` @ 14:23:37.149Z
- ❌ `[thumbnails] handle=... attempted=... stored=...` — **AUSENTE**
- ❌ `[analysis/cache] thumbnail persistence failed (continuing)` — **AUSENTE**

**Interpretação**: a função `persistThumbnailsInPayload` (em `src/lib/report-snapshots/persist-thumbnails.server.ts`, chamada a partir de `storeSnapshot` em `src/lib/analysis/cache.ts:207`) tem dois logs garantidos — o resumo final OU o warning do catch. Nenhum dos dois apareceu. Possíveis causas:

- **(mais provável) o código persist-thumbnails não está presente no deployment publicado** que serviu o run de 14:23 (auditprofiles.com / Worker prod). Foi adicionado depois do último publish, ou o publish não incluiu este módulo. O `storeSnapshot` antigo grava a linha sem invocar persist.
- alternativa menos provável: o Worker terminou o request antes do upload settled (mas o `await` está dentro do try, então o log de resumo teria saído antes do `[base snapshot persisted]`).

**O storage estar a 0 objects desde sempre confirma**: este pipeline nunca produziu sequer 1 upload com sucesso em produção. Não é "12/12 falharam por 403"; é "0/0 sequer tentaram" (no path que correu).

### 2. Direct Worker fetch test — INVALIDA a hipótese 403

**A própria run de 14:23 já contém o teste empírico**: `prefetchThumbnailsAsBase64` (`src/lib/analysis/thumbnail-cache.server.ts`) usa exactamente os mesmos headers (UA Chrome 124, `Referer: https://www.instagram.com/`, `Accept: image/...`) que `persistOne`, faz GET ao mesmo `thumbnail_url` do IG CDN, e logou `prefetched 12/12 thumbnails`. **12 em 12 succeed**. O fetch é convertido em base64 (≤ 500 KB) e guardado em `_thumbnail_base64`.

Logo: **o Worker → IG CDN NÃO é 403**. A premissa "Cloudflare Worker → Instagram CDN likely returns 403" não se sustenta para este actor / este handle / este momento. Não é preciso run de diagnóstico adicional — já temos a evidência num log do mesmo run.

(Caveat: tokens IG CDN expiram em ~horas. O sucesso é só na janela em que o thumbnail_url vem fresco do actor.)

### 3. Apify media source audit

**Actor em uso**: `apify/instagram-scraper`, `resultsType: "details"`, `resultsLimit: 12`, `maxItems: 1`, `addParentData: false` (`src/routes/api/analyze-public-v1.ts:217-250`).

**Campos de media que o normalizer já conhece** (`src/lib/analysis/normalize.ts:430-438`): `displayUrl`, `display_url`, `imageUrl`, `thumbnailUrl`, `thumbnail_url`. **Todos apontam para `*.cdninstagram.com` / `*.fbcdn.net`** — não há um campo alternativo "hospedado pela Apify".

**KV Store / dataset attachments**: este actor, por default, **não baixa media para o Apify Key-Value Store**. Não há setting `downloadMedia` / `saveImages` documentado para `apify/instagram-scraper`. Os outputs são JSON com URLs do CDN do IG.

**Childrens de carrossel / video**: vêm também como URLs do IG CDN, não como blobs Apify.

**Conclusão**: Apify **não fornece** uma fonte de media alternativa ao IG CDN com este actor. Mudar para um actor que descarrega media (ex.: `apify/instagram-post-scraper` com flag de download) é possível mas requer avaliação e custo por imagem.

### 4. Backfill feasibility (não implementar agora)

| Opção | Sucesso | Risco | Custo | Complexidade | Preserva `thumbnail_url` |
|---|---|---|---|---|---|
| A) Worker-based (mesmo runtime) | **Alto se thumbnail_url ainda fresco** (<1-3h); ~0% para snapshots antigos | Baixo. Já há provas que Worker→IG funciona com headers corretos. | ~grátis (Worker CPU + storage egress). | Baixa — reaproveita `persistOne`. | Sim |
| B) Local/admin script (service_role, fetch a partir do meu IP) | Alto em snapshots **frescos**; baixo em snapshots **antigos** (URLs IG já expiradas) | Baixo. Service-role só local. | Grátis. | Média — precisa CLI + leitura de snapshots + upload. | Sim |
| C) Apify media / KV-based | **Não aplicável** — actor atual não guarda imagens. | N/A | N/A sem mudar actor. | Alta (mudar actor, re-orquestrar). | Sim |

Observações:
- Para snapshots já existentes em DB, tokens IG do `thumbnail_url` podem já estar expirados (typically 1-24h). Backfill A/B serve maioritariamente para snapshots criados nas últimas horas.
- O `_thumbnail_base64` map que já é persistido no payload **resolve o problema retroativo sem backfill** para o snapshot atual de `frederico.m.carvalho` (basta o componente passar a usar a base64 como fallback antes do CDN URL).

### 5. Recommendation

**Recomendação: D — fix do pipeline existente antes de qualquer backfill.**

Sequência proposta:

1. **Provar que o código persist está deployado**. Se `auditprofiles.com` ainda corre um build sem `persist-thumbnails.server.ts` invocado, basta publicar. Verificar com um novo refresh controlado e confirmar que aparecem `[thumbnails] handle=... attempted=12 stored=N ...` nos worker logs.
2. **Se o log aparecer com `stored=12`**: pipeline está funcional, basta esperar próximas runs frescas (sem backfill, conforme pedido).
3. **Se o log aparecer com falhas (403 / upload / outro)**: aí sim, partir para diagnóstico fino daquela classe específica (ajustar headers, content-type detection, política do bucket, etc.).
4. **Se o log continuar ausente**: investigar se `storeSnapshot` está mesmo a chamar `persistThumbnailsInPayload` no bundle final (tree-shaking, dynamic import, etc.).

Não recomendo agora: B (backfill local) — não vale a pena enquanto não soubermos se o pipeline live funciona; C (mudar actor) — custo desproporcionado quando a hipótese 403 está invalidada; E (aceitar ícones) — temos `_thumbnail_base64` no payload, dá para extrair melhor UX sem persistência permanente.

### Outputs do audit

- **Confirmed failure reason**: persist-thumbnails **não emitiu log de resumo nem log de warning** no run de 14:23 UTC; bucket tem 0 objects históricos. Hipótese: a função não foi invocada no deployment que serviu o run.
- **Worker fetch blocked?** **Não.** Mesma run logou `[thumbnail-cache] prefetched 12/12 thumbnails` com os mesmos headers — Worker → IG CDN funciona quando o token IG está fresco.
- **Apify alt media?** **Não** com o actor atual (`apify/instagram-scraper`). Todos os campos apontam ao CDN do IG. Sem KV / sem download nativo.
- **Recommended path**: validar primeiro se o pipeline persist está realmente a correr em prod; só depois decidir entre backfill ou mudança.

### Next implementation prompt (se aprovado)

> "Use Build Mode. Adiciona um log de entrada `[thumbnails] start handle=... cache_key=...` na linha 206 de `src/lib/analysis/cache.ts` (imediatamente antes do `await persistThumbnailsInPayload`). Não muda mais nada. Em seguida, dispara um refresh manual de `frederico.m.carvalho` via `POST /api/analyze-public-v1?refresh=1` no domínio publicado e regista os worker logs filtrados por `[thumbnails]`. Reporta: (a) se aparece o `start`, (b) se aparece o resumo final com contadores discriminados, (c) os números exactos por categoria de falha."
