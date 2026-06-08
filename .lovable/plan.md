# Persistir avatars e thumbnails de concorrentes em Storage

Reaproveitar a infra atual (`persistThumbnailsInPayload` + bucket `post-thumbnails`) para o lado do concorrente. Aditivo, best-effort, sem schema, sem provider calls, sem mexer em pricing/checkout.

## Mudanças

### 1. `src/lib/report-snapshots/persist-thumbnails.server.ts`
Após persistir o primário (posts + avatar), iterar `payload.competitors[]`:

- Para cada entrada com `success === true` e `profile.avatar_url` que seja IG CDN: chamar `persistOne(...)` com path `competitors/{safeUsername || idx}/avatar` e escrever resultado em `profile.avatar_storage_url`. Aditivo — nunca remover `avatar_url`.
- Para os primeiros **12** posts em `competitor.posts[]` com `thumbnail_url` IG CDN: persistir em `competitors/{safeUsername || idx}/{shortcode|id|idx}` e escrever `post.thumbnail_storage_url`. Mesma helper `persistOne`, mesmo `mapWithConcurrency` (CONCURRENCY=4 partilhado por concorrente).
- Estender `PersistSummary` com `competitors_attempted`, `competitors_stored`, `competitors_avatar_ok`, `competitors_avatar_fail` (campos opcionais para não partir testes existentes; preencher sempre que houver concorrentes). Logging adicional em `cache.ts` para visibilidade.
- Continuar best-effort: cada falha individual fica `null` e o componente cai no fallback.

### 2. `src/routes/api/analyze-public-v1.ts` (linhas ~1168-1178)
Remover `thumbnail_storage_url: _s` do destructure que sanitiza posts de concorrente. Os outros campos (`coauthors`, `tagged_users`, `location_name`) continuam strip por opção editorial. Resultado: `thumbnail_storage_url` (escrito mais à frente em `storeSnapshot` → `persistThumbnailsInPayload`) sobrevive no payload guardado.

### 3. `src/lib/report/snapshot-to-report-data.ts`
- **Primário** (linhas ~1698-1703): `enrichedAvatarUrl` passa a tentar `payload.profile.avatar_storage_url` antes de `avatar_url`. Pequena mudança defensiva.
- **Competitor avatars**: `pickAvatarUrl` (linha 547) já tenta `avatar_storage_url` primeiro — nenhuma mudança.
- **Competitor post thumbnails**: já passam por `pickThumbnailUrl` nos componentes (top-post compare etc.), que prefere `thumbnail_storage_url`. O passthrough `c.posts as unknown[]` no `competitorBreakdown` (linha 1477-1479) preserva o campo automaticamente.

### 4. Fallback (sem alterações de UI)
Ordem garantida pela `pickAvatarUrl` / `pickThumbnailUrl` existentes:
- Avatar: `avatar_storage_url` → `avatar_url` → iniciais
- Thumbnail: `thumbnail_storage_url` → `thumbnail_url` / `display_url` → placeholder

### 5. Testes
- Atualizar `src/lib/report-snapshots/__tests__/persist-thumbnails.test.ts` com 1 cenário extra: payload com `competitors[]` (1 com avatar IG + 2 posts) verifica que `avatar_storage_url` e `thumbnail_storage_url` são escritos quando o mock devolve OK, e ficam `null` em 403 sem partir.
- Sem teste novo de integração — o caminho `storeSnapshot` é o mesmo.

## Não-objectivos (explícitos)
- Sem chamadas a Apify nem ao IG durante a implementação (validação por unit test).
- Sem schema/migração.
- Sem mexer em créditos, checkout, EuPago, entitlements, Free/Public.
- Sem redesign de componentes — apenas wiring de dados.
- Posts além dos 12 primeiros do concorrente: não persistir (limite explícito para manter custo previsível).

## Validação
- `bun run typecheck` passa.
- Snapshots primários: comportamento inalterado (mesmas chaves, mesmos limites).
- `competitorBreakdown[i].avatarUrl` resolve para URL do bucket quando disponível.
- `competitor.posts[j].thumbnail_storage_url` sobrevive ao snapshot quando o upload teve sucesso.
- Falha de storage não rebenta a resposta; falls back para CDN e iniciais.
- Sem reintrodução de 0% enganador — empty states atuais preservados.
