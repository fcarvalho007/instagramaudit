## Auditoria pós-refresh — `frederico.m.carvalho`

Modo read-only, sem chamadas a providers. Cruzei `analysis_events`, `provider_call_logs` e `analysis_snapshots`.

### Resultado da última tentativa de “Atualizar agora”

A última tentativa **foi bem-sucedida**.

- **Timestamp do refresh:** 2026-05-09 11:21:15 UTC
- **`analysis_events`** linha `data_source = fresh`, `outcome = success`, `error_code = NULL`, posts=12, custo=$0.011, snapshot `683e4c21-…`, provider_call_log `3567509d-…`.
- Antes disso houve uma janela 11:17–11:20 com várias linhas `outcome = blocked_cache_only` / `error_code = CACHE_ONLY_NO_DATA` — é a fase em que o sistema estava em modo cache-only e não tinha snapshot válido. O refresh resolveu isso.

### Checklist (1–10)

| # | Pergunta | Resposta |
|---|---|---|
| 1 | Refresh chegou ao endpoint? | Sim — evento fresh registado. |
| 2 | Chegou ao Apify? | Sim — `provider_call_logs` `apify/instagram-scraper`, http 200, 9.8 s. |
| 3 | Apify devolveu run_id? | Sim — `jImT8X3FYSIaKigLF`. |
| 4 | Dataset não vazio? | Sim — `posts_returned = 12`. |
| 5 | Snapshot guardado? | Sim — snapshot `683e4c21-60e0-4045-b43a-dfcd85fe9896`, `analysis_status = ready`, 12 posts no payload, updated_at 11:25:40 (após cadeia de enrichment). |
| 6 | Cache atualizada? | Sim — `cache_key = v1:frederico.m.carvalho|`, `expires_at = 2026-05-10 11:21:17` (~24 h). |
| 7 | Cache anterior preservada em caso de falha? | N/A nesta tentativa (sucesso); estrutura mantém snapshot anterior até overwrite atómico. |
| 8 | `error_code` exato? | `NULL` — sem erro. (As linhas anteriores `CACHE_ONLY_NO_DATA` correspondem a tentativas pré-refresh, não ao refresh em si.) |
| 9 | `/analyze/:username` carrega da cache? | Sim — todos os 15 eventos mais recentes (11:39–11:42) são `data_source = cache`, `outcome = success`, duração 42–189 ms. |
| 10 | Provider call inesperado da rota pública? | Não — `provider_call_logs` após 11:25:40 está vazio. As únicas chamadas são as do refresh + cadeia de enrichment (Apify, DataForSEO, OpenAI), todas dentro da janela 11:21–11:25. |

### Cadeia de enrichment associada (todas success, http 200)

- 11:25:06 DataForSEO `google_trends_explore` — $0.009
- 11:25:13 OpenAI `insights:gpt-5.4-mini` — $0.0057
- 11:25:21 OpenAI `insights:gpt-5.4-mini` — $0.0063
- 11:25:31 OpenAI `visual-cover-analysis` — $0.0132
- 11:25:40 OpenAI `caption-semantic-analysis` — $0.0074

Custo total da operação ≈ **$0.0526**.

### Ponto exato de sucesso/falha

Sucesso end-to-end. Sem ponto de falha. Snapshot validado e a servir cache à rota pública.

### Próxima ação sugerida

Nada urgente. Opcional:

1. **Confirmar visualmente** em `/analyze/frederico.m.carvalho` (já está a servir da cache, `posts_in_payload = 12`).
2. **Cache TTL**: expira em 2026-05-10 11:21 — após essa data, o próximo acesso fará novo fresh. Se quiseres prolongar para testes, podemos rever a política de TTL noutra task.
3. As linhas `CACHE_ONLY_NO_DATA` registadas antes do refresh são ruído histórico; se quiseres, podemos adicionar um filtro no admin para esconder tentativas pré-snapshot.

Sem ações de código necessárias agora — auditoria fechada com sucesso.