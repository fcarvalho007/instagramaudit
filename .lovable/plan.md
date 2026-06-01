## Objetivo

Disparar 1 refresh fresh controlado para `frederico.m.carvalho` em produção e recolher os sinais de persistência de thumbnails. Sem alterações de código, sem backfill, sem mexer em UI/fallbacks.

## Passos

1. **Baseline** — contar objetos em `post-thumbnails` e posts com `thumbnail_storage_url` no último snapshot de `frederico.m.carvalho`.
2. **Refresh fresh** — `POST https://auditprofiles.com/api/analyze-public-v1?refresh=1` com `Authorization: Bearer $INTERNAL_API_TOKEN` e `{"instagram_username":"frederico.m.carvalho"}`. Apenas 1 chamada, sem competitors.
3. **Logs do worker (published)** — extrair as duas linhas `[thumbnails] start ...` e `[thumbnails] handle=...` com os counters: `attempted`, `stored`, `failed_403`, `failed_timeout`, `failed_invalid_content_type`, `failed_upload`, `failed_other`, `avatar`, `duration_ms`.
4. **Pós-estado** — contar de novo objetos no bucket e posts com `thumbnail_storage_url` no snapshot atualizado.
5. **Recomendação final** — com base no ramo da árvore de decisão atingido (sem `start` → não invocado; `start` sem fim → aborta; `stored=0` → falha por categoria; `stored>0` + bucket cresce → OK).

## Restrições

- Apenas leitura + 1 refresh.
- Sem alterações de código, sem backfill, sem alterações a UI ou fallbacks.
- Não expor `APIFY_TOKEN`.
