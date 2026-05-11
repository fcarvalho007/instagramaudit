## Cleanup de `report_snapshots` expirados

Job nocturno que liberta o `report_payload_jsonb` de snapshots já fora da janela de retenção (15 dias), preservando metadata histórica e auditoria. **Não toca em `analysis_snapshots`, providers, emails ou cálculos.**

### Comportamento

1. Selecciona snapshots com `expires_at <= now()` e `expired_at IS NULL` (ainda não processados) **ou** `report_payload_jsonb IS NOT NULL` mesmo quando `expired_at` já existe (defensivo contra reprocessamento).
2. Para cada um:
   - `UPDATE`: `report_payload_jsonb = NULL`, `expired_at = now()` (se ainda não definido).
   - Mantém: `id`, `instagram_username`, `competitor_usernames`, `source_analysis_snapshot_id`, `report_request_id`, `lead_id`, `user_id`, `created_at`, `expires_at`, `report_version`, `algorithm_version`, `payload_schema_version`, `metadata`, `pdf_storage_path`.
3. Processa em **batches de 100** com limite total por execução (ex.: 1000) para evitar locks longos.
4. Idempotente: re-correr no mesmo dia não muda nada (`payload_jsonb IS NULL` filtra).

### Side-effects

- Endpoint `/api/public/report-snapshot/by-id/$snapshotId` já trata `expired = true` (visto em `report-snapshot.by-id.$snapshotId.ts:83`). Quando `report_payload_jsonb` for `null`, devolve `expired: true` com metadata mínima (sem dados).
- `/reports/$snapshotId` continua a renderizar o estado expirado existente — UI dedicada fica para refinamento futuro.
- `analysis_snapshots` permanece intacto: o fallback do endpoint legacy continua a servir reports antigos pré-Fase 2.

### Arquitectura

**Novo ficheiro: `src/lib/report-snapshots/cleanup-expired.server.ts`**
- `cleanupExpiredReportSnapshots(opts?: { batchSize?: number; maxBatches?: number; now?: Date })`
- Usa `supabaseAdmin` (service role).
- Devolve `{ ok, scanned, expiredCount, batches, durationMs, errors[] }`.
- Para cada batch processado, emite **um** `product_event` agregado:
  - `event_type: 'report_snapshots_expired_batch'`
  - `metadata: { count, snapshot_ids: [...], expires_at_min, expires_at_max, run_at }`
- Em erro de `UPDATE`: continua para o próximo batch e regista `report_snapshots_cleanup_failed` com `{ error_message, batch_index }`. Nunca lança.

**Novo endpoint: `src/routes/api/public/hooks/cleanup-expired-report-snapshots.ts`**
- `POST` protegido por `authorizeCronHook` (mesmo padrão dos outros hooks de custos).
- Chama `cleanupExpiredReportSnapshots()` e devolve o sumário JSON.
- `Cache-Control: no-store`.

**pg_cron (executado via `supabase--insert`, não migration)**
- Job: `cleanup-expired-report-snapshots`
- Schedule: `15 3 * * *` (03:15 UTC diário — fora dos picos europeus).
- Body: `{}` (handler não lê parâmetros).
- Header: `apikey` com a anon key + `Authorization: Bearer ${INTERNAL_API_TOKEN}` (consistente com os outros hooks).

### Testes

Novo `src/lib/report-snapshots/__tests__/cleanup-expired.test.ts` com mocks do Supabase admin:

1. Snapshot expirado com payload → vira `expired_at` definido + `payload_jsonb = null`.
2. Snapshot expirado já processado (`payload IS NULL`) → não é tocado.
3. Snapshot ainda dentro da retenção → ignorado.
4. Batch com vários snapshots → emite **um** evento agregado, não N.
5. Erro de update num batch → continua, regista `report_snapshots_cleanup_failed`, devolve `ok: false` mas com `expiredCount` parcial.
6. `maxBatches` respeitado — não corre indefinidamente.
7. Não chama Apify / OpenAI / DataForSEO (verificar que esses módulos não são importados).

### Out of scope (explícito)

- Não apaga registos de `report_snapshots` (mantemos a linha histórica).
- Não toca em `analysis_snapshots`, `report_requests`, PDFs no Storage.
- Não muda UI de `/reports/$snapshotId` nem `/app/reports`.
- Não regenera reports nem chama providers.
- Não cria connector novo nem secret novo (`INTERNAL_API_TOKEN` já existe).

### Validação

- `bunx tsc --noEmit`
- `bunx vitest run src/lib/report-snapshots`
- `bunx vitest run` (suite completa)
- Manual: `curl` ao endpoint com header válido → snapshot expirado de teste fica com `payload_jsonb = null` e `expired_at` preenchido.

### Checkpoint (☐)

- ☐ `cleanup-expired.server.ts` criado e testado
- ☐ Endpoint `/api/public/hooks/cleanup-expired-report-snapshots` criado
- ☐ Eventos `report_snapshots_expired_batch` / `report_snapshots_cleanup_failed` emitidos
- ☐ pg_cron agendado via `supabase--insert`
- ☐ `tsc --noEmit` limpo
- ☐ Suite vitest 100% verde
