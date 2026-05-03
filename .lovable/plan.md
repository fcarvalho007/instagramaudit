
## Situação

O código do comment scraper está correto e publicado. O log de diagnóstico (`comment scraper gate`) confirmará se `COMMENT_SCRAPER_ENABLED` é lido como `"true"` no runtime.

**Problema**: o snapshot de `frederico.m.carvalho` está em cache até **2026-05-04 08:47 UTC** (amanhã). Todas as análises fresh anteriores correram ANTES da publicação do código com os logs de diagnóstico. Como o cache está ativo, nenhuma análise fresh corre — logo o bloco do comment scraper nunca é atingido.

## Plano

### 1. Expirar o cache via migração SQL

Executar uma migração que faz `UPDATE analysis_snapshots SET expires_at = now() - interval '1 minute' WHERE instagram_username = 'frederico.m.carvalho'`.

Isto força a próxima chamada a correr como **fresh**.

### 2. Disparar análise fresh

Chamar `POST /api/analyze-public-v1` com `username=frederico.m.carvalho` — agora sem cache, o bloco do comment scraper será atingido.

### 3. Verificar nos logs

Confirmar nos server logs:
- O log `comment scraper gate` aparece com os valores de `COMMENT_SCRAPER_ENABLED`
- Se `runComments = true`, o log `comment scraper audit` também aparecerá
- Se o actor correu, haverá um registo em `provider_call_logs`

### 4. Reportar custo real

Consultar `provider_call_logs` para o actor `apify/instagram-comment-scraper` e reportar `actual_cost_usd`, `duration_ms` e `posts_returned` (comentários).

## Risco

Custo estimado: ~$0.10–$1.50 (uma execução do comment scraper + uma chamada Apify profile scraper). Guardrail de $1.50/run está ativo.
