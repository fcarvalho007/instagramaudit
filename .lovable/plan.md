## Fase 2 — Snapshots de relatório (ajustes finais)

Implementar persistência imutável de `report_snapshot` no momento de unlock/request, com os ajustes pedidos.

### Mudanças vs plano anterior

1. **Renomear wrapper**
   - `persistReportSnapshotInBackground` → `ensureReportSnapshotForRequest(reportRequestId, source)`
   - Mantém-se idempotente e `await`-able.
   - Reservar `scheduleReportSnapshotPersistence(...)` como nome futuro caso venha a existir variante fire-and-forget (não criar agora).

2. **Eventos em `product_events`**
   - Já existente: `report_snapshot_persist_failed`
   - Adicionar: `report_snapshot_persisted` em caso de sucesso (apenas quando um novo snapshot é criado, não em hits de idempotência).
   - Metadata do evento de sucesso:
     - `report_request_id`
     - `report_snapshot_id`
     - `source` (`unlock` | `admin_generate` | `request_full_report`)
     - `source_analysis_snapshot_id`
     - `created` (sempre `true` neste evento)
     - `payload_schema_version`
     - `report_version`
     - `algorithm_version`
     - `expires_at` (ISO string)

3. **Comportamento não-bloqueante mantido**
   - Falha na persistência:
     - unlock/request prossegue normalmente
     - grava `report_snapshot_persist_failed` com `error_message`
     - não chama providers
     - não altera o report visível
   - Sucesso:
     - grava `report_snapshot_persisted`
     - actualiza `report_requests.report_snapshot_id` (se ainda não definido)

### Ficheiros a alterar

- `src/lib/report-snapshots/persist-report-snapshot.server.ts`
  - Renomear export `persistReportSnapshotInBackground` → `ensureReportSnapshotForRequest`
  - Adicionar emissão de `report_snapshot_persisted` no caminho de criação bem-sucedida (não em short-circuit idempotente)
  - Manter assinatura: `(reportRequestId: string, source: 'unlock' | 'admin_generate' | 'request_full_report')`

- `src/lib/report-snapshots/__tests__/persist-report-snapshot.test.ts`
  - Actualizar imports/nome
  - Adicionar teste: emite `report_snapshot_persisted` na primeira criação
  - Adicionar teste: NÃO emite `report_snapshot_persisted` em chamada duplicada (idempotente)
  - Manter testes existentes (15d expires, payload sem base64, sem chamadas a providers, idempotência, link no `report_request`)

- Call sites — actualizar nome de import e chamada:
  - `src/lib/unlock.server.ts`
  - `src/routes/api/admin/generate-beta-report.ts`
  - `src/routes/api/request-full-report.ts`

### Fora de scope (confirmado)

- Não migrar `/reports/$snapshotId`
- Não alterar `/app/reports`
- Não criar cleanup/retention job
- Não tocar Brevo/Resend
- Não chamar Apify/OpenAI/DataForSEO
- Não regenerar relatórios existentes

### Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (foco em `persist-report-snapshot.test.ts`)
- Verificar que todos os call sites compilam com o novo nome

### Entrega

- Ficheiros alterados
- Resultado de `tsc` e `vitest`
- Confirmação dos dois eventos (`report_snapshot_persisted` + `report_snapshot_persist_failed`)
- Confirmação de comportamento idempotente e não-bloqueante
