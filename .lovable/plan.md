## Situação

Verifiquei o estado actual antes de disparar o smoke test:

- Snapshot `311067c4-7de3-44e0-b0ee-d20c3a2d5004` para `frederico.m.carvalho` **continua em cache** (válido até `2026-04-29 09:58 UTC`).
- `normalized_payload.ai_insights_v1` **não existe** neste snapshot (`has_ai_insights = false`, `insights_count = 0`).
- A migration de invalidação anterior (`20260428190000`) foi aprovada, mas o snapshot voltou a aparecer — provavelmente uma chamada posterior recriou a linha com o mesmo `id`/cache_key.

Se chamasse `/api/analyze-public-v1` agora, o route ia devolver `data_source=cache` e **não** chamar a OpenAI. Isso queimava a regra "uma única tentativa" sem produzir o resultado pretendido. Por isso parei e estou a pedir aprovação antes de continuar.

## Plano (uma única passagem)

1. **Nova migration de invalidação** (`supabase/migrations/<timestamp>_reinvalidate_smoke_test_snapshot.sql`):
   ```sql
   DELETE FROM public.analysis_snapshots
   WHERE instagram_username = 'frederico.m.carvalho';
   ```
   Uso `WHERE instagram_username = ...` em vez do `id` fixo, para garantir que apanha qualquer linha actual independentemente do `id` regenerado.

2. **Confirmação pós-migration** via `supabase--read_query`:
   `SELECT count(*) FROM analysis_snapshots WHERE instagram_username = 'frederico.m.carvalho';` → tem de devolver `0`.

3. **Uma única chamada fresh** via `stack_modern--invoke-server-function`:
   `GET /api/analyze-public-v1?instagram_username=frederico.m.carvalho`
   - Sem retries.
   - Se falhar ou devolver `data_source != 'fresh'`, **paro e reporto**, não tento segunda vez.

4. **Inspecção do resultado** (apenas leitura):
   - `analysis_snapshots`: novo `id`, `has_ai_insights`, `insights_count`, `meta` (model, generated_at).
   - `provider_call_logs` (último registo OpenAI): `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `estimated_cost_usd`, `duration_ms`, `status`, `http_status`.
   - `analysis_events` (último registo): `data_source`, `outcome`, `duration_ms`, `estimated_cost_usd`.

5. **Relatório final** com o checklist exigido:
   - snapshot id
   - resumo do `ai_insights_v1` (nº de insights, modelo, generated_at)
   - linha do `provider_call_logs` (model + tokens + custo + latência)
   - latência total da análise
   - recomendação final: safe / not safe para renderizar no relatório web

## Garantias

- Zero chamadas a Apify/DataForSEO/OpenAI fora do passo 3.
- Sem segunda tentativa em caso de falha — paro e peço nova aprovação.
- Nenhum secret será impresso, registado ou exposto.
- Sem alterações em `LOCKED_FILES.md`, `/report/example`, ou no `ReportPage` bloqueado.

## Ficheiros tocados

- **Criar**: `supabase/migrations/<timestamp>_reinvalidate_smoke_test_snapshot.sql` (uma única instrução `DELETE`).
- Nenhuma outra alteração de código.

Diz **"avança"** para eu aplicar a migration e disparar a única chamada fresh.