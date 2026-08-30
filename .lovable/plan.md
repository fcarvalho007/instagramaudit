# Auditoria /admin — cobertura do modelo ScrapeCreators

Resultado global: **FAIL** (2 secções conformes, 6 não conformes).

## Quadro pass/fail por secção

| Secção | Estado | Evidência |
|---|---|---|
| /admin/sistema — cartão ScrapeCreators | PASS | `scrapecreators-costs-card.tsx` ligado em `admin.sistema.tsx`; endpoints `sistema.scrapecreators.ts` e `sistema.scrapecreators-sync-balance.ts` |
| /admin/visao-geral — resumo de custos | PASS | `cost-summary-card.tsx` inclui bloco por créditos; `overview-kpis.ts` devolve `providers.scrapecreators` |
| /admin/receita — "Custos da plataforma" | FAIL | `expense-section.tsx` só conhece apify/openai/dataforseo; ScrapeCreators invisível na despesa e no gráfico diário |
| Séries diárias de custo | FAIL | `system-queries.server.ts:593,625` tipa os pontos como `apify \| openai \| dataforseo`; créditos ScrapeCreators nunca entram |
| Limite Apify no gráfico | FAIL | `DAILY_COST_LIMIT = 29 / 30` fixo em `mock-data.ts:214` (app_config já está em 4,75 — Free Plan) |
| Saúde do sistema / prontidão | FAIL | `lastCallStatus` só é invocado para apify/openai/dataforseo; sem estado ScrapeCreators |
| Segredos e configuração | FAIL | `SECRET_NAMES` (`system-queries.server.ts:429`) não inclui `SCRAPECREATORS_API_KEY`, `SCRAPECREATORS_ENABLED`, `SCRAPECREATORS_COST_PER_CREDIT_USD` |
| Diagnóstico / cockpit legado | FAIL | `diagnostics.ts` e `cost-breakdown-panel.tsx` continuam centrados em Apify; sem painel do provider primário |
| Custo por relatório | FAIL | `cost-source-labels.ts:20` `ProviderKey = apify \| dataforseo \| openai`; `report-cost-summary.server.ts` descarta linhas ScrapeCreators (daí "scrapecreators 3/6" na fiabilidade) |
| Relatórios (pipeline/métricas) | FAIL | `pipeline-section.tsx:80` diz "apify + openai"; `metrics-section.tsx` só expõe `apify_cost_usd` |

## Correcções propostas

1. **Modelo de provider partilhado** — alargar `ProviderKey` para incluir `scrapecreators`, com etiqueta "ScrapeCreators" e unidade em créditos; actualizar `normalizeProvider` e `report-cost-summary.server.ts` para o reconhecer (resolve a fiabilidade 3/6).
2. **Despesa (Receita + Visão geral)** — acrescentar ScrapeCreators a `expense-section.tsx` e às séries de `system-queries.server.ts`, mostrando créditos + equivalente USD e mantendo "custo efectivo $0" enquanto promocional.
3. **Limite Apify** — substituir `DAILY_COST_LIMIT` fixo por leitura do cap real (`cost_cap_apify_usd` = 4,75 → ~$0,16/dia) e remover a referência a $29.
4. **Saúde e segredos** — incluir ScrapeCreators em `lastCallStatus` e as três variáveis `SCRAPECREATORS_*` em `SECRET_NAMES` (apenas presença, nunca valor).
5. **Diagnóstico/cockpit** — reposicionar Apify como fallback e ScrapeCreators como primário nos painéis de diagnóstico e no cockpit legado.
6. **Relatórios** — passar a mostrar o custo por provider real em vez de "apify + openai" e `apify_cost_usd`.
7. **Testes** — cobertura para normalização do novo provider, séries diárias com créditos, cap dinâmico e presença de segredos.

## Fora de âmbito
Onboarding, relatório público, `/report.example`, pagamentos e qualquer chamada paga ao ScrapeCreators (o saldo continua a ser sincronizado só manualmente).
