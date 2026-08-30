# Admin — custos por provider e reconciliação ScrapeCreators

## 1. Reconciliação dos 41 créditos (auditoria já feita, read-only)

| Métrica | Dashboard ScrapeCreators | AuditProfiles DB | Delta | Explicação |
|---|---|---|---|---|
| Créditos consumidos all-time | 59 (100 − 41) | 19 | −40 | Chamadas fora da app: probes de paridade, scripts de validação e testes adapter-level das rondas anteriores não passam pelo registo de telemetria |
| Chamadas 24h | 63 | 6 | −57 | Mesma causa |
| Créditos 24h | 58 | 19 | −39 | Mesma causa |
| `/v1/instagram/profile` | 19 calls / 19 créditos | 2 calls / 2 créditos | −17 | Probes |
| `/v2/instagram/user/posts` | 19 / 19 | 1 / 2 | −17 | Probes |
| `/v2/instagram/post/comments` | 20 / 20 | 3 / 15 | −5 calls | Cada unlock agrupa 5 posts numa chamada com 5 créditos |
| `/v1/instagram/post/comments` (antigo) | 5 / 0 | 0 | 0 | Endpoint deprecated, só usado em probes iniciais |
| Saldo | 41 (leitura do painel) | 36 (último `credits_remaining` às 14:49) | −5 | O painel foi lido antes do último unlock; o valor local é mais recente |
| Chamadas em cache | — | 0 | — | Cache do vendor nunca devolveu custo zero |
| Sem `credits_charged` | — | 0 | — | Telemetria completa nas chamadas registadas |
| Ligadas a `analysis_event_id` | — | 3 de 6 | — | Unlocks de comentários não ligam evento de análise |

Conclusão: o delta não é bug de contabilização — é utilização fora da aplicação (QA/probes). A telemetria interna está correta para as chamadas que passam pelo adapter.

## 2. Gaps encontrados no Admin

- `cost-summary-card.tsx` e `overview-kpis.ts` só conhecem apify/openai/dataforseo; ScrapeCreators é invisível.
- Agregador de custos (`system-queries.server.ts`) tipa providers como apify/openai/dataforseo — chamadas ScrapeCreators nunca entram em nenhuma vista.
- `cost_cap_apify_usd` continua a `29` em `app_config`, e o default hardcoded também é `29`; a conta está em Free Plan ($5, soft 4.25, hard 4.75).
- Diagnostics/sistema não expõem créditos, endpoint, cache nem saldo.
- Endpoint antigo `/v1/instagram/post/comments` não é detectado.
- Custo/lead e custo/relatório não distinguem produção de lab/QA para ScrapeCreators.

## 3. O que vai ser implementado

### Modelo de custo (três conceitos separados)
- `credits_consumed` — soma de `credits_charged`.
- `actual_cash_cost_usd` — $0 enquanto os créditos forem promocionais.
- `equivalent_cost_usd` — `credits × SCRAPECREATORS_COST_PER_CREDIT_USD` (pack Freelance: 47/25000 = 0.00188).

A UI mostra sempre "Promocional — custo efectivo $0" e, em separado, "Equivalente ao tarifário: $X". O significado de `actual_cost_usd` na base de dados não muda.

### Backend
- Novo módulo `src/lib/admin/scrapecreators-costs.server.ts`: agregados 24h/7d/30d/all-time, saldo last-known + timestamp, breakdown por endpoint (calls, créditos, sucesso, erros, duração média), cache hits, split produção vs lab/QA por `source_context`, detecção do endpoint deprecated.
- Novo endpoint admin `GET /api/admin/sistema.scrapecreators` com esses dados.
- Endpoint manual `POST /api/admin/sistema.scrapecreators-sync-balance` — só invocado por clique, com confirmação explícita; nunca em mount, refresh, polling ou cron.
- Ajuste dos caps Apify: default passa a Free Plan (soft 4.25 / hard 4.75) e o valor `29` em `app_config` é actualizado.

### Frontend
- `cost-summary-card.tsx` (Visão geral): bloco ScrapeCreators credit-based (créditos 30d, saldo last-known, custo efectivo $0, equivalente) ao lado dos blocos USD de Apify/OpenAI/DataForSEO, com o cap Apify correcto.
- Nova secção "Providers & Custos" em `/admin/sistema`: estado, papel primário, saldo com "actualizado há X", créditos 24h/7d/30d, calls, taxa de sucesso, cache, última chamada, equivalente e tabela por endpoint, com marca `deprecated` e alerta para `/v1/instagram/post/comments`.
- Botão "Sincronizar saldo" com diálogo: "Esta consulta ao ScrapeCreators consome 1 crédito. Continuar?".
- Unit economics: créditos médios por auditoria fresh, por Comment Intelligence e por lead convertido, mais equivalente USD e poupança de cache — excluindo lab/QA.
- Reconciliação saldo provider vs saldo esperado pelos logs, com semáforo verde (0) / amarelo (1–2) / vermelho (>2) e nota de que o delta pode ser uso externo.

### Testes
Testes unitários para: saldo last-known, agregação de créditos, chamadas com 0 créditos, custo efectivo $0, cálculo do equivalente, Apify em USD, exclusão de lab/QA, detecção do endpoint deprecated. Verificação em browser de que abrir/refrescar o Admin não faz nenhuma chamada ao ScrapeCreators e que o sync manual exige confirmação e corre uma vez.

## 4. Fora de âmbito
Onboarding, relatório público, pagamentos, remoção da Apify (continua como fallback) e qualquer exposição da chave do ScrapeCreators.
