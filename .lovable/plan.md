
Email confirmado: `frederico.carvalho@digitalfc.pt`. Vou correr o smoke test guiado conforme plano aprovado, com o email do dono Resend para validar entrega física real.

## Plano executável (zero código novo)

**Passo 1 — Triagem inicial**
- Ler logs publicados filtrados por `analyze-public-v1`, `Apify`, `error` para perceber se houve tentativas falhadas com `frederico.m.carvalho`.
- Confirmar BD: `analysis_snapshots` para esse username (incluindo expiradas).

**Passo 2 — Forçar análise real**
- `POST /api/analyze-public-v1` com `{ instagram_username: "frederico.m.carvalho", competitor_usernames: [] }`.
- Inspecionar: status, `analysis_snapshot_id`, `data_source`, `error_code` se falhar.
- Validar persistência: `SELECT id, instagram_username, expires_at, jsonb_typeof(normalized_payload) FROM analysis_snapshots WHERE instagram_username = 'frederico.m.carvalho'`.
- Se falhar Apify → ler logs server, classificar (token? timeout? actor inválido? PROFILE_NOT_FOUND?).

**Passo 3 — Submeter pedido real**
- `POST /api/request-full-report` com:
  - `email: "frederico.carvalho@digitalfc.pt"`
  - `name: "Frederico Carvalho"`
  - `company: "Digital FC"`
  - `instagram_username: "frederico.m.carvalho"`
  - `analysis_snapshot_id` do Passo 2
  - `request_source: "public_dashboard"`
- Validar resposta: `success`, `quota_status`, `lead_id`, `report_request_id`.
- Confirmar BD: `leads` upsertou + `report_requests` linkou snapshot.

**Passo 4 — Observar pipeline em background (60–90s)**
- Ler logs filtrados por `orchestrate`, `generate-report-pdf`, `send-report-email`, `pdf`, `Resend`, `error`.
- Reler `report_requests` por `id`: `request_status`, `pdf_status`, `pdf_storage_path`, `pdf_generated_at`, `pdf_error_message`, `delivery_status`, `email_sent_at`, `email_message_id`, `email_error_message`.

**Passo 5 — Validar PDF em storage**
- `SELECT name, metadata->>'size' AS size, metadata->>'mimetype' AS mimetype FROM storage.objects WHERE bucket_id = 'report-pdfs' AND name LIKE '%{report_request_id}%'`.
- Confirmar tamanho razoável (>50KB) e mimetype `application/pdf`. Sem download/render visual.

**Passo 6 — Diagnóstico email**
- `delivery_status='sent'` + `email_message_id` → ✅ entrega real validada (procurar inbox `frederico.carvalho@digitalfc.pt`).
- `RESEND_SANDBOX_RECIPIENT_BLOCKED` → bloqueador sandbox confirmado, smallest fix = verificar domínio na Resend.
- Outro erro → classificar pelo `email_error_message`.

**Passo 7 — Output final**
Tabela `Step | Status | Confidence | Blocker | Smallest next fix` + respostas A→G + recomendação do próximo prompt mais pequeno.

## Guardrails ativos

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

## Checkpoints

- ☐ Logs server inspecionados pré-teste
- ☐ Análise real disparada + snapshot persistido (ou falha classificada)
- ☐ Pedido submetido com snapshot válido (ou falha classificada)
- ☐ Pipeline observado 60–90s + estados finais lidos
- ☐ PDF validado em storage por path + size
- ☐ Email diagnosticado (sent | sandbox-block | outro)
- ☐ Tabela final + A→G + smallest next fix entregues
- ☐ Zero ficheiros tocados

Aprovas para correr?
