# Auditoria Apify — auditoria inicial sem email + Comment Intelligence como segundo nível

Auditoria de código, sem alterações. Respostas às perguntas, seguidas de incompatibilidades, alterações mínimas, riscos e plano.

## 1. Estado actual

### Runs Apify numa auditoria baseline (sem concorrentes)
- **1 run garantido**: `apify/instagram-scraper` (perfil + posts) — `src/routes/api/analyze-public-v1.ts:304-332`, invocado em `:1163-1187`.
- **+1 run opcional**: `apify/instagram-comment-scraper`, só se `COMMENT_SCRAPER_ENABLED=true` (ou override de teste interno) — `:1553-1619`. Por defeito está **desligado**.
- Cada concorrente adicionado = +1 run (já restrito a Pro, `report_full_9`).
- Os restantes enrichments (`dataforseo`, `insights_v1/v2`, `visual_cover`, `caption_semantic`, `comparison_readings`) são linhas em `enrichment_jobs` e não chamam actors Apify.

**Baseline hoje: 1 run (comment scraper off) ou 2 runs (comment scraper on).**

### Chamadas Apify antes de recolher o email
Nenhuma. Hoje o email é **obrigatório antes de qualquer análise**: `analyze-public-v1.ts:601-612` devolve `ONBOARDING_REQUIRED` se não houver `lead_session`, antes da cache negativa, do `reserveCredit` e de qualquer chamada ao provider. Ou seja, o produto actual é o inverso do objectivo: o gate de email está no nível 1, não no nível 2.

### Quando corre o Comment Scraper
Três caminhos, todos por trás do mesmo gate:
1. Fire-and-forget no fim da análise base — insere linha em `comment_enrichment_jobs` (status `pending`) e faz `fetch` não-aguardado a `/api/public/enrich-comments` (`analyze-public-v1.ts:1580-1588`).
2. Top-up pós-pagamento — `enqueueCommentScrapingForPayment` em `src/lib/enrichment/enqueue-paid.server.ts:182-283`, que cria o job para um snapshot **já existente** (por `cache_key`) sem repetir o scraping base.
3. Rede de segurança por `pg_cron` — modo `{ sweep: true }` em `src/routes/api/public/enrich-comments.ts:255-269`, que apanha jobs `pending` com mais de 60s.

### Dependência do relatório base
Não existe. `comment_intelligence` é lido com `?? null` (`src/lib/report/snapshot-to-report-data.ts:1910`), sanitizado como campo opcional (`src/lib/report/sanitize-snapshot.ts:26`) e a UI tem estado dedicado `CommentIntelligenceUnavailable` (`report-comment-intelligence.tsx:259`); o diagnóstico usa `commentIntel?.available ? ... : 0` (`report-diagnostic-card.tsx:632`).

### Servir o relatório base com `COMMENT_SCRAPER_ENABLED=false`
Sim, sem alterações. A flag é independente do gate do scraper base (`apify-allowlist.ts`), o default é `false`, e nesse caso `enrichment_status.comments` fica `"disabled"` e a resposta segue `success: true` (`analyze-public-v1.ts:1616-1618`).

### Superfície de controlo do Comment Scraper
- Ficheiro central: `src/lib/analysis/comment-scraper.server.ts` — `shouldRunCommentScraper()` (:132), `planCommentBudget()` (:169), `fetchCommentsForPosts()` (:222).
- Env: `COMMENT_SCRAPER_ENABLED`, `COMMENT_SCRAPER_INTERNAL_TEST`, `COMMENT_SCRAPER_MAX_POSTS` (12, clamp 1-12), `COMMENT_SCRAPER_PER_POST_LIMIT` (10, clamp 1-50), `COMMENT_SCRAPER_MAX_TOTAL_RESULTS` (120, tecto ~105), `COMMENT_SCRAPER_MAX_CHARGE_USD` (0.20, tecto rígido 0.20).
- Constante hardcoded: `COMMENT_SCRAPER_INCLUDE_REPLIES = true` (:81).
- Fila: tabela `comment_enrichment_jobs` (`pending → processing → completed|failed`, `attempts`, `MAX_ATTEMPTS=3`).
- Estado no payload: `enrichment_status.comments` ∈ `pending | success | error | skipped | disabled`, escrito por `setEnrichmentStatusAtomic` (`cache.ts:106-126`).
- Endpoints: `/api/public/enrich-comments` (Bearer `INTERNAL_API_TOKEN`), admin `src/routes/api/admin/sistema.comment-scraper.ts` + card `comment-scraper-card.tsx`.

### Correr o Comment Scraper mais tarde sobre um snapshot existente
**Sim, já é tecnicamente suportado.** `enqueueCommentScrapingForPayment` (`enqueue-paid.server.ts:182`) selecciona os posts do payload por nº de comentários, cria o job e dispara `/api/public/enrich-comments`, que faz `patchSnapshot` do `normalized_payload` (`enrich-comments.ts:43-74`) sem tocar no scraping base. É idempotente (curto-circuita se já houver `comment_intelligence.available` ou job pendente). O que falta é apenas um gatilho ligado à submissão de nome + email em vez de a um pagamento.

### Cache
- Chave determinística `(handle, concorrentes ordenados, janela)` — `cache.ts:49-60`; TTL 24h (`CACHE_TTL_MS`), `isFresh()` :163.
- Duas análises repetidas do mesmo perfil dentro de 24h → **zero** chamadas Apify (retorno antecipado antes do provider).
- Cache negativa de 24h para `PROFILE_PRIVATE` / `PROFILE_PERSONAL_NO_FEED` via `analysis_events` (`analyze-public-v1.ts:990-1025`).
- `force_refresh` é Pro-only e ignora a cache.
- Tolerância stale de 15 dias serve snapshots antigos em caso de erro do provider.

### Concorrência
Não existe qualquer semáforo, fila global ou lock de "runs em voo". Só há tectos em USD (`apify-budget.server.ts`: `APIFY_DAILY_CAP_USD=5`, `APIFY_HARD_CAP_USD=10`, `APIFY_90D_DAILY_CAP_USD=5.5`), rate-limit por IP/dia e `MAX_JOBS_PER_SWEEP=10` (sequencial). Nada impede N pedidos simultâneos de dispararem N runs Apify em paralelo — não há consciência do limite de 5 runs concorrentes do Free.

### Pressupostos de plano pago
- `memoryMbytes = 1024` por defeito (`apify-client.ts:111,257`).
- `maxTotalChargeUsd` assume metadados de billing pay-per-result.
- `includeNestedComments: true` assume funcionalidade hoje exclusiva de paying users.
- Tectos de custo desenhados para ~$0.20/análise de comentários, ou seja **~25 análises esgotam os $5/mês** do Free.
- Não há proxies residenciais nem strings "Starter" no código.

### `includeNestedComments`
Passado em `comment-scraper.server.ts:275`. Dependem das replies:
- `comment-intelligence.ts:239-261` (loop `comment.replies`), que alimenta `ownerRepliesCount`, `ownerReplyRatePct`, `postsWithOwnerReplyPct`, `postsWithConversationPct` (:320-334, :372-374) e `recommendedConversationAction` (:351-357).
- UI: `report-comment-intelligence.tsx:84,149,392,465-467`; `report-diagnostic-card.tsx:632,1255` (`repliesIsAlert = ownerReplies === 0`).

**Impacto de `false`**: como as marcas respondem quase sempre dentro da thread, `ownerRepliesCount` colapsaria para ~0 na maioria dos perfis. Resultado: falso alerta sistemático de "não responde", taxa de resposta enganosa e recomendações erradas. É uma regressão de credibilidade, não apenas de riqueza.

### `COST_PER_RESULT_USD = 0.0019`
Usado **apenas** dentro de `comment-scraper.server.ts` (:44, :77, :180, :194) — no cálculo de `COMMENT_SCRAPER_MAX_TOTAL_RESULTS` e no clamp do `perPostLimit`/estimativa em `planCommentBudget`. Não é importado noutro lado. `estimateApifyCost()` (`cost.ts:47-56`) é um modelo separado, por perfil/post, do scraper base. As estimativas dos comentários chegam ao admin via `recordProviderCall` em `enrich-comments.ts:133-147,195-207` e são reconciliadas por `/api/public/hooks/sync-apify-costs.ts`.

Com $0.0023 real, tudo o que hoje se calcula fica **~21% subestimado**: o tecto de resultados passa de ~105 para ~86, e o `estimatedMaxCostUsd` mostrado ao admin fica abaixo do custo verdadeiro.

### Redução para 3 posts × 5 comentários
Viável e sem código novo — basta `COMMENT_SCRAPER_MAX_POSTS=3` e `COMMENT_SCRAPER_PER_POST_LIMIT=5`. 15 resultados ≈ **$0.0345** a $0.0023 (vs ~$0.28 hoje a preço real com 12×10). `budgetBlocked` continua falso.
Limitação: `aggregateCommentIntelligence` **não tem qualquer limiar mínimo de amostra**. Com 3 posts, as percentagens têm denominador 3, `topConversationPosts` passa a ser literalmente todos os posts e `classifiedExcerpts` fica escasso — degrada em silêncio, sem marcar baixa confiança. O estado `unavailable` só é atingido por falha upstream.

## 2. Incompatibilidades com o objectivo

| # | Incompatibilidade | Origem |
|---|---|---|
| I1 | O nível 1 exige email hoje (`ONBOARDING_REQUIRED` antes de qualquer provider) | `analyze-public-v1.ts:601-612` |
| I2 | O comment scraper dispara junto com a análise base, não após o email | `analyze-public-v1.ts:1553-1619` |
| I3 | O único gatilho tardio existente está ligado a pagamento, não a lead | `enqueue-paid.server.ts:182` |
| I4 | `includeNestedComments: true` é feature de paying user | `comment-scraper.server.ts:81,275` |
| I5 | Custo por resultado desactualizado ($0.0019 vs $0.0023) | `comment-scraper.server.ts:44` |
| I6 | Orçamento por análise ($0.20) esgota os $5/mês em ~25 análises | `comment-scraper.server.ts:50` |
| I7 | Zero protecção contra >5 runs Apify concorrentes | ausência em `apify-client.ts` |
| I8 | Agregação sem limiar de amostra mínima para 3×5 | `comment-intelligence.ts:115-395` |

## 3. Alterações mínimas necessárias

1. **Desacoplar email do nível 1** — permitir a análise base sem `lead_session` (nível 1 anónimo), mantendo rate-limit por IP e cache; o `ONBOARDING_REQUIRED` passa a proteger apenas o nível 2.
2. **Remover o disparo de comentários do fluxo base** — em `analyze-public-v1.ts`, deixar sempre `enrichment_status.comments = "locked"` no nível 1.
3. **Novo gatilho por lead** — generalizar `enqueueCommentScrapingForPayment` para `enqueueCommentScrapingForSnapshot(snapshotId | cacheKey)` e invocá-lo a partir do endpoint que grava nome + email. Zero risco de duplicar scraping base (já é idempotente).
4. **Ajustar constantes de custo** — `COST_PER_RESULT_USD = 0.0023`; rever `COMMENT_SCRAPER_MAX_TOTAL_RESULTS` e o tecto rígido em função do orçamento mensal de $5.
5. **Perfil Free por env** — `COMMENT_SCRAPER_MAX_POSTS=3`, `COMMENT_SCRAPER_PER_POST_LIMIT=5`, `COMMENT_SCRAPER_MAX_CHARGE_USD≈0.05`.
6. **`includeNestedComments`** — tornar configurável por env (`COMMENT_SCRAPER_INCLUDE_REPLIES`), default `false` no Free, e degradar honestamente as métricas de resposta do owner quando as replies não estão disponíveis (mostrar "não medível" em vez de 0).
7. **Limitador de concorrência** — lock leve em BD (contagem de runs `processing`/`in-flight`) com limite de 4, e enfileiramento em vez de falha quando excedido.
8. **Limiar de confiança na agregação** — marcar `lowConfidence` quando `samplePosts < 5` ou total de comentários < 20, e refletir isso na copy.

## 4. Riscos

- **Abuso do nível 1 anónimo**: sem email, cada visitante pode queimar runs Apify. Mitigação obrigatória: rate-limit por IP mais apertado + cache 24h + allowlist/captcha se necessário.
- **Crédito Free esgotado**: mesmo a $0.0345/análise de comentários, o scraper base também consome. Precisa de um tecto mensal explícito, não só diário.
- **Perda de sinal com `includeNestedComments=false`**: métricas de resposta do owner deixam de ser fiáveis; se forem apresentadas como 0, é enganador.
- **Amostra 3×5**: percentagens instáveis; risco de recomendações erradas se a copy não sinalizar a limitação.
- **Concorrência**: sem limitador, um pico simultâneo devolve erros Apify que hoje seriam classificados como `UPSTREAM_FAILED`.
- **Snapshots antigos**: leads que submetem email sobre um snapshot com >24h vão enriquecer comentários sobre dados base já desactualizados.

## 5. Plano de implementação sugerido

**Fase 0 — travagem de custo (imediata, sem risco de produto)**
- Corrigir `COST_PER_RESULT_USD` para 0.0023 e recalcular tectos.
- Definir o perfil Free por env (3 posts × 5 comentários, cap ~$0.05).
- Confirmar `COMMENT_SCRAPER_ENABLED=false` enquanto o nível 2 não existir.

**Fase 1 — nível 1 anónimo**
- Tornar a `lead_session` opcional em `analyze-public-v1.ts`, com rate-limit por IP reforçado.
- Marcar `enrichment_status.comments = "locked"` e adaptar a UI para mostrar Comment Intelligence como bloco desbloqueável.

**Fase 2 — nível 2 com nome + email**
- Extrair `enqueueCommentScrapingForSnapshot` a partir do código pago existente.
- Endpoint de captura de lead: grava lead, associa ao snapshot, chama o enqueue e devolve estado `pending`.
- Polling/refresh do bloco de comentários no relatório até `success`/`error`.

**Fase 3 — robustez Free**
- Limitador de concorrência (máx. 4 runs) com fila.
- `includeNestedComments` configurável + degradação honesta das métricas de replies.
- Flag `lowConfidence` na agregação e copy correspondente.
- Painel admin: consumo mensal Apify vs $5, nº de desbloqueios de nível 2, custo médio por desbloqueio.

**Fase 4 — validação**
- Teste E2E: análise anónima → 1 run; submissão de email → 1 run adicional; repetição do mesmo perfil → 0 runs.
- Reconciliação de custo real via `sync-apify-costs` após 10 análises reais.
