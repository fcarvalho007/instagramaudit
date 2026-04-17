

## Plano — Smoke test end-to-end (sem alterações de código)

Decisão registada: manter slug `apify/instagram-scraper`. Avançar para validação real.

### Sequência do smoke test

**1. Análise real (Apify unified actor)**
- Disparar `POST /api/analyze-public-v1` com `instagram_username: "frederico.m.carvalho"`, sem competidores
- Esperado: 200 + `success: true` + `analysis_snapshot_id` presente + `data_source: "fresh"`
- Validar: `profile.followers_count > 0`, `content_summary.posts_analyzed > 0`, `latestPosts` populado

**2. Snapshot persistido**
- Query `analysis_snapshots` por `cache_key` correspondente
- Validar: `normalized_payload` contém `{ profile, content_summary, competitors }` íntegro
- Validar: `updated_at` recente (<1min)

**3. Pedido de relatório completo**
- Disparar `POST /api/request-full-report` com `analysis_snapshot_id` + `email: "frederico.carvalho@digitalfc.pt"`
- Validar: cria row em `leads` + `report_requests` com `status: "pending"`

**4. Pipeline orquestrado (60-90s)**
- Observar `report_requests.status` evolução: `pending` → `generating_pdf` → `sending_email` → `completed`
- Logs do worker: confirmar invocação de `run-report-pipeline.ts`

**5. PDF em storage**
- Validar `report_requests.pdf_storage_path` populado
- Confirmar ficheiro existe no bucket + tamanho > 50KB

**6. Email entregue**
- Validar `report_requests.email_sent_at` populado
- Confirmar entrega via Resend (ou identificar bloqueio sandbox/domínio)

### Checkpoints

- ☐ Análise real devolve 200 + snapshot ID
- ☐ Snapshot persistido com payload válido
- ☐ Lead + report_request criados
- ☐ Pipeline corre até `completed` em 60-90s
- ☐ PDF existe em storage com tamanho razoável
- ☐ Email diagnosticado (sent | sandbox-blocked | outro)
- ☐ Tabela final A→G + smallest next fix
- ☐ Zero ficheiros tocados

### Saída esperada

Tabela A→G:
- A. Análise real funciona pós-upgrade?
- B. Snapshot persistido?
- C. Request flow funciona?
- D. PDF gerado em runtime?
- E. Email entregue?
- F. Pipeline end-to-end OK?
- G. Smallest next fix (se algum)

### Guardrails

| | |
|---|---|
| Zero código novo | ✅ |
| Zero refactor | ✅ |
| Locked files intactos | ✅ |
| Apenas observação + diagnóstico | ✅ |
| pt-PT preservado | ✅ |

