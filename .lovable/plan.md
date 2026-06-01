# Plano — Validação mínima do `posts` mode

Não consigo executar o Lab por ti: `/api/admin/apify-lab` exige sessão de admin (cookie HTTP-only emitido pelo teu login). A chamada tem de partir do teu browser. O que faço aqui é dar-te o guião mínimo e analisar os resultados quando os colares.

## 1. Pré-flight (30 segundos)

Confirma no admin (`/admin` → Apify) ou via secrets:
- `APIFY_ENABLED = true`
- `APIFY_ALLOWLIST` contém `frederico.m.carvalho`
- `APIFY_DAILY_CAP_USD` e `APIFY_HARD_CAP_USD` com folga (>= 2 USD livres hoje)

Se algum falhar, a run é persistida com `status = blocked` e nada é cobrado — também serve como sinal, mas não valida posts mode.

## 2. Sequência das 3 runs

Em `/admin/apify-lab`, secção **Teste individual**, correr **uma de cada vez**, esperar concluir antes da seguinte (a página faz auto-refresh do histórico):

| # | handle | segment | window |
|---|---|---|---|
| 1 | frederico.m.carvalho | medium | baseline |
| 2 | frederico.m.carvalho | medium | 30d |
| 3 | frederico.m.carvalho | medium | 90d |

Total esperado: 3 chamadas reais ao Apify. Sem OpenAI, sem DataForSEO, sem snapshot, sem lead, sem email — o route só toca `apify_lab_runs` (já confirmado no código).

Cap por run já configurado: baseline 0.10 USD, 30d 0.10 USD, 90d 0.30 USD → tecto teórico ≈ 0.50 USD para as três.

## 3. O que me colares

Depois de as três correrem (ou usa "Export CSV" e cola só as 3 linhas relevantes), preciso destas colunas:

```
window | mode | resultsType | resultsLimit | onlyPostsNewerThan
| raw_items_returned | posts_extracted | newest_post_at | oldest_post_at
| observed_days | duration_ms | actual_cost_usd | estimated_cost_usd
| status | error_excerpt
```

Todas estas colunas estão no CSV novo. Se uma run falhar com 5xx, cola na mesma — o `error_excerpt` chega.

## 4. Como vou decidir (regras já acordadas)

- **Posts mode partido:** se #2 e #3 devolverem ambos exactamente 12 e os mesmos `newest_post_at`/`oldest_post_at` → paro, investigo se `apify/instagram-scraper` aceita mesmo `resultsType: "posts"` (alguns forks usam `directUrls` apenas para details; pode ser preciso `username` + `resultsType: "posts"` ou outro actor). Não autorizo a matriz completa.
- **Posts mode funciona:** se #2 e #3 tiverem `raw_items_returned` / `observed_days` claramente diferentes (ex.: 30d com ~20-40 posts e ~30 dias span, 90d com ~50-100 e ~90 dias span) → posts mode validado.
- **Risco de custo:** se #3 tiver `actual_cost_usd` muito acima do estimado (> 0.20 USD) ou `duration_ms` > 120s, sinalizo antes de autorizar a matriz 3×5.

## 5. Output que te devolvo

Quando colares:
1. Tabela limpa das 3 runs com as colunas acima.
2. Veredicto: **posts mode funciona / não funciona / inconclusivo**.
3. Recomendação: **seguro correr matriz 3×5** / **ajustar parâmetros antes** / **trocar de actor**.
4. Se aplicável, estimativa de custo total da matriz baseada no que #2 e #3 mostraram.

## Notas

- Não vou alterar produção, OpenAI, DataForSEO, snapshots, leads, emails nem analyze-public-v1.
- Não vou correr a matriz completa antes da tua confirmação após estes 3 testes.
