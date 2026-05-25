## Objetivo

Validação controlada do `editorial_verdict` (Bloco 1) em 3 perfis reais, com custo mínimo e sem mexer em leads/emails.

## Estado atual confirmado

Snapshot DB:
- `robs.cortez` — snapshot de 25/05 16:00, **sem `ai_insights_v2`** → sem `editorial_verdict`.
- `frederico.m.carvalho` — snapshot de 25/05 13:58, **sem `ai_insights_v2`** → sem `editorial_verdict`.
- `martimsilvai` — sem snapshot.

Implicação: nenhum dos snapshots existentes carrega o novo verdict. A UI mostrará o fallback determinístico (`editorial-verdict-fallback.ts`). Para validar o verdict **real gerado por OpenAI v2** é obrigatório forçar pelo menos 1 geração fresca por perfil. Sem isso, a validação é apenas do fallback.

## Estratégia (respeita o limite "máx. 3 fresh")

Plano em 2 fases, ambas read-only do lado do operador.

### Fase A — validar fallback nos snapshots existentes (custo 0 €)

1. Carregar `/analyze/robs.cortez` e `/analyze/frederico.m.carvalho` no preview.
2. Inspecionar Bloco 1 e confirmar:
   - Hero renderiza via `editorial-verdict-fallback.ts` (sem AI verdict).
   - KPI strip não é duplicada no Hero.
   - Cadência usa cópia método-específica (já validada).
3. Capturar screenshot do estado fallback (baseline visual).

Sem chamada Apify/OpenAI, sem mutação.

### Fase B — gerar 3 verdicts reais (1 por perfil, custo controlado)

Forçar `force_refresh=true` (ou equivalente do enrichment) para os 3 perfis, **uma vez cada**:

1. `robs.cortez` — alvo principal: validar que o verdict não cita "pinned" e respeita cadência `window_30d` (`sufficient=true`, `pinnedExcluded=2`).
2. `frederico.m.carvalho` — perfil interno conhecido, sample baseline.
3. Terceiro perfil — **só executar se** `APIFY_TESTING_MODE=false` confirmado em `app_config`. Verificar antes da execução; se `true`, fica em 2 perfis e regista-se a razão.

Para cada execução, recolher do snapshot recém-criado:

```sql
SELECT
  instagram_username,
  report_payload_jsonb->'data_source' AS data_source,
  (report_payload_jsonb->'ai_insights_v2') IS NOT NULL AS openai_v2_ran,
  report_payload_jsonb->'ai_insights_v2'->'editorial_verdict' AS verdict,
  report_payload_jsonb->'ai_insights_v2'->'editorial_verdict'->>'title' AS title,
  report_payload_jsonb->'ai_insights_v2'->'editorial_verdict'->>'priority' AS priority,
  report_payload_jsonb->'ai_insights_v2'->'editorial_verdict'->>'confidence' AS confidence,
  report_payload_jsonb->'ai_insights_v2'->'editorial_verdict'->'warnings' AS warnings
FROM report_snapshots
WHERE lower(instagram_username) = $1
ORDER BY created_at DESC LIMIT 1;
```

Cruzar com `provider_call_logs` (mesmo `report_request_id` ou janela temporal) para custo OpenAI estimado:

```sql
SELECT provider, model, cost_usd, total_tokens, created_at
FROM provider_call_logs
WHERE created_at > now() - interval '10 minutes'
ORDER BY created_at DESC;
```

### Pré-checks antes da Fase B (obrigatórios)

- `SELECT key, value FROM app_config WHERE key IN ('APIFY_ENABLED','APIFY_TESTING_MODE','APIFY_ALLOWLIST')` — confirmar kill-switch ligado e allowlist contém os 3 usernames; se perfil externo não estiver na allowlist e `APIFY_TESTING_MODE=true`, abortar esse perfil.
- Confirmar saldo Apify + créditos OpenAI suficientes (`cost_daily` últimas 24h).
- Confirmar `editorial_verdict` está mesmo no schema validado por `validate-v2.ts` (já está, verificado em iteração anterior).

## Matriz de avaliação por perfil

Para cada perfil produzir tabela:

| Campo | Valor |
|---|---|
| data_source | cache \| fresh |
| openai_v2_ran | sim/não |
| editorial_verdict presente | sim/não |
| title | … |
| paragraph (80–220 palavras) | … |
| word_count | n |
| priority | … |
| strengths[] | … |
| limitations[] | … |
| confidence | low/medium/high |
| warnings[] | … |
| contradiz KPI visível? | sim/não + qual |
| custo OpenAI estimado (USD) | … |
| Bloco 1 evita repetir KPI strip? | sim/não |

## Critérios de qualidade (score 1–5)

1. **Linguagem diagnóstica, não prescritiva** (sem "deve", "precisa", "tem de").
2. **Paragraph 80–220 palavras** e não duplica números já visíveis no KPI strip.
3. **Coerência com cadência corrigida** (sem afirmar "baixa cadência" se `sufficient=true, weekly≥1`; sem mencionar pinned se `pinnedExcluded>0`).
4. **strengths/limitations** específicos e ancorados em sinais reais.
5. **confidence/warnings** condizentes com `reliability` da cadência e sample size.

GO se ≥4/5 nos 3 perfis e zero contradições factuais. NO-GO se houver qualquer alucinação de KPI ou violação das regras de cadência.

## Entregáveis

1. Tabela por perfil (3×).
2. Texto integral do `editorial_verdict` por perfil.
3. Quality score 1–5 com justificação.
4. Lista de issues encontrados.
5. Recomendações concretas de refinamento de prompt/schema (se aplicável).
6. Decisão GO/NO-GO com condições.

## Restrições honradas

- Máx. 3 análises frescas (1 por perfil; perfil externo só com `APIFY_TESTING_MODE=false`).
- Snapshots cache reutilizados na Fase A.
- Sem envio de emails (não toco em Resend nem em fluxos transacionais).
- Sem mutação de `leads`.
- Sem alteração de prompts/schema nesta tarefa (só recomendações).

## Ficheiros tocados

Nenhum. Tarefa é puramente de execução/observação + relatório final em chat.

## Próximo passo

Aguardo aprovação para mudar para Build Mode e executar Fase A → pré-checks → Fase B → relatório.