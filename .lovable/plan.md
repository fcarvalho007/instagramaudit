## Fase 1 — Histórico imutável de relatórios (`report_snapshots`)

Apenas fundação de armazenamento. Sem UI, sem cleanup, sem regeneração.

### 1. Migração `report_snapshots`

Ficheiro: `supabase/migrations/<timestamp>_create_report_snapshots.sql`

```sql
create table public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_request_id uuid unique,                   -- 1:1 com pedido (nullable: snapshots admin/manuais)
  lead_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  source_analysis_snapshot_id uuid not null,       -- referência lógica à cache
  instagram_username text not null,
  competitor_usernames jsonb not null default '[]'::jsonb,
  report_payload_jsonb jsonb not null,
  payload_schema_version text not null,            -- ex.: 'report.v1'
  report_version text not null,                    -- ex.: 'free.v3'
  algorithm_version text not null,                 -- ex.: 'analysis.v3'
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  expired_at timestamptz,                          -- preenchido só após cleanup soft
  pdf_storage_path text,
  metadata jsonb
);

create index report_snapshots_report_request_id_idx on public.report_snapshots(report_request_id);
create index report_snapshots_lead_id_idx on public.report_snapshots(lead_id);
create index report_snapshots_user_id_idx on public.report_snapshots(user_id);
create index report_snapshots_instagram_username_idx on public.report_snapshots(lower(instagram_username));
create index report_snapshots_expires_at_idx on public.report_snapshots(expires_at);

alter table public.report_snapshots enable row level security;

-- RLS
create policy "Users can read own report snapshots"
  on public.report_snapshots
  for select
  to authenticated
  using (user_id = auth.uid());
-- Sem policies para insert/update/delete → só service_role escreve
-- Sem policies para anon → bloqueado por defeito

-- report_requests: pointer para snapshot histórico
alter table public.report_requests
  add column if not exists report_snapshot_id uuid;
create index if not exists report_requests_report_snapshot_id_idx
  on public.report_requests(report_snapshot_id);
```

Reversibilidade: drop table + drop column num único migration de rollback. FKs evitadas para `report_requests` (pointer fraco) para permitir cleanup independente.

### 2. Constantes de retenção

Estender `src/lib/report/retention.ts` (já existe, usa `REPORT_RETENTION_DAYS=15`):

```ts
export function getReportSnapshotExpiresAt(createdAt: string | Date): Date {
  return getReportExpiresAt(createdAt);   // alias semântico
}
export function isReportSnapshotExpired(expiresAt, now?): boolean {
  return isReportExpired(expiresAt, now);
}
```

Sem duplicação — partilha o `REPORT_RETENTION_DAYS` central.

### 3. Payload builder

Novo: `src/lib/report-snapshots/build-report-snapshot-payload.server.ts`

Whitelist explícita (não copiar e remover) a partir de `analysis_snapshots.normalized_payload`:

| Inclui (mantém) | Exclui (rejeita) |
|---|---|
| `profile` (sem avatar `data:*`) | `caption_semantic_analysis` raw |
| `metrics` finais + benchmark | `visual_cover_analysis` raw |
| `format_stats`, `content_summary` | `ai_insights_v1` legacy |
| `posts` cap 30; caption truncado a 1000 chars; só URLs HTTPS | `market_signals_free` completo |
| `competitor_summaries` (agregado) | `enrichment_status` |
| `insights` (final) | qualquer string `data:image/...;base64,...` em `*_url` |
| `data_provenance` (actor, model, scraped_at) | blobs binários, `raw_*`, `_meta` |

Helper interno `stripBase64Urls(value)` substitui `data:` URLs por `null` + `console.warn`. Validação Zod em `src/lib/report-snapshots/schema.ts` (`ReportPayloadV1Schema`) antes do return.

Assinatura:
```ts
export function buildReportSnapshotPayload(
  source: { normalized_payload: Json; instagram_username: string;
            competitor_usernames: string[]; algorithm_version?: string }
): { payload: ReportPayloadV1; payload_schema_version: 'report.v1';
     algorithm_version: string }
```

Sem efeitos secundários, sem providers, sem DB. Usado mais tarde por quem decidir persistir snapshots (Fase 2).

### 4. Testes

`src/lib/report/__tests__/retention.test.ts` — adicionar casos para `getReportSnapshotExpiresAt` / `isReportSnapshotExpired`.

`src/lib/report-snapshots/__tests__/build-report-snapshot-payload.test.ts`:
- ☐ omite `caption_semantic_analysis`, `visual_cover_analysis`, `ai_insights_v1`, `market_signals_free`, `enrichment_status`
- ☐ `avatar_url=data:image/png;base64,...` → `null` + warn
- ☐ `posts[].thumbnail_url=data:...` → `null`
- ☐ caption longa truncada a 1000
- ☐ `posts.length > 30` → cap 30
- ☐ Zod parse passa em payload mínimo válido

### 5. Ficheiros tocados

| Ficheiro | Acção |
|---|---|
| `supabase/migrations/<ts>_create_report_snapshots.sql` | novo |
| `src/lib/report/retention.ts` | + 2 aliases |
| `src/lib/report-snapshots/schema.ts` | novo (Zod + types) |
| `src/lib/report-snapshots/build-report-snapshot-payload.server.ts` | novo |
| `src/lib/report-snapshots/__tests__/build-report-snapshot-payload.test.ts` | novo |
| `src/lib/report/__tests__/retention.test.ts` | estender |
| `src/integrations/supabase/types.ts` | regenerado pela migração |

### 6. Validação

- ☐ `bunx tsc --noEmit`
- ☐ `bunx vitest run` (incluindo novos testes)
- ☐ Migração aplica sem warnings (`supabase--linter`)
- ☐ `select * from report_snapshots` devolve 0 linhas (sem efeitos colaterais)

### 7. Fora de âmbito (Fase 2+)

- Não escrever em `report_snapshots` no pipeline (Fase 2)
- Não alterar `/app/reports` ou `/reports/$snapshotId` (Fase 3)
- Não criar cleanup automático (já planeado em separado)
- Não tocar Brevo/Resend, providers, regeneração

### Constrangimentos

- ☐ Sem providers, sem regeneração, sem deletes
- ☐ Migrações reversíveis (drop table/column)
- ☐ RLS fechada por defeito; só `user_id = auth.uid()` para SELECT
