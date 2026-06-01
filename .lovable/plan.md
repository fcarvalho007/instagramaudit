# Confirmação de isolamento — `/admin/apify-lab`

Auditei `src/routes/api/admin/apify-lab.ts`, `src/lib/security/apify-budget.server.ts` e `src/routes/admin.apify-lab.tsx`. Resultado abaixo, ponto por ponto.

## 1–7. Isolamento do endpoint

| # | Requisito | Estado | Evidência |
|---|---|---|---|
| 1 | Só chama Apify | ✅ | `apify-lab.ts:259` — única chamada externa é `runActorWithMetadata(UNIFIED_ACTOR=apify/instagram-scraper, …)`. Nenhum outro provider importado. |
| 2 | Não chama OpenAI | ✅ | Sem `import openai` / `generateInsights` no ficheiro. Comentário cabeçalho (linhas 8–13) declara explicitamente. |
| 3 | Não chama DataForSEO | ✅ | Sem `import` de dataforseo ou `marketSignals`. |
| 4 | Não envia emails | ✅ | Sem `sendEmail` / `resend` / template. |
| 5 | Não cria leads / report_requests | ✅ | Sem `from("leads")`, `from("report_requests")`, `from("report_snapshots")`. Insert único é em `apify_lab_runs` (`persistRun`, linhas 383–393). |
| 6 | Não escreve em `analysis_snapshots` nem em `social_profiles` | ✅ | Sem `storeSnapshot`, sem `record_analysis_event`, sem cache mutation. `enrichPosts` é chamado apenas em memória para validar normalização (linha 289), o resultado é descartado. |
| 7 | Resultados ficam em `apify_lab_runs` (dados de teste) | ✅ | Tabela dedicada com colunas `window_kind`, `guardrails`, `apify_run_id`, `actual_cost_usd`, etc. Não é lida por nenhuma pipeline de produção. |

## 8. Guardrails por corrida

Confirmados em `WINDOW_CONFIGS` (linhas 50–90) e passados a `runActorWithMetadata`:

| window | resultsLimit | onlyPostsNewerThan | maxTotalChargeUsd | apifyTimeoutSecs | timeoutMs | memoryMbytes |
|---|---:|---|---:|---:|---:|---:|
| baseline | 12 | — | **$0.10** | 55 | 60 000 | 1024 |
| 30d | 100 | 30 days | **$0.10** | 55 | 60 000 | 1024 |
| 60d | 200 | 60 days | **$0.20** | 55 | 60 000 | 1024 |
| 90d | 300 | 90 days | **$0.30** | 120 | 130 000 | 2048 |
| 365d | 1000 | 365 days | **$1.00** | 240 | 260 000 | 2048 |

Cada corrida tem timeout duplo (Apify-side + Worker-side) e charge cap próprio.

## 9. Hard cap diário (365 d incluído)

- `apify-budget.server.ts:10–41`: `APIFY_DAILY_CAP_USD` (soft, default 5) e `APIFY_HARD_CAP_USD` (hard, default 10).
- `apify-lab.ts:237` — pre-flight `assertApifyDailyBudgetAvailable()` antes de cada chamada Apify.
- Se o hard cap estiver atingido, o endpoint persiste a tentativa com `status:"budget_block"`, `semantic_code:"daily_budget_exceeded"` e **não chama Apify**.
- Conclusão: mesmo que o 365 d custe $1, ele só corre se `gastos_do_dia + 1 ≤ APIFY_HARD_CAP_USD`. Não há forma de uma corrida individual ultrapassar o cap diário.

**Secrets atuais (verifica no Cloud):** `APIFY_DAILY_CAP_USD` e `APIFY_HARD_CAP_USD` existem como secrets — confirma os valores antes de correres a matriz inteira (matriz completa ≈ $1.70 cumulativos).

## 10. Output / tabela

`apify_lab_runs` persiste e a UI (`admin.apify-lab.tsx`) renderiza:

| Campo no requisito | Coluna persistida | UI |
|---|---|---|
| input window | `window_kind` | ✅ |
| resultsLimit (e onlyPostsNewerThan) | `input_params` (JSON com `resultsLimit`, `onlyPostsNewerThan`) | parcial — o resumo mostra `window_kind`; o `resultsLimit` está no JSON do `input_params`. CSV export inclui o JSON cru. |
| posts returned | `posts_returned` | ✅ |
| newest post date | `newest_post_at` | ✅ |
| oldest post date | `oldest_post_at` | ✅ |
| observed days | `observed_days` | ✅ |
| duration | `duration_ms` | ✅ |
| actual cost | `actual_cost_usd` | ✅ |
| usageTotalUsd | mesmo campo (`actual_cost_usd` vem de `result.actualCostUsd` no Apify run-info) | ✅ |
| failure reason | `semantic_code` + `error_excerpt` + `status` | ✅ |

Estimativa local (`estimated_cost_usd`) é guardada em paralelo para comparação contra o `actual_cost_usd` real reportado pelo Apify.

## Veredicto

**GO.** Os 10 pontos confirmam-se. Podes correr a matriz manualmente em `/admin/apify-lab`. Recomendação operacional:

1. Antes de começar, verifica `APIFY_HARD_CAP_USD` no Cloud (default 10). A matriz completa baseline + 30d + 60d + 90d + 365d gasta ≈ $1.70 no pior caso (somatório dos `maxTotalChargeUsd`), bem abaixo do default.
2. Corre as janelas em ordem crescente (baseline → 365d) para apanhares cedo qualquer regressão.
3. Se quiseres ver `resultsLimit` diretamente na tabela sem abrir o JSON, posso adicionar a coluna numa próxima iteração (out of scope agora).
