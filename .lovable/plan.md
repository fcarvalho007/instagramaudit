# Plano — Validação controlada da pipeline de persistência de thumbnails

## Objetivo

Executar **uma única corrida fresh** para `frederico.m.carvalho`, recolher os contadores de persistência do novo pipeline e decidir entre (A) esperar rotação natural da cache, (B) backfill seletivo, (C) investigar fonte alternativa de media.

Sem alterações de código, sem migrações, sem backfill, sem mexer em gates/prompts/UI.

---

## 1. O que já está no repositório (verificado)

- `src/lib/report-snapshots/persist-thumbnails.server.ts` — implementa `persistThumbnailsInPayload`, com contadores: `attempted`, `stored`, `failed_403`, `failed_timeout`, `failed_invalid_content_type`, `failed_upload`, `failed_other`, `avatar`, `duration_ms`.
- `src/lib/analysis/cache.ts:184-198` — chama o persistor dentro de `storeSnapshot` (corre apenas em escritas fresh) e imprime no log a linha:
  `[thumbnails] handle=… cache_key=… attempted=… stored=… failed_403=… failed_timeout=… failed_invalid_content_type=… failed_upload=… failed_other=… avatar=… duration_ms=…`
- `src/routes/api/admin/refresh-profile.ts` — endpoint admin que invoca `/api/analyze-public-v1?refresh=1` com `INTERNAL_API_TOKEN`, bypassando a cache e os guards de execution mode. Tem pre-flights: `APIFY_ENABLED`, allowlist se `APIFY_TESTING_MODE`, lock por handle, sessão admin.
- `analyze-public-v1?refresh=1` (linhas 431–446 + 460): bypass de cache + bypass do stale fallback quando autenticado com o token interno. Custos Apify reais incorrem.
- Bucket público `post-thumbnails` já existe (visível em `<storage-buckets>`).
- Rendering priority em `pick-thumbnail.ts`: `thumbnail_storage_url → thumbnail_url → thumbnailUrl → null` (fallback icon). Não há alteração necessária.

## 2. Execução do teste (passos manuais via ferramentas)

1. **Estado prévio** — `supabase--read_query` para registar baseline:
   - último snapshot atual de `frederico.m.carvalho` (`id`, `created_at`, `expires_at`, contagem de `posts[*].thumbnail_storage_url` no `normalized_payload`).
   - último `provider_call_logs` para o handle (para isolar o novo `apify_run_id` após o teste).
2. **Disparar a corrida fresh** — `stack_modern--invoke-server-function` com:
   - `path: /api/admin/refresh-profile`
   - `method: POST`
   - `body: {"handle":"frederico.m.carvalho"}`
   - **Pré-requisito:** o utilizador tem de estar com sessão admin no preview (o endpoint chama `requireAdminSession`). Se não estiver, paro e peço para fazer login antes de continuar.
3. **Aguardar conclusão** (Apify costuma demorar 20–60 s para um perfil). Polling em `supabase--read_query` ao `analysis_snapshots` filtrando por `created_at > baseline`.
4. **Recolher snapshot novo** — `supabase--read_query` para extrair:
   - `id`, `created_at`, `cache_key`
   - `jsonb_array_length(normalized_payload->'posts')` → posts retornados
   - `COUNT` de posts com `thumbnail_url` não-nulo
   - `COUNT` de posts com `thumbnail_storage_url` não-nulo
   - `normalized_payload->'profile'->>'avatar_url'` (para confirmar persistência do avatar)
5. **Recolher contadores** — `stack_modern--server-function-logs` filtrando por `search: "[thumbnails] handle=frederico.m.carvalho"` no deployment correto (preview, já que o refresh corre no ambiente onde o teste é disparado). Extrair: `attempted, stored, failed_403, failed_timeout, failed_invalid_content_type, failed_upload, failed_other, avatar, duration_ms`.
6. **Custo Apify** — `supabase--read_query` ao `provider_call_logs` para o `apify_run_id` desta corrida: `estimated_cost_usd`, `actual_cost_usd`, `posts_returned`, `http_status`, `status`.
7. **OpenAI / DataForSEO** — `supabase--read_query`:
   - `enrichment_jobs` criados nos últimos 5 minutos para este snapshot (`snapshot_id` = novo) — confirma se foram agendados.
   - `provider_call_logs` com `provider IN ('openai','dataforseo')` desde o baseline — confirma se efectivamente chamaram. (Os jobs são assíncronos e podem ainda não ter corrido no momento da observação — reportar estado parcial é aceitável.)
8. **Validação visual no browser**:
   - `browser--navigate_to_sandbox` em `/analyze/frederico.m.carvalho` com viewport 1280×900.
   - `browser--list_network_requests` filtrando por `storage/v1/object/public/post-thumbnails` — contar requests 200 vs 4xx.
   - `browser--screenshot` do bloco "Melhores e piores publicações" para confirmar visualmente se aparecem imagens reais ou icons.

## 3. Constraints respeitadas (nada será tocado)

- Sem alteração ao `thumbnail_url` original (o persistor já é aditivo — só escreve `thumbnail_storage_url`).
- Sem envio de emails (a rota `/api/analyze-public-v1` não dispara emails neste caminho; o envio só ocorre via `report_requests` quando o utilizador faz o gate de lead — não vai acontecer aqui).
- Sem criação de `leads` nem `report_requests` (o gate de lead é client-side e só dispara em `/report/…`, não em `/analyze/…`).
- Sem backfill, sem mudar provider settings, sem migração, sem alteração de prompts/scoring/UI.
- Sem desactivar fallback icon (mantido tal como está).

## 4. Riscos / notas de honestidade

- **Custo real Apify** (~$0.01–0.02 para 1 perfil + ~12 posts) é incorrido. Único custo previsto.
- **Async enrichment jobs**: depois da corrida fresh, o sistema agenda jobs OpenAI/DataForSEO. Não posso impedi-los sem mexer em código (o que o utilizador proibiu). Vou apenas **reportar** se correram, em vez de bloquear.
- **Logs do worker**: `server-function-logs` pode não conter a linha `[thumbnails]` se a corrida acontecer no preview e os logs forem só da published deployment. Em caso de ausência, faço fallback para `deployment: 'preview'`.
- **Sessão admin necessária**: se a chamada ao endpoint admin devolver 401/403, paro e peço ao utilizador para autenticar no preview antes de re-disparar.

## 5. Output final que vais receber

1. **Resumo da fresh run**: snapshot id, data_source=fresh, posts retornados, duração total, apify_run_id.
2. **Tabela de contadores de thumbnail**: attempted, stored, failed_403, failed_timeout, failed_invalid_content_type, failed_upload, failed_other, avatar, duration_ms.
3. **Taxa de sucesso de thumbnail** = `stored / attempted` em %.
4. **Inventário no payload**: nº posts com `thumbnail_url`, nº posts com `thumbnail_storage_url`.
5. **Verificação visual**: nº de imagens carregadas via `post-thumbnails` (200) vs fallbacks visíveis.
6. **Custo**: `estimated_cost_usd` e `actual_cost_usd` do `provider_call_logs`.
7. **OpenAI/DataForSEO**: chamados? (sim/não/parcial, com contagem de jobs).
8. **Razões de falha dominantes** (se as houver).
9. **Recomendação GO/NO-GO**:
   - **A (esperar)** se `stored/attempted ≥ 80 %` e `failed_403 < 20 %`.
   - **B (backfill seletivo)** se taxa ≥ 80 % e há snapshots em cache afetados que justificam re-persistir só esses.
   - **C (fonte alternativa)** se `failed_403 ≥ 50 %` (CDN do IG está a rejeitar requests do nosso worker) — então o storage não resolve sozinho e é preciso outra estratégia (proxy autenticado, base64 inline, oEmbed, etc.).

## 6. Ficheiros tocados pelo plano

Nenhum. Esta tarefa é puramente de observação/medição. Se for aprovado, na execução só uso tools de leitura + uma única chamada POST admin.

## Checkpoint

- ☐ Sessão admin confirmada no preview
- ☐ Baseline registado (snapshot anterior + último provider_call_log)
- ☐ POST /api/admin/refresh-profile devolve `success: true` com `snapshot_id`
- ☐ Linha `[thumbnails]` capturada nos logs
- ☐ Counts no payload extraídos via SQL
- ☐ Network tab do preview verificado (`post-thumbnails` 200)
- ☐ Screenshot do bloco "Melhores e piores" guardado
- ☐ Custo Apify extraído
- ☐ Estado OpenAI/DataForSEO reportado
- ☐ Recomendação A/B/C entregue com critério numérico
