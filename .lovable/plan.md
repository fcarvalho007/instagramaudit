
## Plano — Re-validação smoke test pós-upgrade Apify

### Entendimento

Smoke test anterior bloqueou em **Apify 403 `public-actor-disabled`**. Utilizador confirma que o plano Apify foi ativado. Email de teste: `frederico.carvalho@digitalfc.pt`. Resto do pipeline (snapshot → request → PDF → email) nunca foi validado em runtime real porque nada chegou a passar do Passo 2.

Estado atual da BD (já confirmado): `analysis_snapshots`, `leads`, `report_requests` = 0 linhas. Bucket `report-pdfs` existe e é privado. Secrets todos presentes (`APIFY_TOKEN`, `RESEND_API_KEY`, `INTERNAL_API_TOKEN`, `OPENAI_API_KEY`, `SUPABASE_*`).

### Execução (zero código novo)

**Passo 1 — Confirmar Apify desbloqueado**
- `stack_modern--invoke-server-function` → `POST /api/analyze-public-v1` body `{ "instagram_username": "frederico.m.carvalho", "competitor_usernames": [] }`.
- Ler resposta: status, `analysis_snapshot_id`, `data_source`, eventual `error_code`.
- Ler `stack_modern--server-function-logs` filtrado por `analyze-public-v1` + `Apify` para confirmar que o 403 desapareceu e que actor profile + posts correram.

**Passo 2 — Validar snapshot persistido**
- `supabase--read_query`: `SELECT id, instagram_username, analysis_status, expires_at, jsonb_typeof(normalized_payload) AS payload_type, jsonb_array_length(normalized_payload->'recent_posts') AS posts_count, normalized_payload->'profile'->>'followers_count' AS followers FROM analysis_snapshots WHERE instagram_username='frederico.m.carvalho' ORDER BY created_at DESC LIMIT 1`.
- Validar shape: payload jsonb, posts > 0, followers numérico.

**Passo 3 — Submeter pedido real**
- `POST /api/request-full-report` com:
  ```json
  {
    "email": "frederico.carvalho@digitalfc.pt",
    "name": "Frederico Carvalho",
    "company": "Digital FC",
    "instagram_username": "frederico.m.carvalho",
    "analysis_snapshot_id": "<from Passo 2>",
    "request_source": "public_dashboard"
  }
  ```
- Ler resposta: `success`, `quota_status`, `lead_id`, `report_request_id`.
- Confirmar BD: `SELECT id, lead_id, analysis_snapshot_id, request_status, pdf_status, delivery_status, created_at FROM report_requests WHERE id='<id>'` + `SELECT id, email_normalized, name FROM leads WHERE email='frederico.carvalho@digitalfc.pt'`.

**Passo 4 — Observar pipeline em background (60–90s)**
- Aguardar com poll a cada 15s no `request_status` e `pdf_status`/`delivery_status`.
- Em paralelo ler logs filtrados por `orchestrate`, `generate-report-pdf`, `send-report-email`, `pdf`, `Resend`, `error`.
- Estados-alvo: `request_status='completed'`, `pdf_status='ready'`, `delivery_status='sent'`.

**Passo 5 — Validar PDF em Storage**
- `SELECT name, metadata->>'size' AS bytes, metadata->>'mimetype' AS mime, created_at FROM storage.objects WHERE bucket_id='report-pdfs' AND name LIKE '%<request_id>%'`.
- Critério: `bytes > 50000` e `mime = 'application/pdf'`. Sem download/render visual (custo desnecessário).

**Passo 6 — Diagnóstico email**
- Reler `report_requests` por id: `delivery_status`, `email_message_id`, `email_sent_at`, `email_error_message`.
- 3 cenários:
  - `sent` + `email_message_id` → ✅ entrega real validada (utilizador confirma inbox).
  - `RESEND_SANDBOX_RECIPIENT_BLOCKED` → bloqueador conhecido, smallest fix = verificar domínio Resend.
  - Outro erro → classificar pelo `email_error_message`.

**Passo 7 — Output final**
Tabela `Step | Status | Confidence | Blocker | Smallest next fix` + respostas explícitas A→G + recomendação do próximo prompt mínimo.

### Guardrails

| | |
|---|---|
| Sem código novo | ✅ |
| Sem refactor | ✅ |
| Sem libs | ✅ |
| Sem mudar copy/rotas/schema | ✅ |
| Locked files intactos | ✅ |
| Pt-PT preservado | ✅ |
| Apenas observação + diagnóstico | ✅ |
| Fixes documentados, não aplicados | ✅ |

### Fallbacks por cenário

- **Apify ainda 403** → parar, reportar, sugerir verificar plano no dashboard Apify (sem código).
- **Apify 200 mas snapshot não persiste** → ler logs `cache.ts`/`normalize.ts`, classificar como `PERSISTENCE_FAILED` ou `NORMALIZATION_FAILED`.
- **Pipeline trava em `processing`** → frágil `runInBackground` confirmado, smallest fix = invocar manualmente `/api/generate-report-pdf` para isolar Worker timing vs lógica.
- **PDF falha** → ler `pdf_error_message`; se for runtime (`@react-pdf/renderer` no Worker) → bloqueador arquitetónico, smallest fix = serviço PDF externo.
- **Email falha sandbox** → smallest fix = verificar domínio na Resend + trocar sender.

### Checkpoints

- ☐ Análise real disparada pós-upgrade
- ☐ Snapshot persistido + payload validado
- ☐ Pedido submetido + leads/report_requests criados
- ☐ Pipeline observado 60–90s
- ☐ PDF validado em storage por path + tamanho
- ☐ Email diagnosticado (sent | sandbox | outro)
- ☐ Tabela final + A→G + smallest next fix
- ☐ Zero ficheiros tocados
