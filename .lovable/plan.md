## Fase 2 — `report_snapshots` (já implementada — plano de verificação)

Esta Fase 2 foi totalmente implementada e validada na iteração anterior desta sessão (343/343 testes verdes, `tsc --noEmit` limpo). O pedido atual repete a mesma especificação. Não há código novo a escrever — proponho apenas **re-validar** que tudo continua íntegro e produzir o relatório pedido.

### Estado atual confirmado

Ficheiros já presentes:
- `src/lib/report-snapshots/persist-report-snapshot.server.ts`
- `src/lib/report-snapshots/__tests__/persist-report-snapshot.test.ts`
- Wiring em: `src/lib/unlock.server.ts`, `src/routes/api/request-full-report.ts`, `src/routes/api/admin/generate-beta-report.ts`

Funções:
- `persistReportSnapshotInternal(reportRequestId, source)` — núcleo idempotente; carrega RR, short-circuit se já tem snapshot, carrega `analysis_snapshots`, constrói payload leve, insere em `report_snapshots`, recupera de race 23505, faz link no RR.
- `ensureReportSnapshotForRequest(reportRequestId, source, ctx?)` — wrapper await-able fail-soft que emite eventos.
- Alias deprecado `persistReportSnapshotForRequest` mantido para retro-compat.

Sources suportados: `public_unlock` | `beta_request` | `admin_generate`.

Eventos:
- `report_snapshot_persisted` (sucesso, só quando `created === true`) — metadata: `report_request_id`, `report_snapshot_id`, `source`, `source_analysis_snapshot_id`, `created`, `payload_schema_version`, `report_version`, `algorithm_version`, `expires_at`.
- `report_snapshot_persist_failed` (falha real) — metadata: `report_request_id`, `source`, `reason`. Não emite quando `reason === missing_analysis_snapshot`.

Comportamento confirmado:
- `expires_at = now + 15 dias` via `getReportSnapshotExpiresAt`.
- Race 23505 → re-SELECT por `report_request_id`.
- Sem chamadas a providers (Apify/OpenAI/DataForSEO/Brevo/Resend) — verificado por `fetchSpy.not.toHaveBeenCalled()` nos testes.
- Falha não bloqueia unlock/request — wrapper nunca lança.
- Payload exclui campos pesados (`caption_semantic_analysis`, `visual_cover_analysis`, `market_signals_free`, `enrichment_status`).

### Ação proposta neste turno

1. Re-correr `bunx tsc --noEmit`
2. Re-correr `bunx vitest run` (focando `src/lib/report-snapshots`)
3. Devolver relatório completo: ficheiros alterados, funções criadas, eventos, fluxos ligados, resultados de validação

### Nota sobre uma melhoria opcional (não incluída sem aprovação)

A spec atual menciona `errorMessage if safe` na metadata de falha. Hoje o wrapper só envia `reason` (não há campo `errorMessage`). Se quiseres, posso adicionar isso como ajuste pequeno — caso contrário fica como está.

### Fora de scope (mantido)

- Não migrar `/reports/$snapshotId`
- Não alterar `/app/reports`
- Sem cleanup
- Sem providers
- Sem regeneração de relatórios
