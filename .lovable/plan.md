# Plano: smoke test Apify Lab + recolha de dados para decisão premium

## Contexto

O `/admin/apify-lab` já está completo para este teste:
- Aceita 3 handles (um por segmento) + 5 janelas: `baseline`, `30d`, `60d`, `90d`, `365d`.
- Tem botão "Correr matriz" que executa os 3 × 5 = 15 runs em sequência, com 2s de pausa entre cada e progresso visível.
- Tem botão "Descarregar CSV" com todas as colunas pedidas (`handle`, `window`, `resultsLimit`, `onlyPostsNewerThan`, `posts_returned`, `oldest_post_at`, `newest_post_at`, `observed_days`, `duration_ms`, `actual_cost_usd`, `status`, `semantic_code`, e ainda `estimated_cost_usd`, `apify_run_id`, `normalize_ok`, `notes`, `error_excerpt`).
- Cada janela tem guardrails próprios (`maxTotalChargeUsd` 0.1 → 1.0; `apifyTimeoutSecs` 55s → 240s; memória até 2GB).

Não é preciso mexer em código. O passo é executar e recolher.

## Passos (tu corres no browser)

1. **Confirma pré-requisitos** em `/admin/sistema` (ou `/admin/apify-lab` topo):
   - `APIFY_ENABLED=true`
   - `testing_mode_active: true`
   - 3 handles na allowlist: `frederico.m.carvalho`, `martimsilvai`, `mariiana.ai`
   - cap diário 5 USD / hard cap 10 USD (já confirmado)

2. **Mapeia os handles a segmentos** no formulário do Lab. Sugestão (qualquer mapeamento serve, é só rótulo analítico):
   - `personal` → `frederico.m.carvalho`
   - `creator`  → `martimsilvai`
   - `business` → `mariiana.ai`

3. **Corre a matriz completa** com "Correr matriz" (15 runs).
   - Custo máximo teórico (soma dos `maxTotalChargeUsd` × 3 handles): 3 × (0.1 + 0.1 + 0.2 + 0.3 + 1.0) = **5.10 USD**. Está alinhado com o cap diário de 5 USD — se o cap rejeitar a última run, corre o `365d` no dia seguinte ou aumenta o cap para 6 USD temporariamente.
   - Tempo estimado: ~15 × (run + 2s) ≈ 8–15 min, dominado pelos `365d`.
   - Mantém a aba aberta; o loop é client-side.

4. **Vigia falhas** durante a corrida: se um run der `failed` ou `timeout`, anota `semantic_code` e segue. Não relances automaticamente — corro o post-mortem depois.

5. **Exporta CSV** com "Descarregar CSV" assim que terminar e cola-o (ou anexa-o) na próxima mensagem.

## O que eu faço com os dados

Para cada combinação handle × janela vou avaliar:

| Pergunta | Métricas-chave |
|---|---|
| 30/60/90d são viáveis? | `status=success`, `posts_returned`, `observed_days` ≥ janela esperada, `actual_cost_usd`, `duration_ms` |
| 365d é demasiado caro/lento? | `actual_cost_usd` vs cap, `duration_ms` vs timeout, completude (`oldest_post_at` ≈ −365d) |
| Qual a janela premium? | Custo marginal por dia adicional de histórico; saturação de `posts_returned` (curva de retorno decrescente) |
| `resultsLimit` por plano | Ratio `posts_returned / resultsLimit` por janela e perfil (saturado vs folgado) |
| `maxTotalChargeUsd` por plano | p95 do `actual_cost_usd` observado × margem de segurança 1.5× |

Output final: tabela de recomendação por plano (free / paid / premium) com janela, `resultsLimit`, `maxTotalChargeUsd` e justificação por dados.

## Riscos a vigiar

- **Conta personal sem feed** (`frederico.m.carvalho` ou `mariiana.ai` podem estar privadas/sem posts): runs vão devolver `PROFILE_PERSONAL_NO_FEED` ou similar. Não é falha do Lab; é input. Substituímos o handle se acontecer nos 3.
- **Cap diário 5 USD**: se atingires, o `365d` do 3.º handle pode ser rejeitado. Aceitável — registamos e completamos amanhã.
- **Timeouts no `365d`** (240s): se acontecer, é sinal de que `365d` em 1 run é arquitectura errada para premium e precisamos de paginação/janela acumulativa. Exactamente o que queremos descobrir.

## Checkpoint

- ☐ Confirmaste pré-requisitos no admin
- ☐ Mapeaste os 3 handles aos segmentos
- ☐ Corres "Correr matriz" (15 runs)
- ☐ Exportas e colas o CSV
- ☐ Eu devolvo tabela de viabilidade por janela + recomendação premium
