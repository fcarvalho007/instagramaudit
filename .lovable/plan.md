# Regenerar `editorial_verdict` para snapshot único — plano de execução seguro

## Auditoria

### 1. Rotas e helpers existentes

- **`POST /api/public/enrich-snapshot`** (`src/routes/api/public/enrich-snapshot.ts`) — endpoint protegido por `INTERNAL_API_TOKEN`. Processa **apenas** jobs em `enrichment_jobs` com `status='pending'` para um `snapshot_id` específico. Por tipo de job, despacha para `runEnrichment(...)`. **Não** dispara nada por si só: se não existir um job pendente para `insights_v2`, não corre `insights_v2`. **Não** chama Apify nem cascata de outras enriquezas. **Não** toca em leads, report_requests, emails, Brevo, Resend.

- **`runEnrichment` / `runInsightsV2`** (`src/lib/enrichment/run-enrichment.server.ts`, linhas 382‑425) — executa **só** `generateInsightsV2(insightsCtx, …)`. Reaproveita `caption_semantic_analysis` e `visual_cover_analysis` já existentes no payload (linhas 318‑324). Não chama Apify, DataForSEO, caption-semantic nem visual-cover.

- **Guarda crítica** (linha 401): `if (ctx.previousPayload.ai_insights_v2) { … skipping }`. Como o snapshot já tem `ai_insights_v2` (versão antiga), é obrigatório **remover** essa chave antes de criar o job, senão o runner faz no-op.

- **`removePayloadKey`** (`src/lib/analysis/cache.ts`, já importado em `enrich-snapshot.ts`) — helper atómico para apagar uma chave de `normalized_payload`.

- **`/api/admin/force-refresh`** — corre o pipeline público todo (Apify + DFS + tudo). **Não usar** — fere todas as restrições.

- **`/api/admin/regenerate-pdf`** — só PDF, não toca insights.

- **Nenhuma rota** existente regenera *só* `insights_v2` para um snapshot existente. É preciso uma sequência manual de 3 passos usando as primitivas que já existem (sem novo endpoint, sem novo código).

### 2. Caminho de execução escolhido

Reutilizar 100% do código existente (sem novo endpoint) via 3 chamadas de ferramentas:

1. **DB (insert tool, SQL `UPDATE`)** — limpar `ai_insights_v2` do payload do snapshot alvo:

   ```sql
   UPDATE public.analysis_snapshots
   SET normalized_payload = normalized_payload - 'ai_insights_v2',
       updated_at = now()
   WHERE id = '3cd9340c-da04-4fc2-a79f-235ac0a1192f';
   ```

2. **DB (insert tool, SQL `INSERT`)** — criar um único job pendente para esse snapshot:

   ```sql
   INSERT INTO public.enrichment_jobs
     (snapshot_id, handle, enrichment_type, status, priority, attempts, max_attempts)
   VALUES
     ('3cd9340c-da04-4fc2-a79f-235ac0a1192f', 'robs.cortez',
      'insights_v2', 'pending', 50, 0, 3);
   ```

3. **HTTP (invoke-server-function)** — disparar **apenas** o job acima:

   ```
   POST /api/public/enrich-snapshot
   Authorization: Bearer ${INTERNAL_API_TOKEN}
   Content-Type: application/json
   { "snapshot_id": "3cd9340c-da04-4fc2-a79f-235ac0a1192f" }
   ```

   O endpoint só vai encontrar 1 job pendente (`insights_v2`) e executá-lo. Os outros tipos (`dataforseo`, `visual_cover`, `caption_semantic`, `insights_v1`) **não** estão pendentes → não correm.

### 3. Conformidade com as restrições

| Restrição | Garantia |
|---|---|
| Sem Apify | `runEnrichment('insights_v2', …)` não chama Apify. Nenhum job `dataforseo`/`visual_cover` é criado. |
| Sem DataForSEO | Idem. `runInsightsV2` só lê `market_signals_free` do payload se já existir. |
| Sem caption-semantic | `runInsightsV2` lê do payload, não regera. |
| Sem visual-cover | Idem; usa o `visual_cover_analysis` já persistido. |
| Sem emails / Brevo / Resend | Nenhum desses serviços é tocado neste path. |
| Sem leads / report_requests | Nenhum SQL/insert nessas tabelas. |
| Sem outros snapshots | Todos os passos filtram por `id = '3cd9340c-…'` ou `snapshot_id = '3cd9340c-…'`. |
| Só `ai_insights_v2` muda | `runInsightsV2` devolve `payloadPatch = { ai_insights_v2: result.insights }` — `patchSnapshotPayload` faz merge superficial; nada mais é alterado. |

## 4. Checklist de validação

### Antes da regeneração

```sql
-- A: confirmar AUSÊNCIA de editorial_verdict
SELECT normalized_payload->'ai_insights_v2' ? 'editorial_verdict' AS has_verdict,
       normalized_payload->'ai_insights_v2'->>'version'         AS v2_version
FROM public.analysis_snapshots
WHERE id = '3cd9340c-da04-4fc2-a79f-235ac0a1192f';
-- Esperado: has_verdict = false (ou ai_insights_v2 = NULL após o UPDATE de limpeza)

-- B: confirmar que payload tem visual_cover_analysis e caption_semantic_analysis
SELECT
  normalized_payload ? 'visual_cover_analysis'      AS has_visual,
  normalized_payload ? 'caption_semantic_analysis'  AS has_caption,
  normalized_payload ? 'ai_insights_v2'             AS has_v2_before_cleanup
FROM public.analysis_snapshots
WHERE id = '3cd9340c-da04-4fc2-a79f-235ac0a1192f';

-- C: contar jobs do snapshot
SELECT enrichment_type, status, attempts
FROM public.enrichment_jobs
WHERE snapshot_id = '3cd9340c-da04-4fc2-a79f-235ac0a1192f'
ORDER BY created_at DESC;

-- D: contar provider_call_logs nas últimas 24h para esse handle
SELECT provider, count(*) FROM public.provider_call_logs
WHERE handle = 'robs.cortez' AND created_at > now() - interval '24 hours'
GROUP BY provider;
-- Esperado: registar baseline (apify/dataforseo/openai counts antes).
```

### Após a regeneração

```sql
-- 1. editorial_verdict presente
SELECT normalized_payload->'ai_insights_v2' ? 'editorial_verdict' AS has_verdict
FROM public.analysis_snapshots
WHERE id = '3cd9340c-da04-4fc2-a79f-235ac0a1192f';
-- Esperado: true

-- 2. Inspecionar o conteúdo
SELECT normalized_payload->'ai_insights_v2'->'editorial_verdict' AS verdict
FROM public.analysis_snapshots
WHERE id = '3cd9340c-da04-4fc2-a79f-235ac0a1192f';

-- 3. Job correu e ficou success
SELECT enrichment_type, status, attempts, error_message
FROM public.enrichment_jobs
WHERE snapshot_id = '3cd9340c-da04-4fc2-a79f-235ac0a1192f'
  AND enrichment_type = 'insights_v2'
ORDER BY created_at DESC LIMIT 1;
-- Esperado: status='success', error_message=NULL.

-- 4. Provider calls: APENAS openai novo
SELECT provider, count(*) FROM public.provider_call_logs
WHERE handle = 'robs.cortez' AND created_at > now() - interval '10 minutes'
GROUP BY provider;
-- Esperado: openai = 1 ; apify/dataforseo = 0.
```

### Validações de conteúdo (manuais, sobre o JSON devolvido em #2)

Aplicando `src/lib/insights/validate.ts` (já há testes em `__tests__/validate-editorial.test.ts` e `editorial-verdict-warnings.test.ts`):

- ☐ `editorial_verdict.paragraph` passa `validateEditorialVerdict` sem warnings críticos.
- ☐ Paragraph **não** contém o carácter `%` (regra do validator atual).
- ☐ Hashtags (`#…`) sanitizadas conforme `sanitize-ai-copy`.
- ☐ Claims visuais (cores, composição, faces) só presentes se `visual_cover_analysis.posts.length > 0` no payload anterior (verificado em validate.ts via `visual_evidence`).
- ☐ Sem alteração de outras chaves do payload (`profile`, `posts`, `competitors`, `market_signals_free`, `visual_cover_analysis`, `caption_semantic_analysis` intactos — comparar `jsonb_object_keys(normalized_payload)` antes/depois).
- ☐ Zero linhas novas em `report_requests`, `leads`, `report_snapshots` (timestamp filter).

## 5. Sequência exata a executar (quando autorizado em build mode)

1. `supabase--read_query` — passos A, B, C, D da secção "Antes".
2. `supabase--insert` — `UPDATE` para remover `ai_insights_v2`.
3. `supabase--insert` — `INSERT` do job `insights_v2`.
4. `stack_modern--invoke-server-function` — `POST /api/public/enrich-snapshot` com Bearer token + body `{snapshot_id}`. Esperar 200 + `{processed:1, succeeded:1, failed:0}`.
5. `stack_modern--server-function-logs --search "enrich-snapshot"` — confirmar `[enrichment] insights_v2` sem erros.
6. `supabase--read_query` — passos 1‑4 da secção "Após".
7. Reportar: snippet do `editorial_verdict.paragraph` + tabela de provider calls.

## 6. Rollback

Se a regeneração falhar:
- O `UPDATE` do passo 2 apaga o `ai_insights_v2` antigo — perda irrecuperável **a menos que** se faça backup antes:

  ```sql
  SELECT normalized_payload->'ai_insights_v2' AS backup_v2
  FROM public.analysis_snapshots
  WHERE id = '3cd9340c-da04-4fc2-a79f-235ac0a1192f';
  ```

  Guardar o JSON localmente antes do passo 2. Se necessário reverter:

  ```sql
  UPDATE public.analysis_snapshots
  SET normalized_payload = jsonb_set(normalized_payload, '{ai_insights_v2}', '<backup_json>'::jsonb)
  WHERE id = '3cd9340c-da04-4fc2-a79f-235ac0a1192f';
  ```

## Checkpoint

- ☐ Backup do `ai_insights_v2` actual capturado e guardado na resposta.
- ☐ `UPDATE` remove só `ai_insights_v2`.
- ☐ Único job `insights_v2` pendente criado.
- ☐ `POST /api/public/enrich-snapshot` corre 1 job; 0 chamadas Apify/DFS; 1 chamada OpenAI.
- ☐ `editorial_verdict` presente e válido (sem `%`, hashtags ok, claims visuais consistentes).
- ☐ Outras chaves do payload intactas; nenhum email/lead/report_request criado.
