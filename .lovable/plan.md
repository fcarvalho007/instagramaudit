# Auditoria custos Apify · final maio → 1 jun 2026

## TL;DR

Os custos reportados em `/admin` **não batem com a fatura Apify** para o período de faturação 26 mai → 25 jun 2026. Apify cobra **$1.35** (587 eventos × $0.0023 result). O nosso `provider_call_logs` regista apenas **$0.233 estimados** em 25 corridas com 216 posts.

A divergência tem **três causas distintas** — uma delas é provavelmente crítica (corridas não auditadas a sair do nosso domínio).

## Números lado a lado (26 mai → 1 jun 2026)

| Fonte | Corridas | "Results" | Custo |
|---|---|---|---|
| Apify dashboard (billing) | (89 recent, do mês todo) | 587 | $1.35 |
| Apify dashboard (runs visíveis no screenshot, 2026-06-01 21:01-21:09 UTC) | 11 | 369 | ~$0.79 |
| `provider_call_logs` (DB) | 25 | 216 posts | $0.233 est. / $0.00 actual |

Última corrida Apify registada na nossa DB: **2026-06-01 16:07:53 UTC**. Os 11 runs visíveis no screenshot (21:01-21:09 UTC, ~5h depois) **não existem em `provider_call_logs`**.

## Discrepâncias identificadas

### 1. Corridas Apify fora do nosso pipeline (CRÍTICO)

Apify regista 89 runs recentes; o nosso `provider_call_logs` tem 72 lifetime e zero entre 16:07 e 21:09 do dia 1/jun. Há runs reais (origem "API") que **não passam pelo nosso wrapper de logging**. Hipóteses:

- Testes ad-hoc feitos diretamente contra o Apify API com o `APIFY_TOKEN` (CLI, Postman, scripts manuais).
- Cron / scheduled actor configurado no Apify console (não no nosso `pg_cron`).
- Code path alternativo que chama Apify sem invocar a função que escreve em `provider_call_logs`.

**Impacto**: o cockpit `/admin` subestima sempre os custos Apify e os alertas de "abuso/repetição" perdem visibilidade sobre essas corridas.

### 2. Modelo de custo estimado errado

Usamos uma tabela flat ($0.011 para runs com posts, $0.005 para runs vazias). A realidade Apify é **pay-per-event** a $0.0023 por result do dataset, $0.0015 por post e $0.0008 por post details.

Mesmo recalculando o nosso `posts_returned` × $0.0023, dá $0.497 — ainda longe dos $1.35. O delta restante vem de: (a) eventos "Result" cobrados por outros itens além de posts (perfis dos competidores, comments expansion), (b) corridas não logadas (ponto 1), (c) run com timeout no screenshot ($0.09, 38 results) que pode não ter sido logada como sucesso.

### 3. `actual_cost_usd` está sempre a 0

Todas as 25 entradas têm `actual_cost_usd = 0.00`. A reconciliação com o custo real Apify (via `run.usageTotalUsd` ou webhook `ACTOR.RUN.SUCCEEDED`) não está a acontecer. Sem isto, **nunca conseguimos detetar drift entre estimativa e fatura**.

## O que verificar em `/admin` antes de mudar código

Para o utilizador confirmar manualmente:

1. Abrir `/admin` → secção custos → filtrar 26 mai → 25 jun.
2. Confirmar se o total apresentado coincide com **$0.233** (nossa estimativa) ou se já está a chamar o Apify usage API.
3. Comparar a contagem de "análises frescas" no `/admin` com as 25 corridas logadas.
4. Verificar se aparece algum alerta "estimativa vs real divergente" — provavelmente não, porque `actual_cost_usd = 0` em todas.

## Plano de correção (sequencial, em prompts separados)

### Prompt A — Identificar a fuga de logging
- Greppar `APIFY_TOKEN`, `apify-client`, `https://api.apify.com` em `src/` e `supabase/` para encontrar call sites fora de `provider_call_logs`.
- Verificar `supabase/config.toml` e `pg_cron` jobs por schedulers que invoquem Apify diretamente.
- Pedir ao utilizador para confirmar no Apify console se há "Scheduled actors" ativos ou integrações externas a usar o mesmo token.

### Prompt B — Reconciliar `actual_cost_usd`
- Cron (ou job pós-run) que chama `GET /v2/actor-runs/{runId}` e popula `actual_cost_usd` a partir de `usageTotalUsd`.
- Backfill das 72 corridas existentes.
- Adicionar alerta em `/admin` quando `abs(actual - estimated) / actual > 0.3` em janela diária.

### Prompt C — Reformular tabela de tarifas
- Substituir o flat $0.011/$0.005 por modelo pay-per-event ($0.0023 Result + $0.0015 Post + $0.0008 Post details), parametrizável via tabela `provider_pricing`.
- Recalcular `estimated_cost_usd` no momento da escrita usando `posts_returned` + `profiles_returned` + um delta seguro para events não modelados.

### Prompt D — Painel de reconciliação Apify no `/admin`
- Card "Apify billing window": estimado nosso vs `usageTotalUsd` agregado vs total da plataforma (manual, lido de secret/env mensal).
- Lista de runs com "Apify run ID conhecido mas não em `provider_call_logs`" (cross-check via `apify-client`).

## Fora de âmbito desta auditoria

- Não alterar código nesta iteração.
- Não mexer em OpenAI/DataForSEO (custos batem ordem de grandeza — $0.4101 + $0.2477 + $0.1039 + $0.009 e não há fatura externa equivalente a verificar agora).

## Checkpoint

- ☐ Apresentar findings ao utilizador
- ☐ Confirmar com utilizador se executou runs manuais contra Apify entre 16:07 e 21:09 UTC de 1/jun
- ☐ Confirmar se há scheduled actor no console Apify
- ☐ Escolher por qual prompt corretivo começar (A, B, C ou D)
