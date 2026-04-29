## Smoke test controlado — chamada fresh única

### Objetivo
Validar end-to-end que o pipeline OpenAI insights persiste `ai_insights_v1` após as correções de prompt + validador (alias `average_comments` → `content_summary.average_comments`).

### Pré-condições verificadas
- Snapshot atual em DB: `386a3dbe-c7f5-4775-8daf-a5ccc947e3a6` (sem `ai_insights_v1`).
- Correções já aplicadas em `src/lib/insights/prompt.ts` e `src/lib/insights/validate.ts`.
- Modelo configurado via secret `OPENAI_INSIGHTS_MODEL` (`gpt-5.4-nano`).

### Passos (ordem estrita, sem retry)

1. **Invalidar snapshot único** via migration:
   ```sql
   DELETE FROM public.analysis_snapshots
   WHERE instagram_username = 'frederico.m.carvalho';
   ```
   Confirma que apenas 1 linha foi removida antes de avançar.

2. **Confirmar limpeza** com `supabase--read_query`:
   ```sql
   SELECT count(*) FROM analysis_snapshots
   WHERE instagram_username = 'frederico.m.carvalho';
   ```
   Tem de devolver `0`.

3. **Chamada fresh única** via `stack_modern--invoke-server-function`:
   - `POST /api/analyze-public-v1`
   - Body: `{"username":"frederico.m.carvalho"}`
   - Sem retry. Se falhar, paro e reporto.

4. **Recolha do relatório** via `supabase--read_query` (uma única bateria de SELECTs):
   - Novo snapshot id + `normalized_payload->'ai_insights_v1'` (existência, model, contagem de insights, evidence paths, source_signals, cost block).
   - Linha em `provider_call_logs` com `provider='openai'` mais recente: status, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd.
   - Linha Apify mais recente: `apify_run_id`, `actual_cost_usd`, `status`.
   - DataForSEO: contagem de calls associadas (esperado 0 ou cache).

5. **Verificação dos evidence paths**:
   - Inspeciono cada `evidence[]` no payload persistido.
   - Confirmo que aliases curtos (ex.: `average_comments`) foram normalizados para canónicos (`content_summary.average_comments`).

### Relatório final (formato fixo)
- `ai_insights_v1` persistido: ✅/❌
- número de insights: N
- model: string
- prompt_tokens / completion_tokens / total_tokens
- estimated_cost_usd
- provider_call_logs status: ok/error
- evidence paths normalizados: ✅/❌ (com lista das paths observadas)
- Apify: `apify_run_id` + `actual_cost_usd`
- DataForSEO: 0 calls / cache / N calls
- Recomendação final: SAFE / NOT SAFE para abrir a análise a qualquer perfil

### Garantias
- Apenas **uma** chamada a `/api/analyze-public-v1`.
- Sem retry automático. Se o validador rejeitar de novo, paro e reporto a causa exata sem nova chamada.
- Sem exposição de secrets ou valores sensíveis nos logs.
- Sem alterações ao código nesta fase — apenas DELETE + invocação + leituras.
