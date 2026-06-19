
## Diagnóstico

Auditei todo o fluxo (signup, onboarding modal, /api/onboarding/start, analyze.$username, run-report-pipeline) e confirmei na base de dados:

```
SELECT count(*) FROM report_requests WHERE lead_id IN (
  últimos 10 leads com source='auth_signup' ou 'onboarding_modal'
)  →  0
```

**Nenhum** dos registos recentes (Bruno, JP Leonardo, Paulo, Ana, Stacy, Leilane…) gerou `report_requests`. Em contraste, os leads antigos com `source='public_report_unlock'` têm `rr_count=1` cada — porque a antiga rota de unlock criava sempre uma linha.

### Causa raiz

O `report_request` (e portanto o pipeline PDF+email que faz o relatório aparecer em `/app/reports`) só é criado em três sítios:

1. `POST /api/request-full-report` — disparado pelo antigo gate premium (deixou de ser atingido no fluxo onboarding-first).
2. `unlock.server.ts` — antigo fluxo `public_report_unlock` (já não está no caminho ativo).
3. Nada cria o `report_request` quando o utilizador se regista pelo modal de onboarding ou pelo `/signup`.

Portanto:
- O `/api/onboarding/start` cria o **auth user** + **lead** + **cookie** + envia email de acesso, mas **não cria report_request nem dispara `runReportPipeline`**.
- O `analyze.$username` faz reload da análise após `onSuccess` do modal, mas também **não enfileira o relatório**.
- Resultado: o utilizador vê a análise (snapshot) mas `/app/reports` fica eternamente vazio e nunca chega email com PDF.

### Inconsistências secundárias encontradas

- **`leads.handle` nunca é persistido**: o modal envia `handle` no payload mas é só usado para tracking; não fica registado no lead, pelo que é impossível saber depois para que perfil o utilizador se registou.
- **`/signup` direto** não recebe nenhum handle e o `handle_new_user` cria lead com `source='auth_signup'` sem ligação a qualquer análise. Estes utilizadores caem em `/app/reports` vazio, sem CTA claro para fazer a primeira análise (o empty-state existe mas é genérico).
- **RLS em `report_requests`**: existe uma única policy `SELECT … USING (user_id = auth.uid())`. O `getUserReports` faz `.or(user_id=…, lead_id=…)`; rows com `user_id NULL` mas `lead_id` igual ao do user (relatórios criados pré-signup) **só aparecem depois do trigger `link_user_to_existing_reports` ter populado o `user_id`**. Hoje funciona porque o trigger corre; mas se um relatório for criado para um lead sem user (caso atual), nunca aparece.
- **`AUTH_USER_CREATE_FAILED` mascarado**: quando `supabaseAdmin.auth.admin.createUser` falha por motivo não-duplicado, devolvemos `GENERIC_FALLBACK_MESSAGE`; o frontend cai no erro genérico. Útil registar o motivo real em `product_events` para diagnóstico.

## Plano de correção (escopo mínimo)

### 1. `/api/onboarding/start` — persistir o handle e enfileirar o relatório

- Acrescentar `instagram_handle` ao update/insert de `leads` (coluna existe? Verificar; se não, novo campo `instagram_handle text` via migração — em paralelo).
- Após `createAuthUser` ok + `upsertLead` ok, e quando `payload.handle` está presente, chamar (fire-and-forget, sem bloquear a resposta):
  - Buscar `analysis_snapshots.id` mais recente para `lower(instagram_username) = handle` (criado pelo `analyze` que precedeu o modal).
  - `INSERT INTO report_requests (lead_id, user_id, instagram_username, analysis_snapshot_id, request_source='onboarding_signup', is_free_request=true, metadata={ flow:'onboarding_first' })` — `ON CONFLICT (lead_id, analysis_snapshot_id) DO NOTHING`.
  - `ensureReportSnapshotForRequest(reqId, 'onboarding_signup', { handle, leadId, snapshotId })`.
  - `runInBackground(runReportPipeline(reqId, origin))`.
- Se não houver snapshot ainda (utilizador completou o modal antes da análise terminar), gravar `pending_handle` na metadata do lead e deixar para o cliente (passo 2).

### 2. `analyze.$username` — fallback de enfileiramento client-side

- No `AnalyzeReady` (ou logo a seguir ao `load()` em `state.status === "ready"`), se o utilizador estiver autenticado e ainda não existir `report_request` para `(user/lead, snapshotId)`, chamar uma nova server function `enqueueReportForSnapshot({ snapshotId, handle, competitors })` que:
  - Faz `requireSupabaseAuth`.
  - Resolve `lead_id` via `profiles.lead_id`.
  - Faz o mesmo insert idempotente + `runReportPipeline`.
- Esta é a rede de segurança para todos os caminhos (signup direto que depois vai analisar, onboarding sem snapshot pronto, etc.).

### 3. Empty-state e copy

- `/app/reports` empty-state: manter o CTA "Analisar perfil" mas adicionar uma linha curta a explicar que o relatório só fica disponível após uma análise concluída.

### 4. Diagnóstico

- No catch de `AUTH_USER_CREATE_FAILED` em `/api/onboarding/start`, inserir um `product_events` com `event_type='onboarding_auth_create_failed'` e `metadata={ status, message_excerpt }` (sem PII), para passar a ver no admin porque é que registos falham silenciosamente.

## Fora de escopo

- Reescrever o gate premium / unlock antigos.
- Mudanças visuais ao hero ou ao /analyze.
- Pagamento e subscrições (continua adiado).
- Backfill manual dos 10 leads recentes sem report — fazer apenas após o utilizador validar a correção (script separado).

## Ficheiros tocados

- `src/routes/api/onboarding/start.ts` — persistir handle, enfileirar pipeline, logar AUTH_USER_CREATE_FAILED.
- `src/routes/analyze.$username.tsx` + nova server fn em `src/lib/rpc/reports.functions.ts` (ou novo `enqueue-report.functions.ts`).
- `src/routes/app.reports.tsx` — refinamento do empty-state.
- Migração nova `…_lead_handle.sql` se a coluna `instagram_handle` ainda não existir em `leads`.

## Validação após implementação

1. Criar conta de teste via modal com handle `frederico.m.carvalho`.
2. Confirmar via SQL: `SELECT id, request_status, pdf_status FROM report_requests WHERE lead_id = <novo>` retorna 1 linha que transita `pending → processing → completed`.
3. `/app/reports` mostra o cartão com badge "Pronto" e link "Abrir relatório".
4. Email transactional recebido com PDF.
