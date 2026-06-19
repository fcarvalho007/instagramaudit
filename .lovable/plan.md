## Auditoria — geração do relatório após registo

Inspecionei pipeline end-to-end + dados reais em produção. Resultado em checklist (✅ OK · ⚠️ risco · ❌ partido).

### Cadeia de criação de `report_requests`

- ✅ `/api/onboarding/start` persiste `instagram_handle` e chama `tryEnqueueReportForHandle` após `createAuthUser` + `upsertLead`.
- ✅ Helper `enqueueReportForSnapshot` é idempotente (lookup + `23505` race guard) e dispara `runReportPipeline` em background.
- ✅ Safety net em `analyze.$username` (`enqueueReportForCurrentSnapshot`) corre quando há sessão activa.
- ❌ **`/signup` e Google OAuth NÃO passam por `/api/onboarding/start`.** Usam `supabase.auth.signUp` direto → trigger `handle_new_user` cria lead com `source='auth_signup'` e `instagram_handle=NULL`. Todos os 8 leads dos últimos 7 dias estão neste caminho. Nenhum `report_requests` foi criado nos últimos 7 dias, apesar de existir snapshot novo para `frederico.m.carvalho` (19 Jun) e 8 signups (13–19 Jun).
- ⚠️ A safety net depende do utilizador navegar manualmente para `/analyze/$username` *autenticado* após registo. Quem se regista em `/signup` directo nunca dispara enqueue.

### Estado canónico (`pdf_status`, `request_status`, `delivery_status`)

Colunas são `text` livre (não enum). Cada componente escreve valores diferentes — UI nunca mostra "Pronto".

- ❌ **`pdf_status` divergente:**
  - `generate-report-pdf` escreve `'ready' | 'generating' | 'failed'`
  - `app.reports.tsx` + `reports.functions.ts` esperam `'generated' | 'generating' | 'pending' | 'failed'`
  - Resultado: badge "PDF pronto" e status "Pronto" nunca disparam mesmo quando o PDF foi gerado com sucesso.
- ❌ **`request_status` divergente:**
  - Orchestrator usa `pending|processing|completed|failed_pdf|failed_email`
  - DB ainda tem rows com `'unlocked'` (legacy do `public_unlock`)
  - UI compara contra `completed` / `processing` / `failed` — `unlocked` cai sempre no "Pendente".
- ⚠️ Orchestrator `runReportPipeline` só skipa `completed` e `processing`. Linhas com `'unlocked'` re-enfileiradas seriam reescritas para `processing`.

### Pipeline interno

- ✅ `INTERNAL_API_TOKEN`, `PDFSHIFT_API_KEY`, `RESEND_API_KEY` presentes em secrets.
- ✅ `runInBackground` tem catch defensivo.
- ⚠️ `runReportPipeline` chama `fetch(${origin}/api/generate-report-pdf)` sem qualquer header de auth. `generate-report-pdf` é exposta como rota pública sem `INTERNAL_API_TOKEN`. Funciona, mas é um endpoint público que aceita qualquer `report_request_id`.
- ✅ `send-report-email` exige header `x-internal-token`.

### RLS / leitura em `/app/reports`

- ✅ Migração de hoje adicionou policy `Users can view reports via lead` + `current_user_lead_id()`.
- ✅ `getUserReports` faz `.or(user_id, lead_id)`.
- ✅ Polling a cada 5s enquanto houver `pending`/`processing`/`generating`.

### Trigger `handle_new_user` / `link_user_to_existing_reports`

- ✅ Cria `profiles` + lead idempotente por `email_normalized`.
- ✅ Faz backfill de `report_requests.user_id` quando o user assina depois.
- ⚠️ Lead criado por trigger fica com `source='auth_signup'` e `instagram_handle=NULL` — perde-se a relação com o handle que o user estava a analisar.

### Diagnóstico em dados reais

- 8 leads em 7 dias, 0 `report_requests` criados, 0 eventos `onboarding_auth_create_failed`.
- Snapshot mais recente: `frederico.m.carvalho` (19 Jun) — sem report_request associado.
- Indica que o fluxo dominante hoje é `/signup` direto, não o modal de onboarding.

---

## Plano de correcção (P0 → P1)

### P0 — Unificar vocabulário de status (1 migração + 3 ficheiros)

1. **Migração**: backfill `pdf_status='ready' → 'generated'` e `request_status='unlocked' → 'completed'` para todas as rows existentes. Adicionar CHECK constraint suave (via trigger) que normalize `ready→generated` em INSERT/UPDATE para defender o futuro.
2. **`generate-report-pdf.ts`**: trocar todos os `pdf_status: "ready"` por `"generated"`.
3. **Verificar**: `send-report-email.ts` compara contra `"ready"` — actualizar para `"generated"`.
4. **`reports.functions.ts`** + **`app.reports.tsx`**: já esperam `generated`; nada a mudar.

### P0 — Cobrir signup directo (`/signup` + Google OAuth)

1. **`/signup`**: depois de `supabase.auth.signUp` com sucesso, ler `localStorage.getItem('intent_handle')` (a gravar em `analyze.$username` quando o user chega sem sessão) e chamar uma nova server fn `enqueueReportForHandle({ handle })` que:
   - resolve `lead_id` via `profiles`
   - procura snapshot mais recente para esse handle
   - chama `enqueueReportForSnapshot` (idempotente)
2. **OAuth callback**: aplicar a mesma lógica no destino pós-OAuth (`/app/reports` já está carregando — disparar a partir daí se houver `intent_handle`).
3. **`analyze.$username`**: ao detectar `!user`, gravar `intent_handle` em `localStorage` para futuro consumo.

### P1 — Segurança de `generate-report-pdf`

- Exigir `x-internal-token` à semelhança do `send-report-email`. Actualizar `run-report-pipeline.ts` para enviar o header.

### P1 — Robustez orchestrator

- Adicionar `'unlocked'` à lista de "early return" do guard (tratar como `completed` legacy) OU normalizar na migração de backfill (já o fazemos no P0).

### Fora de âmbito desta auditoria
- Rewrite do gate premium / `lead_report_unlocks`.
- Backfill manual dos 8 leads existentes (o utilizador pode fazer com 1 query após o P0 estar live).

## Checkpoint
- ☐ Migração de backfill `ready→generated` / `unlocked→completed`
- ☐ `generate-report-pdf` + `send-report-email` escrevem/leem `generated`
- ☐ `/signup` e fluxo OAuth chamam `enqueueReportForHandle({handle})` quando `intent_handle` existe
- ☐ `analyze.$username` grava `intent_handle` no localStorage para users anónimos
- ☐ `generate-report-pdf` exige `x-internal-token`
- ☐ Teste E2E: novo signup via `/signup` com handle pendente → row em `report_requests` em <10s