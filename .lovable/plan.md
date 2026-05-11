## Fase 1 — `report_snapshots`: ajuste do índice único

### O que já está feito (verificado no código e na BD)

- ✅ Tabela `public.report_snapshots` criada (id, instagram_username, user_id, lead_id, report_request_id, source_analysis_snapshot_id, competitor_usernames, report_payload_jsonb, payload_schema_version, report_version, algorithm_version, expires_at, expired_at, metadata, pdf_storage_path, created_at).
- ✅ `report_request_id` é nullable.
- ✅ RLS activa, com policy `Users can read own report snapshots` (`user_id = auth.uid()`). Sem INSERT/UPDATE/DELETE para `authenticated` — escrita só via service role (alinhado com "sem escrever ainda no pipeline").
- ✅ Constantes em `src/lib/report-snapshots/schema.ts`: `REPORT_PAYLOAD_SCHEMA_VERSION = "report.v1"`, `REPORT_VERSION_FREE_V1 = "free.v1"`, `ALGORITHM_VERSION_V1 = "analysis.v1"`.
- ✅ Schema Zod `ReportPayloadV1Schema` (com `httpsUrl` a barrar `data:`).
- ✅ Builder `build-report-snapshot-payload.server.ts`.
- ✅ Testes: `src/lib/report-snapshots/__tests__/build-report-snapshot-payload.test.ts` e `src/lib/report/__tests__/retention.test.ts`.
- ✅ Política de retenção centralizada (`REPORT_RETENTION_DAYS`, `CACHE_TTL_DAYS`).

### O que falta (único delta pedido)

A BD tem hoje:
- `report_snapshots_report_request_id_key` — **UNIQUE simples** sobre `report_request_id` (criada via constraint `UNIQUE`).
- `report_snapshots_report_request_id_idx` — índice btree não-único redundante.

Pretendido: **índice único parcial** que torne explícita a intenção "1 snapshot por `report_request_id`, mas vários `NULL` permitidos para snapshots manuais/admin".

### Migração

```sql
-- Remover unique constraint simples
ALTER TABLE public.report_snapshots
  DROP CONSTRAINT IF EXISTS report_snapshots_report_request_id_key;

-- Remover índice btree redundante (a versão única parcial cobre os lookups
-- que precisamos: WHERE report_request_id = $1)
DROP INDEX IF EXISTS public.report_snapshots_report_request_id_idx;

-- Índice único parcial — intenção explícita
CREATE UNIQUE INDEX report_snapshots_report_request_id_unique
  ON public.report_snapshots(report_request_id)
  WHERE report_request_id IS NOT NULL;
```

Notas:
- Em Postgres, `UNIQUE` simples já permite múltiplos `NULL`, mas o índice parcial documenta a regra e habilita o uso em `INSERT ... ON CONFLICT (report_request_id) WHERE report_request_id IS NOT NULL DO UPDATE` no futuro.
- Sem alterações de RLS, colunas, tipos, ou seeds.

### Fora de scope (confirmado pelo utilizador)

- Sem UI, sem cleanup, sem providers, sem Brevo/Resend.
- Sem escrever snapshots no pipeline ainda.
- Sem alterações em `schema.ts`, builder, constants ou testes (todos já existem).

### Validação

- Após a migração: `psql -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'report_snapshots';"` para confirmar que `report_snapshots_report_request_id_unique` é parcial e que o `_key` desapareceu.
- `bunx tsc --noEmit`
- `bunx vitest run` (testes do builder e da retenção continuam verdes)

### Entrega

- 1 migração SQL.
- Saída de `tsc` + `vitest` + `pg_indexes`.