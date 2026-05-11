## Phase 3 — Estado actual

Após auditoria, **toda a Fase 3 já está implementada**. Apenas falta revalidar.

### O que já existe

**1. Endpoint `GET /api/public/report-snapshot/by-id/:snapshotId`**
Ficheiro: `src/routes/api/public/report-snapshot.by-id.$snapshotId.ts` (181 linhas).
- Valida UUID; devolve `INVALID_SNAPSHOT_ID` (400) se inválido.
- Lê primeiro de `report_snapshots` (imutável).
- Devolve: `id`, `instagram_username`, `payload` (= `report_payload_jsonb`), `meta`, `created_at`, `expires_at`, `expired`, `payload_schema_version`, `report_version`, `algorithm_version`, `benchmark`, `source: "report_snapshot"`.
- Quando expirado, devolve `expired: true` sem payload.
- **Fallback** para `analysis_snapshots` (mesmo shape) com `source: "legacy_analysis_snapshot"` para URLs antigos pré-Fase 2.
- Apenas leitura: usa `supabaseAdmin` + `buildReportBenchmarkInput`. Não chama Apify/OpenAI/DataForSEO.

**2. Rota `/reports/$snapshotId`**
Ficheiro: `src/routes/reports.$snapshotId.tsx`.
- Faz `fetch('/api/public/report-snapshot/by-id/...')` (já não chama o endpoint legacy).
- `meta: noindex, nofollow` mantido.
- Estados preservados: `loading`, `not_found`, `expired`, `error`, `ready`.

**3. `/app/reports` (lista)**
Ficheiro: `src/routes/app.reports.tsx` linha 193-194:
```ts
const snapshotIdForLink =
  report.reportSnapshotId ?? report.analysisSnapshotId ?? null;
```
"Abrir relatório" já prefere `report_snapshot_id` com fallback legacy.

**4. `/app/reports/$id` (detalhe)**
Ficheiro: `src/routes/app.reports.$id.tsx` linha 127-128: mesma regra.

**5. Email links**
- Helper `src/lib/email/url.ts` → `resolveReportUrl(handle, reportSnapshotId)` devolve `/reports/{id}` quando há snapshot, senão `/analyze/{handle}`.
- `send-welcome-beta.server.ts` e `send-report-summary.server.ts` aceitam e passam `reportSnapshotId`.
- `lead-magnet-sequence.server.ts` propaga `reportSnapshotId` para ambos.
- `unlock.server.ts` (linha 417, 466) passa `reportSnapshotResult.snapshotId` para a sequência.
- Brevo `sync.server.ts` e `customer-sync.server.ts` constroem `LAST_REPORT_URL` a partir de `report_snapshot_id`.

**6. Endpoint legacy**
`src/routes/api/public/analysis-snapshot.by-id.$snapshotId.ts` (99 linhas) mantido intacto para admin/debug.

### O que vai ser feito neste loop

**Apenas revalidação. Zero alterações de código.**

1. `bunx tsc --noEmit`
2. `bunx vitest run` (suite completa, ~351 testes)

### Relatório final incluirá

- Endpoint criado: confirmação (já existente desde Fase 2).
- Rotas actualizadas: `/reports/$snapshotId`, `/app/reports`, `/app/reports/$id` — confirmar fonte de dados.
- Comportamento de fallback: `report_snapshot_id` → `analysis_snapshot_id` (UI) e endpoint `report_snapshots` → `analysis_snapshots` (API).
- Comportamento de email: `resolveReportUrl` prefere `/reports/{report_snapshot_id}`, fallback para `/analyze/{handle}`.
- Endpoint legacy `analysis-snapshot.by-id` preservado.
- Resultados `tsc` + `vitest`.

### Fora de âmbito (confirmado)

- Sem chamadas a Apify/OpenAI/DataForSEO.
- Sem regeneração de relatórios.
- Sem alterações ao cálculo de relatório.
- Sem alterações de schema.
- Sem cleanup nem deletes.
- Sem alterações a Brevo/Resend além do helper de URL (que já está implementado).