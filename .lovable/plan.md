## Objetivo
Agendar cleanup nocturno de `report_snapshots` em modo dry-run, com kill switch e logs.

## Estado atual
- Endpoint `POST /api/public/hooks/cleanup-expired-report-snapshots` autentica via `INTERNAL_API_TOKEN` ou `apikey` (publishable key).
- `cleanupExpiredReportSnapshots()` percorre snapshots com `expires_at <= now()` e `report_payload_jsonb` não-null, anula payload e marca `expired_at`. Emite `report_snapshots_expired_batch` (sucesso) e `report_snapshots_cleanup_failed` (erro).
- Tabelas tocadas: **apenas `report_snapshots`**. `report_requests`, `leads`, `provider_call_logs`, `analysis_events`, `cost_*`, `analysis_snapshots` ficam intactos. ✅
- Faltam: dry-run, kill switch (`app_config.cleanup_enabled`), e o cron.

## Mudanças

### 1. `src/lib/report-snapshots/cleanup-expired.server.ts`
- Adicionar opção `dryRun?: boolean` em `CleanupOptions`.
- Adicionar campo `dryRun: boolean` em `CleanupResult`.
- Quando `dryRun=true`:
  - Continua o loop de SELECT (mesmos filtros), conta `scanned`/`expiredCount`, mas NÃO chama nenhum `update`.
  - Emite evento `report_snapshots_cleanup_dry_run` por batch (em vez de `report_snapshots_expired_batch`) com `count`, `snapshot_ids`, `expires_at_min/max`, `run_at`.
- Sem alteração ao comportamento destrutivo quando `dryRun=false`.

### 2. `src/routes/api/public/hooks/cleanup-expired-report-snapshots.ts`
- Aceitar body JSON opcional `{ dry_run?: 0|1|true|false }`. Default: `false` (compat com chamada admin atual). Tolerar body vazio.
- Antes de qualquer trabalho destrutivo (`dryRun !== true`):
  - Ler `app_config.cleanup_enabled` (mesmo padrão de `execution-mode.server.ts`, sem cache global — leitura direta, retention = 1 chamada/dia).
  - Se valor ≠ `"true"` → devolver `{ ok: true, skipped: true, reason: "cleanup_disabled", dryRun: false }` com status 200, e emitir `report_snapshots_cleanup_skipped` (metadata: `{ reason, source: "kill_switch" }`).
  - `dryRun=true` ignora o kill switch (informação não é destrutiva).
- Passa `{ dryRun }` para `cleanupExpiredReportSnapshots`.
- Resposta inclui `dryRun` no JSON.

### 3. Migração
Inserir linha em `app_config`:
```sql
INSERT INTO public.app_config (key, value, updated_by)
VALUES ('cleanup_enabled', 'false', 'system')
ON CONFLICT (key) DO NOTHING;
```
(default seguro — nada é destruído mesmo se alguém chamar com `dry_run=0`)

### 4. Agendamento `pg_cron`
Via `supabase--insert` (não migration), criar job:
```sql
SELECT cron.schedule(
  'cleanup-expired-report-snapshots-dry-run',
  '0 4 * * *',  -- 04:00 UTC diário
  $$
  SELECT net.http_post(
    url := 'https://project--b554ee82-2f67-4f5a-895d-cd69f2867df7.lovable.app/api/public/hooks/cleanup-expired-report-snapshots',
    headers := '{"Content-Type":"application/json","apikey":"<SUPABASE_PUBLISHABLE_KEY>"}'::jsonb,
    body := '{"dry_run": 1}'::jsonb
  ) AS request_id;
  $$
);
```
Pré-requisitos: `pg_cron` e `pg_net` ativos. Se faltar, ativá-los na mesma chamada.

### 5. Testes
- Estender `src/lib/report-snapshots/__tests__/cleanup-expired.test.ts`:
  - novo caso `dryRun=true`: confirma que `expiredCount` é igual ao número de rows, mas `state.updatedIds` continua vazio.

## Eventos novos
- `report_snapshots_cleanup_dry_run` (por batch, modo dry-run)
- `report_snapshots_cleanup_skipped` (kill switch ativo)

## Segurança
- Auth do endpoint inalterada (`authorizeCronHook`).
- Kill switch default = `false` → cron em produção só faz dry-run; mesmo sem `dry_run=1` o trabalho destrutivo é bloqueado até alguém setar `cleanup_enabled='true'` no `app_config`.
- pg_cron usa `apikey` header (publishable key) — padrão modern-cron documentado.

## Fora de scope
- Ativar destruição (`cleanup_enabled='true'`) — fica como toggle manual posterior.
- Painel admin para o kill switch (existe já leitura via `app_config`; UI fica para depois).
- Retention != 15 dias.

## Validação
- `bunx tsc --noEmit`
- `bunx vitest run` (incluindo o novo caso dry-run)
- Manual:
  - `SELECT * FROM cron.job WHERE jobname='cleanup-expired-report-snapshots-dry-run';` → 1 linha
  - Invocar manualmente o endpoint com `{"dry_run":1}` → JSON `{ ok:true, dryRun:true, scanned, expiredCount, ... }` sem nenhum update na DB
  - Invocar com `{"dry_run":0}` enquanto `cleanup_enabled='false'` → `{ ok:true, skipped:true, reason:"cleanup_disabled" }`

## Devolver no fim
- ficheiros alterados / migração / job criado
- comportamento dry-run vs destrutivo
- comportamento do kill switch
- tabelas afetadas (só `report_snapshots`)
- resultado dos testes
