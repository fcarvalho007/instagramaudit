

## Plano — Re-validação após upgrade para Creator + smoke test E2E

O utilizador confirma upgrade para plano **Creator**. Vou repetir o smoke test exatamente como aprovado anteriormente, agora que o bloqueio de plano foi resolvido.

### Contexto dos uploads
- PDF 1: confirma subscription page no console Apify (Creator)
- PDF 2: confirma actor `shu8hvrXbJbY3Eb9W` (= `apify/instagram-scraper`) acessível na conta

Não preciso ler os PDFs — a informação já está confirmada na mensagem.

### Sequência (idêntica ao plano anterior aprovado)

1. **Análise real** — `POST /api/analyze-public-v1` para `frederico.m.carvalho`, sem competidores. Esperado: 200 + `success: true` + `analysis_snapshot_id`.
2. **Snapshot persistido** — query `analysis_snapshots` por `cache_key` para validar `normalized_payload` íntegro.
3. **Pedido de relatório** — `POST /api/request-full-report` com snapshot_id + `frederico.carvalho@digitalfc.pt`.
4. **Pipeline** — observar `report_requests.status` evoluir até `completed` (60-90s).
5. **PDF em storage** — validar `pdf_storage_path` + ficheiro existe + tamanho >50KB.
6. **Email** — validar `email_sent_at` + entrega Resend.

### Saída
Tabela A→G com resultado de cada etapa + smallest next fix se algo falhar.

### Guardrails
| | |
|---|---|
| Zero código novo | ✅ |
| Zero refactor | ✅ |
| Apenas observação | ✅ |
| Locked files intactos | ✅ |
| pt-PT preservado | ✅ |

### Checkpoints
- ☐ Análise real devolve 200 + snapshot ID (espero passar agora pós-Creator)
- ☐ Snapshot persistido com payload válido
- ☐ Lead + report_request criados
- ☐ Pipeline corre até `completed`
- ☐ PDF em storage com tamanho razoável
- ☐ Email diagnosticado
- ☐ Tabela A→G + smallest next fix

