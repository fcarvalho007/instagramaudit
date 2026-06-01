## Objetivo

Confirmar, em produção publicada, se o pipeline de persistência de thumbnails está a ser invocado e a gravar objetos em `post-thumbnails`, usando apenas o handle `frederico.m.carvalho`. Sem backfill, sem alterações de código.

## Passos

1. **Snapshot inicial (antes do refresh)**
   - Contar objetos atuais no bucket `post-thumbnails` (storage.objects).
   - Contar posts do último snapshot de `frederico.m.carvalho` com `thumbnail_storage_url` preenchido.
   - Guardar `cache_key` / `snapshot_id` atual para comparação.

2. **Disparar refresh fresh controlado**
   - Chamar o endpoint público de análise para `frederico.m.carvalho` com flag de bypass de cache (force fresh), via `stack_modern--invoke-server-function` contra a URL publicada.
   - Apenas 1 chamada. Sem competitors. Sem retries.

3. **Recolher sinais do pipeline**
   - `stack_modern--server-function-logs` (deployment=published) filtrado por `[thumbnails]`:
     - presença de `[thumbnails] start`
     - presença do resumo final `[thumbnails] handle=... stored=... skipped=... failed=...`
     - counters completos (total candidates, downloaded, uploaded, db_updated)
   - Em paralelo: logs de erro/timeout relacionados (`thumbnail`, `storage`, `post-thumbnails`).

4. **Snapshot final (depois do refresh)**
   - Reconsultar storage.objects do bucket `post-thumbnails` (diff vs. passo 1).
   - Reconsultar posts do novo snapshot com `thumbnail_storage_url` preenchido (x/12).
   - Confirmar `data_source=fresh` e novo `snapshot_id` em `analysis_events`.

5. **Diagnóstico segundo árvore de decisão acordada**
   - Sem `[thumbnails] start` → pipeline não está a ser invocado no path publicado (problema de deploy/wiring).
   - `start` sem resumo final → função aborta/hang antes de terminar (capturar último log antes do silêncio).
   - Resumo final com `stored=0` → identificar razão (download HTTP, upload storage, update DB).
   - Resumo final com `stored>0` mas bucket vazio → mismatch bucket/prefixo ou permissões.
   - `stored>0` e bucket cresce → pipeline OK; recomendar apenas aguardar rotação de cache (sem backfill).

## Entregável

Relatório único com:
- objects no bucket antes/depois
- posts com `thumbnail_storage_url` antes/depois (x/12)
- linhas de log relevantes (`start`, resumo final, counters)
- ramo da árvore de decisão atingido
- recomendação final (sem executar backfill nem alterações)

## Restrições

- Apenas leitura + 1 chamada de refresh.
- Sem alterações a `analyze-public-v1`, ao pipeline de thumbnails, ao schema, ou ao bucket.
- Sem backfill seletivo nesta fase.
