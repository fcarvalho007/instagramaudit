## Fase 2 — Persistir `report_snapshots` no momento do unlock/pedido

### Objectivo

Sempre que um `report_request` é criado (ou ligado a um `analysis_snapshot`), capturar **um** snapshot histórico imutável e ligar `report_requests.report_snapshot_id`. Sem alterar o report visível, sem providers, sem cleanup.

### Decisão sobre falha de persistência

**Não-bloqueante na Fase 2.** Critério: o unlock continua a ter sucesso (UX), mas qualquer falha emite `product_event` tipo `report_snapshot_persist_failed` com detalhe. Justificação:

- Phase 1 ainda não tem consumidores que dependam do snapshot histórico — `/reports/$snapshotId` continua a ler `analysis_snapshots`.
- Bloquear unlock por falha de snapshot historiza pioraria UX sem benefício imediato.
- O evento de falha permite alertar / backfill manual antes de promover a bloqueante na Fase 3.

### Fluxos identificados

| # | Fluxo | Ficheiro | Onde nasce/atribui `analysis_snapshot_id` | Acção |
|---|-------|----------|-------------------------------------------|-------|
| 1 | Public unlock | `src/lib/unlock.server.ts` | Linha 317 (insert RR) e merge na linha 311 | Chamar `ensureReportSnapshotForRequest` no fim do try, depois de `reportRequestId` resolvido (cobre INSERT, UPDATE/merge e race 23505) |
| 2 | Beta request flow | `src/routes/api/request-full-report.ts` | Linha 271 (insert RR já com `analysis_snapshot_id` validado) | Chamar `ensureReportSnapshotForRequest` logo após o insert OK, antes do `runInBackground(runReportPipeline)` |
| 3 | Admin gerar relatório beta | `src/routes/api/admin/generate-beta-report.ts` | Linha 185-196 (UPDATE liga `analysis_snapshot_id` quando análise corre com sucesso) | Chamar `ensureReportSnapshotForRequest` depois do UPDATE de `completed`, antes do `product_events.insert` |
| 4 | PDF/email pipeline | `src/lib/orchestration/run-report-pipeline.ts`, `src/routes/api/generate-report-pdf.ts`, `src/routes/api/send-report-email.ts` | Não cria nem altera `analysis_snapshot_id`; só lê do RR | **Sem alterações.** O snapshot já foi persistido a montante. Documentar no header do orquestrador. |

Outros pontos (`tracking.functions.ts`, `lead-timeline`, `automation-flow`, `feedback`, `resend-email`, `regenerate-pdf`, `report-requests` admin endpoints, `follow-ups`, `send-report-link`, etc.) só lêem ou actualizam metadata/status — **não** criam novo `analysis_snapshot_id` nem `report_request` novo, logo não persistem snapshot. Confirmado pelo grep.

### Helper novo: `src/lib/report-snapshots/persist-report-snapshot.server.ts`

```ts
ensureReportSnapshotForRequest(reportRequestId): Promise<{
  snapshotId: string | null;
  created: boolean;
  reason?: "missing_request" | "missing_analysis_snapshot" | "build_error" | "insert_error";
}>
```

Comportamento (não lança):

1. SELECT em `report_requests` por id: `id, lead_id, user_id, instagram_username, competitor_usernames, analysis_snapshot_id, report_snapshot_id`.
2. Se `report_snapshot_id` presente → `{ snapshotId, created: false }`.
3. Se `analysis_snapshot_id` ausente → `{ snapshotId: null, created: false, reason: "missing_analysis_snapshot" }` (caso de unlock pré-análise; nada a fazer agora).
4. SELECT em `analysis_snapshots` por id: `id, instagram_username, normalized_payload, created_at`.
5. `buildReportSnapshotPayload({ normalized_payload, instagram_username, competitor_usernames: rr.competitor_usernames ?? [], generated_at: analysisSnap.created_at })` — `try/catch` para `build_error`.
6. INSERT em `report_snapshots`:
   ```
   {
     report_request_id: rr.id,
     lead_id: rr.lead_id,
     user_id: rr.user_id ?? null,
     source_analysis_snapshot_id: rr.analysis_snapshot_id,
     instagram_username: rr.instagram_username,
     competitor_usernames: rr.competitor_usernames ?? [],
     payload_schema_version: REPORT_PAYLOAD_SCHEMA_VERSION,
     report_payload_jsonb: payload,
     report_version: REPORT_VERSION_FREE_V1,
     algorithm_version,
     expires_at: getReportSnapshotExpiresAt(new Date()).toISOString(),
     metadata: { source: <unlock|beta_request|admin_generate>, persisted_at: <iso> },
   }
   ```
7. Em conflito Postgres `23505` (índice parcial `report_snapshots_report_request_id_unique`): re-SELECT por `report_request_id` e devolver id existente com `created: false`.
8. Em qualquer outro erro: `{ snapshotId: null, created: false, reason: "insert_error" }` + `console.error`.
9. Best-effort: UPDATE `report_requests.report_snapshot_id = snapshotId` (se ainda NULL). Não bloqueia.

A função aceita opção `{ source: "public_unlock" | "beta_request" | "admin_generate" }` para gravar em `metadata`.

### Wrapper público (call sites curtos)

`persistReportSnapshotInBackground(reportRequestId, source)` — wrapper que invoca `ensureReportSnapshotForRequest`, e em falha emite `product_event` `report_snapshot_persist_failed` com `{ report_request_id, reason }`. Devolve `void`. Os call sites usam `await` (rápido, ~2 reads + 1 insert) para garantir que existe antes do email/pipeline arrancar; só ficaria `void`/`runInBackground` se o p95 subir notavelmente.

### Alterações por ficheiro

1. **Novo** `src/lib/report-snapshots/persist-report-snapshot.server.ts` — helper acima.
2. **Editar** `src/lib/unlock.server.ts`: depois da resolução de `reportRequestId` (cobrindo branch INSERT, branch existingRR e branch race 23505) e antes do `recordProductEvent("unlock_completed")`, chamar `await persistReportSnapshotInBackground(reportRequestId, "public_unlock")`. Não altera o objecto de retorno.
3. **Editar** `src/routes/api/request-full-report.ts`: após o insert OK do RR (linha 284) e antes do `runInBackground(runReportPipeline(...))`, chamar `await persistReportSnapshotInBackground(reqRow.id, "beta_request")`.
4. **Editar** `src/routes/api/admin/generate-beta-report.ts`: após o UPDATE para `completed` (linha 196) e antes do `product_events.insert` (linha 200), chamar `await persistReportSnapshotInBackground(requestId, "admin_generate")`.
5. **Novo** `src/lib/report-snapshots/__tests__/persist-report-snapshot.test.ts`: cobre todos os ramos com mock do `supabaseAdmin`.

### Idempotência

- Garantida em três camadas:
  1. Short-circuit quando `report_requests.report_snapshot_id` já está preenchido.
  2. Índice único parcial `report_snapshots_report_request_id_unique` no DB.
  3. Recovery 23505 → re-SELECT.
- Reentrante: chamadas concorrentes do mesmo unlock só geram 1 linha. Test cobre.

### Campos persistidos vs. esquema da tabela

Confirmado contra `<supabase-tables>`:
- `report_payload_jsonb` ✓ (NOT NULL)
- `payload_schema_version` ✓
- `competitor_usernames` ✓ (default `[]`)
- `instagram_username` ✓
- `source_analysis_snapshot_id` ✓ (NOT NULL — por isso skip se RR não tem analysis_snapshot_id)
- `user_id`, `lead_id`, `report_request_id` ✓ (nullable)
- `metadata` ✓ (jsonb nullable)
- `expires_at` ✓ (NOT NULL — derivado por `getReportSnapshotExpiresAt`)
- `report_version`, `algorithm_version` ✓ (NOT NULL)
- `pdf_storage_path` ✗ (deixar default NULL — Fase 3)
- `expired_at` ✗ (deixar NULL — preenchido por cleanup futuro)

### Validação

```bash
bunx tsc --noEmit
bunx vitest run
```

Testes unitários novos a criar em `persist-report-snapshot.test.ts`:

1. `cria snapshot na primeira chamada` — RR com analysis_snapshot_id e sem report_snapshot_id → INSERT acontece, UPDATE no RR acontece, retorna `created: true`.
2. `não duplica em chamada repetida` — RR já tem report_snapshot_id → 0 SELECT em analysis_snapshots, 0 INSERT, retorna `created: false` com mesmo id.
3. `recupera snapshot existente em race 23505` — INSERT mock devolve PostgrestError code `23505`; segundo SELECT por report_request_id devolve linha existente; retorna `created: false`.
4. `report_request sem analysis_snapshot_id → reason missing_analysis_snapshot` — não tenta INSERT.
5. `expires_at = created_at + 15 dias (REPORT_RETENTION_MS)` — verifica via `Date.now()` mockado.
6. `payload exclui campos pesados` — alinha com teste existente do builder; assert que objecto inserido não tem `caption_semantic_analysis`, `visual_cover_analysis`, `market_signals_free`, etc.
7. `não chama providers` — assegurar que mocks de Apify/OpenAI/DataForSEO não são chamados (asserção sobre fetch global stub).
8. `report_version = "free.v1"`, `payload_schema_version = "report.v1"`, `algorithm_version = "analysis.v1"`.

### Fora de scope (Fase 3)

- Migrar `/reports/$snapshotId` para ler `report_snapshots`.
- Backfill de RRs antigos sem snapshot.
- Cleanup baseado em `expired_at`.
- Snapshot do PDF (`pdf_storage_path`).
- Promover persistência a bloqueante.
- Brevo/Resend / templates.

### Saída esperada

- 4 ficheiros tocados (1 novo helper, 3 wirings, 1 teste novo).
- `tsc` 0 erros, `vitest` todos verdes.
- 1 nova entrada por unlock em `report_snapshots`; `report_requests.report_snapshot_id` populado.
- 0 chamadas a providers.
