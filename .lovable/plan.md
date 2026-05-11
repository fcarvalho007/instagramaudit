## Fase 3 — `/reports/$snapshotId` lê de `report_snapshots`

### Decisões-chave

1. **`snapshotId` na rota = `report_snapshots.id`**, não `analysis_snapshots.id`. Ambos são UUIDs sem distinção, mas a partir desta fase os links em `/app/reports` e nos emails passam a apontar para o `report_snapshot_id`. Snapshots antigos linkados a `analysis_snapshots.id` continuam a funcionar via fallback (ver §4).
2. **Compatibilidade do payload:** `report_payload_jsonb` (ReportPayloadV1) usa os mesmos nomes de campo que `snapshotToReportData` consome (`profile`, `posts`, `metrics`, `format_stats`, `content_summary`, `insights`, `competitor_summaries`, `data_provenance`). Vai ser passado directamente ao adapter existente (cast tipado para `SnapshotPayload`). Sem reescrever o renderer.
3. **Fallback transparente:** o novo endpoint tenta `report_snapshots` primeiro; se não encontrar, tenta `analysis_snapshots` com a mesma lógica antiga. Isto cobre URLs antigos guardados em emails/bookmarks sem partir nada.

### 1. Endpoint novo

`src/routes/api/public/report-snapshot.by-id.$snapshotId.ts` → `GET /api/public/report-snapshot/by-id/:snapshotId`

Comportamento:
- Validar UUID
- Lê `report_snapshots` por `id` (sem RLS, via `supabaseAdmin`):
  - `id, instagram_username, report_payload_jsonb, payload_schema_version, report_version, algorithm_version, created_at, expires_at, expired_at`
- Se encontrar:
  - Detectar expiração (`expires_at < now()` OU `expired_at IS NOT NULL`) → devolver `{ success: true, snapshot: {...}, expired: true }` sem payload pesado
  - Caso contrário, calcular `benchmark` via `buildReportBenchmarkInput(report_payload_jsonb)` e devolver shape espelho do endpoint antigo:
    ```
    {
      success: true,
      snapshot: {
        id, instagram_username,
        payload,                  // = report_payload_jsonb
        meta: { generated_at: created_at, instagram_username },
        created_at,
        expires_at,
        expired: false,
        payload_schema_version,
        report_version,
        algorithm_version,
        benchmark
      }
    }
    ```
- Se não encontrar em `report_snapshots`, **fallback** para `analysis_snapshots` (mesma query do endpoint antigo) → devolve shape antigo + flag `source: "legacy_analysis_snapshot"`.
- Sem chamadas a Apify/OpenAI/DataForSEO. Read-only. `Cache-Control: no-store`.

### 2. Rota `/reports/$snapshotId`

`src/routes/reports.$snapshotId.tsx`:
- Trocar URL do `fetch` para `/api/public/report-snapshot/by-id/...`
- Adicionar campo `expired` ao tipo `SnapshotResponse`. Se `body.snapshot.expired === true`, mostrar `ExpiredState` com handle (já existe).
- Restante lógica (`snapshotToReportData`, `ReportShellV2`, retention, expired/not_found/error states) mantém-se.
- Comentário do topo actualizado para refletir leitura de `report_snapshots`.

### 3. `/app/reports`

`src/server/reports.functions.ts`:
- `getUserReports`: adicionar `report_snapshot_id` ao SELECT e ao tipo `UserReport`.
- `getOwnedReport`: adicionar `report_snapshot_id` ao SELECT e à devolução.

`src/routes/app.reports.tsx`:
- Botão "Abrir relatório" usa `report.reportSnapshotId ?? report.analysisSnapshotId`. `canOpenSnapshot` passa a verificar a união dos dois.

`src/routes/app.reports.$id.tsx`:
- Mesma lógica para o(s) link(s) "Abrir relatório".

### 4. Emails

Helper único `resolveReportUrl(handle, reportSnapshotId?)` em `src/lib/email/url.ts` (novo) — devolve `${PUBLIC_APP_BASE_URL}/reports/${reportSnapshotId}` quando há `reportSnapshotId`, caso contrário cai no comportamento actual baseado em handle (p.ex. `/analyze/${handle}`).

Wiring:
- `send-welcome-beta.server.ts` e `send-report-summary.server.ts`: passar `args.reportSnapshotId` (já recebem `snapshotId`; renomear semântica e ler `report_snapshot_id` no chamador).
- `lead-magnet-sequence.server.ts`: passar `report_snapshot_id` quando o `report_request` ou snapshot já existir.
- `brevo/sync.server.ts` e `brevo/customer-sync.server.ts`: SELECT inclui `report_snapshot_id`; passar para `latestRR.report_snapshot_id ?? latestRR.analysis_snapshot_id`.

### 5. Out-of-scope (mantido)

- Não eliminar `/api/public/analysis-snapshot/by-id/:snapshotId` (continua a servir `/report/print/$snapshotId` do PDFShift e legacy).
- Sem regeneração, sem providers, sem cleanup, sem mudanças no cálculo do relatório nem na UI pública.

### 6. Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (todos os testes existentes passam)
- Smoke manual:
  - Abrir um relatório recente a partir de `/app/reports` → carrega via `report_snapshots`
  - Abrir relatório antigo (sem `report_snapshot_id`) → fallback para `analysis_snapshots`
  - Re-analisar o mesmo handle → relatório antigo continua a mostrar números antigos (imutabilidade)
  - Network tab: zero chamadas a Apify/OpenAI/DataForSEO

### Devolução final

- Endpoint criado · rotas/links actualizados · fallback documentado · resultados de tsc + vitest
