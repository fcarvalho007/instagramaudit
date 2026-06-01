## Objetivo

Correr a matriz `/admin/apify-lab` 3 handles × 4 janelas (sem 365d), exportar CSV, analisar resultados e recomendar a janela para o produto pago inicial. Sem qualquer alteração de código.

## Pré-flight (sem chamar Apify)

Os valores dos secrets (`APIFY_ENABLED`, `APIFY_ALLOWLIST`, `APIFY_DAILY_CAP_USD`) não são visíveis directamente — só os nomes. Validação indirecta:

1. `cost_daily` para `apify` hoje (2026-06-01) está a 0 USD → cap diário tem margem total.
2. Janela 90d para `frederico.m.carvalho` já correu com sucesso há horas → `APIFY_ENABLED=true` e esse handle está no allowlist.
3. Guardrails novos confirmados em `WINDOW_CONFIGS` (30d=90s/100s, 60d=120s/130s, 90d=150s/160s).
4. Para `martimsilvai` e `mariiana.ai` o allowlist não está visível. Estratégia: a primeira chamada (baseline) a cada handle revela `blocked` + `semantic_code=allowlist_block` sem custo. Se acontecer, abortamos esse handle e seguimos com os restantes; reportamos no fim.

## Ordem de execução (12 células sequenciais)

```
1.  baseline  frederico.m.carvalho
2.  baseline  martimsilvai
3.  baseline  mariiana.ai
4.  30d       frederico.m.carvalho
5.  30d       martimsilvai
6.  30d       mariiana.ai
7.  60d       frederico.m.carvalho
8.  60d       martimsilvai
9.  60d       mariiana.ai
10. 90d       frederico.m.carvalho
11. 90d       martimsilvai
12. 90d       mariiana.ai
```

Sequencial (nunca paralelo). Pausa curta entre chamadas. Cada cell via `POST /api/admin/apify-lab` com `{profile_handle, profile_segment, window_kind}`.

`profile_segment`:
- `frederico.m.carvalho` → `medium`
- `martimsilvai` → `medium`
- `mariiana.ai` → `medium`

(Sem efeito funcional; só metadado para o log.)

## Política de retry

- 1 retry apenas em: `apify_timeout`, ou HTTP 502/503 do upstream (mapeado a `apify_actor_failed`/`apify_network_error` com excerpt 502/503).
- Sem retry em: `allowlist_block`, `apify_disabled`, `daily_budget_exceeded`, `invalid_input`, `apify_actor_failed` sem 502/503.

## Custo previsto (worst case)

| Janela | $/handle est. | 3 handles |
|---|---|---|
| baseline | 0.005 | 0.015 |
| 30d | 0.05 | 0.15 |
| 60d | 0.10 | 0.30 |
| 90d | 0.15 | 0.45 |
| **Total** | | **≈ 0.92 USD** |

Bem abaixo de qualquer cap razoável.

## Recolha e exportação

Após as 12 corridas, ler `apify_lab_runs` filtrando pelos 12 IDs retornados, ordenar por `window_kind` então `profile_handle`, exportar para:

```
/mnt/documents/apify-lab-matrix-3x4.csv
```

Colunas (na ordem):

```
profile_handle, window_kind, mode, results_type, results_limit,
status, semantic_code,
raw_items_returned, posts_extracted, posts_returned,
newest_post_at, oldest_post_at, observed_days,
duration_ms, estimated_cost_usd, actual_cost_usd,
normalize_ok, error_excerpt, apify_run_id, created_at
```

## Análise entregue em chat

1. **Tabela 3×4** — por célula: `posts_extracted` / `observed_days` / `duration_ms` / `actual_cost_usd` / `status`.
2. **Custo médio por janela** (média de `actual_cost_usd` em runs `success`).
3. **Duração** — média, máx e ratio vs `timeoutMs` por janela. Sinalizar células > 80 % do timeout.
4. **Cobertura temporal** — `observed_days / window_target` (30/60/90).
5. **Falhas e timeouts** — por janela e handle, com retries aplicados.
6. **Recomendação** para a janela do produto pago inicial, com critérios:
   - cobertura ≥ 80 % do alvo em 3/3 handles;
   - p95 duração < 70 % do `timeoutMs`;
   - custo unitário compatível com pricing;
   - estabilidade (0 timeouts não recuperados).

## Garantias

- Apenas `POST /api/admin/apify-lab` é chamado (já existente).
- Nada escreve em `analysis_snapshots`, `report_snapshots`, `report_requests`, `leads`, `analysis_events`, `comment_enrichment_jobs`.
- Não chama OpenAI, DataForSEO, Brevo, Resend.
- Não envia emails.
- Não toca em `/api/analyze-public-v1`, produção, pricing, thumbnails, onboarding.
- Sem alterações de código nem migrações.

## Checkpoint

- ☐ Pré-flight indirecto OK (`cost_daily` apify hoje = 0; guardrails novos confirmados).
- ☐ 12 corridas sequenciais executadas com política de retry definida.
- ☐ Linhas correspondentes lidas de `apify_lab_runs`.
- ☐ CSV exportado para `/mnt/documents/apify-lab-matrix-3x4.csv` com `<presentation-artifact>`.
- ☐ Tabela 3×4 + métricas agregadas entregues em chat.
- ☐ Recomendação fundamentada para a janela do produto pago inicial.
- ☐ Produção, OpenAI, DataForSEO, leads, snapshots e emails intactos.
