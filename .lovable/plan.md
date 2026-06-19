## Objetivo

Após auditoria, o registo via modal de onboarding **nunca cria** `report_requests` nem dispara `runReportPipeline`. O utilizador vê o snapshot em `/analyze/$username` mas `/app/reports` fica vazio e não recebe email com PDF. Este plano corrige a cadeia de geração e remove inconsistências relacionadas.

## Alterações

### 1. `/api/onboarding/start` — enfileirar relatório no registo
- Persistir `instagram_handle` em `leads` (campo enviado pelo modal, hoje ignorado).
- Após sucesso de `createAuthUser` + `upsertLead`, inserir linha em `report_requests` com:
  - `request_source = 'onboarding_signup'`
  - `is_free_request = true`
  - `lead_id` + `user_id` recém-criados
  - `instagram_handle` normalizado
- Disparar `runInBackground(runReportPipeline)` (fire-and-forget, não bloqueia resposta).
- Registar `AUTH_USER_CREATE_FAILED` em `product_events` com motivo real (hoje é mascarado).

### 2. `analyze.$username` — rede de segurança
- Nova server fn `enqueueReportForSnapshot` (`requireSupabaseAuth`):
  - Resolve `lead_id` via `profiles.lead_id`.
  - Insere `report_requests` **idempotente** (ON CONFLICT por `user_id + instagram_handle` em estado pendente/processing das últimas 24h → noop).
  - Chama `runReportPipeline` em background.
- Componente chama-a quando snapshot fica pronto e há sessão ativa. Cobre fluxos antigos (signup direto, retomadas, etc.).

### 3. RLS em `report_requests`
- Política atual: `user_id = auth.uid()`. Falha para linhas pré-signup com `user_id NULL` mas `lead_id` ligado ao utilizador.
- Adicionar política SELECT extra: `lead_id IN (SELECT lead_id FROM profiles WHERE id = auth.uid())`.
- Migração inclui `GRANT` (já existe) + nova policy.

### 4. Migração — `leads.instagram_handle`
- Adicionar coluna `instagram_handle text` se não existir + índice parcial `WHERE instagram_handle IS NOT NULL`.

### 5. `/app/reports` — empty state
- Refinar copy: "O teu relatório aparece aqui após a primeira análise (~1 min). Recebes também por email."
- Polling leve (a cada 5s) enquanto houver request em `pending`/`processing` para refletir progresso sem reload manual.

## Fora de âmbito
- Reescrita do gate premium / unlock antigo.
- Backfill de leads existentes (faz-se manual se necessário).
- Alterações ao hero, pagamentos, design tokens.

## Ficheiros tocados
- `src/routes/api/onboarding/start.ts`
- `src/routes/analyze.$username.tsx` (+ nova `src/lib/enqueue-report.functions.ts`)
- `src/routes/_authenticated/app.reports.tsx`
- Nova migração: `leads.instagram_handle` + policy SELECT em `report_requests`

## Validação
1. Registar conta nova via modal com handle `frederico.m.carvalho`.
2. `/app/reports` deve mostrar cartão "A processar" → "Pronto" em <2 min.
3. Email com PDF chega ao endereço usado.
4. Repetir registo/análise do mesmo handle não duplica `report_requests` (idempotência).

## Checkpoint
- ☐ Migração aplicada (`instagram_handle` + policy)
- ☐ `/api/onboarding/start` enfileira relatório + persiste handle
- ☐ `enqueueReportForSnapshot` ativa em `analyze.$username`
- ☐ Empty state + polling em `/app/reports`
- ☐ Teste E2E manual com conta nova OK