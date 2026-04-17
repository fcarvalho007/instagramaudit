

## Entendimento

**1. Landing → analyze → gate**: hero (`/`) → `/analyze/$username` → `<PublicAnalysisDashboard>` → `<ReportGateModal>` → `POST /api/request-full-report` (insert `report_requests` com snapshot ligado, devolve `report_request_id` + `quota_status`).

**2. Análise + snapshots**: `/api/analyze-public-v1` cacheia 24h em `analysis_snapshots`, devolve `analysis_snapshot_id`.

**3. Full report request**: server route insere row em `report_requests` (defaults: `request_status='pending'`, `pdf_status='not_generated'`, `delivery_status='not_sent'`). Hoje **pára aqui** — nada acontece a seguir sem chamada manual.

**4. PDF v1**: `/api/generate-report-pdf` resolve `report_request_id → snapshot → render → upload bucket → update pdf_status='ready'`. Idempotente.

**5. Email v1**: `/api/send-report-email` exige header `X-Internal-Token`, faz lock optimista (`delivery_status='sending'`), gera signed URL 7d, envia via Resend, marca `delivery_status='sent'`.

**6. Porquê automatizar agora**: hoje o pipeline está parcelado e exige execução manual. O utilizador submete o gate, recebe "Pedido recebido", mas **nada gera o PDF nem envia o email**. As peças existem mas não estão encadeadas. O passo certo é orquestrar server-side, sem queue externa, mantendo as funções existentes intactas e reutilizadas.

---

## Decisões-chave

**A. Entry point: extensão da `/api/request-full-report`**
Após o insert bem-sucedido em `report_requests`, a própria route dispara a orquestração. Sem nova Edge Function, sem queue. Razão: latência baixa, código já no mesmo runtime, simples.

**B. Padrão "fire-and-forget" no Worker**
A orquestração corre em background **sem bloquear** a resposta HTTP ao cliente. O cliente recebe o `report_request_id` + sucesso imediatamente; o pipeline continua server-side. Em Cloudflare Workers usa-se `ctx.waitUntil(promise)` — TanStack Start expõe via `getEvent()` / handler context. Fallback: `void promise.catch(...)` (não bloqueia mas pode ser cortado se Worker terminar; aceita-se em v1 dado o low-volume).

**Decisão**: tentar `waitUntil` se disponível no contexto do handler; senão `void`. Encapsulado num helper `runInBackground(promise)`.

**C. Reutilização — chamada HTTP interna**
A orquestração chama `/api/generate-report-pdf` e `/api/send-report-email` por HTTP interno (via `fetch` para a própria origin). Razão: zero duplicação, respeita o contrato existente, idempotência já garantida por essas rotas. Construir URL absoluto a partir do `request.url` recebido no handler.

**Alternativa rejeitada**: extrair a lógica para módulos partilhados e chamar funções diretamente. Mais "limpo" no papel, mas exige refactor de duas rotas existentes (já estáveis e auditadas) — viola o guardrail de não duplicar/refazer. HTTP interno é mais barato e mais auditável.

**D. Modelo de status — minimalista**
Usar `request_status` (já existe) como estado agregado da orquestração:
- `pending` (default no insert)
- `processing` (ao iniciar a orquestração)
- `completed` (PDF + email OK)
- `failed_pdf` (PDF falhou)
- `failed_email` (PDF OK, email falhou — recuperável)

Step-level statuses (`pdf_status`, `delivery_status`) **continuam intactos** — já são granulares e suficientes para inspeção. Sem novas colunas.

**E. Idempotência e duplicate safety**
- A orquestração só dispara após **insert com sucesso** de uma row nova → cada `report_request_id` é único.
- `generate-report-pdf` já é idempotente (short-circuit em `pdf_status='ready'`).
- `send-report-email` já tem optimistic lock contra envio concorrente.
- Se a orquestração for re-invocada manualmente no futuro (admin re-run), respeitar a regra: **se `request_status='completed'` → não fazer nada**. v1 não expõe re-run, mas o helper já implementa o guard.

**F. Failure handling**
- `generate-report-pdf` falha → `request_status='failed_pdf'`, **não** chamar email.
- `send-report-email` falha → `request_status='failed_email'`, PDF fica gravado intacto (recuperável num prompt futuro com botão admin "re-enviar").
- Erros logged via `console.error` com prefixo `[orchestrate]`. Sem leaks ao utilizador (a UX modal já mostrou sucesso).

**G. UX após submit — sem alterações ao modal**
O modal já mostra `"Pedido recebido"` + `"O relatório de @x será enviado para email@... nos próximos minutos."` Tom calmo, premium, alinhado. **Zero mudanças** ao `report-gate-modal.tsx`. O cliente nunca espera pelo pipeline.

**H. Sandbox Resend**
Limitação conhecida: `onboarding@resend.dev` só entrega ao owner da conta. Em v1 o `request_status` ficará `failed_email` para a maioria dos leads — comportamento esperado e auditável até verificação de domínio. Sem mitigação adicional neste prompt.

---

## Ficheiros tocados

| Ficheiro | Acção | Locked? |
|---|---|---|
| `supabase/migrations/{ts}_request_lifecycle.sql` | **Criar** — index em `request_status` para queries futuras de admin (sem alterar default existente) | Não |
| `src/lib/orchestration/run-report-pipeline.ts` | **Criar** — helper `runReportPipeline(reportRequestId, origin)`: chama PDF route, depois email route, atualiza `request_status` em cada transição | Não |
| `src/routes/api/request-full-report.ts` | **Editar** — após insert OK, computa `origin` do `request.url`, dispara `runReportPipeline` em background (waitUntil/void), responde imediatamente como hoje | Não |

**Locked files**: nenhum. `report-gate-modal.tsx` não está locked mas **não vai ser modificado** — UX já cumpre o requisito.

**Sem novas dependências.** Sem novas Edge Functions Supabase. Sem queue.

---

## Schema (mínimo)

Apenas index — zero colunas novas, zero alterações de defaults:

```sql
CREATE INDEX IF NOT EXISTS report_requests_request_status_idx
  ON public.report_requests (request_status, created_at DESC);
```

`request_status` lifecycle (texto livre, sem enum para manter flexibilidade):
`pending → processing → completed | failed_pdf | failed_email`

---

## Fluxo da orquestração

```
POST /api/request-full-report
  ├─ valida + insert lead + insert report_requests (request_status='pending')
  ├─ resposta HTTP imediata ao cliente { success, report_request_id, ... }
  └─ background: runReportPipeline(report_request_id, origin)
        ├─ UPDATE request_status='processing'
        ├─ POST {origin}/api/generate-report-pdf  { report_request_id }
        │    ├─ se !ok: UPDATE request_status='failed_pdf' → STOP
        │    └─ se ok: continua
        ├─ POST {origin}/api/send-report-email
        │    headers: { X-Internal-Token: process.env.INTERNAL_API_TOKEN }
        │    body: { report_request_id }
        │    ├─ se !ok: UPDATE request_status='failed_email' → STOP
        │    └─ se ok: continua
        └─ UPDATE request_status='completed'
```

Pre-check em `runReportPipeline`: se `request_status` já é `'completed'` ou `'processing'`, abortar silenciosamente (idempotência).

---

## UX após submit

**Sem alterações.** O modal já mostra:
- `"Pedido recebido"` + `"O relatório de @x será enviado para email@... nos próximos minutos."` (state `success`)
- ou state `success-last` com aviso de quota.

Tom já é calmo, premium, impessoal, pt-PT. Cumpre os exemplos do prompt:
- ✅ "O pedido foi registado com sucesso." (mensagem do server)
- ✅ "O envio será feito por email assim que estiver pronto." (implícito em "nos próximos minutos")

---

## Validação dos guardrails

| Guardrail | Estado |
|---|---|
| Sem reanálise/scraping | ✅ |
| Sem regenerar PDF (idempotência reusada) | ✅ |
| Sem queue externa / job runner | ✅ |
| Sem novas libs | ✅ |
| Sem pagamentos / auth / admin UI | ✅ |
| Orquestração 100% server-side | ✅ |
| Browser não encadeia ações | ✅ |
| Locked files intactos | ✅ |
| Copy pt-PT impessoal mantido | ✅ |
| Modular: PDF + email reutilizados, não duplicados | ✅ |
| Future-ready (admin re-run, queue swap, retry) | ✅ |

---

## Checkpoints

- ☐ Migração: index em `request_status`
- ☐ `src/lib/orchestration/run-report-pipeline.ts` criado
- ☐ `request-full-report` dispara `runReportPipeline` em background após insert OK
- ☐ Resposta HTTP ao cliente continua imediata (sem aguardar pipeline)
- ☐ `request_status` transita: pending → processing → completed | failed_pdf | failed_email
- ☐ PDF route reutilizada via HTTP interno (sem duplicar lógica)
- ☐ Email route reutilizada via HTTP interno + `X-Internal-Token`
- ☐ Idempotência: re-invocar com `request_status='completed'` é no-op
- ☐ Failures preservam estado granular (`pdf_status`, `delivery_status`, mensagens internas)
- ☐ Sem alterações ao `report-gate-modal.tsx` (UX já cumpre o requisito)
- ☐ Sem queue / admin UI / pagamentos / auth / retry scheduler

