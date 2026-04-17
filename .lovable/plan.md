

## Entendimento

**1. Landing → analyze → gate**: hero (`/`) → `/analyze/$username` → `<PublicAnalysisDashboard>` → `<ReportGateModal>` → `POST /api/request-full-report` (quota server-side, insert em `report_requests` ligado ao `analysis_snapshot_id`).

**2. Análise + snapshots persistidos**: `/api/analyze-public-v1` faz cache 24h, persiste `analysis_snapshots` com `id` + `normalized_payload`. Frontend recebe `analysis_snapshot_id`.

**3. Report request**: `report_requests` tem `lead_id` (FK lógica → `leads`), `instagram_username`, `analysis_snapshot_id`, `pdf_status` ('not_generated'|'generating'|'ready'|'failed'), `pdf_storage_path`, `pdf_generated_at`, e crucialmente já tem `delivery_status text default 'not_sent'` desde a génese.

**4. Snapshot link**: cada request liga a um snapshot exacto, validado por username no insert.

**5. PDF v1 gerado**: `/api/generate-report-pdf` resolve `report_request_id → snapshot → render → upload bucket privado `report-pdfs` → update`. Idempotente. Path determinístico `reports/{YYYY}/{MM}/{request_id}.pdf`.

**6. Porquê email reusar PDF stored**: o artefacto já existe, é imutável e auditável. Regenerar custaria CPU + duplicaria storage churn + arriscaria *drift* de benchmark se o dataset cloud mudasse entre PDF e email. Email v1 = puro `(report_request_id) → fetch row → assert pdf_status='ready' → signed URL → Resend → update delivery_status`. Sem PDF render, sem snapshot read, sem provider.

---

## Discrepâncias e decisões

**`delivery_status` já existe**: a coluna `delivery_status text NOT NULL DEFAULT 'not_sent'` já está no schema. Decisão: **reusar** em vez de adicionar `email_status`. Lifecycle: `'not_sent' → 'sending' → 'sent' | 'failed'`. Schema mais limpo, zero conflito com colunas legadas. Os 3 campos novos a adicionar: `email_sent_at timestamptz`, `email_message_id text`, `email_error_message text`.

**Signed URL vs attachment**: signed URL. v1 mais robusto (sem limite de tamanho de email, sem rejeições por anexos pesados, sem fontkit-Worker-attachment edge cases). TTL **7 dias** — suficiente para o utilizador agir, curto o suficiente para não vazar indefinidamente. URL gerado on-send, não persistido (regenerável a cada re-send).

**Idempotência — escolha clara**: **re-send permitido sempre**. Cada call sobrescreve `email_sent_at` + `email_message_id`. Razão: signed URLs expiram; impedir re-send forçaria a regenerar PDF para emitir novo link, que viola guardrail "não regenerar". Re-send simples e seguro = melhor v1. `delivery_status='sent'` + chamar de novo → re-envia, novo timestamp, novo message_id.

**Resend API key**: secret `RESEND_API_KEY` ainda **não está configurado**. Plano usa `add_secret` no início. Sem ela, route devolve `error_code: "EMAIL_PROVIDER_NOT_CONFIGURED"`.

**Sender identity**: `relatorios@instabench.pt` ainda não tem domínio verificado no Resend. Decisão v1: usar **`onboarding@resend.dev`** (sandbox do Resend, funciona sem domain verification). Documentar como tech debt — assim que o utilizador tiver domínio verificado em Resend, troca-se uma constante. Resend permite envio de teste de qualquer domínio via sandbox.

**Sem Edge Function Supabase**: project knowledge é claro — usar TanStack Server Routes. Implementar como `/api/send-report-email`. (Apesar do prompt dizer "Edge Function", segue-se a arquitectura do projecto).

**Sem `@react-email/components`**: o template é simples e a integração `scaffold_transactional_email` traz infra pesada (queue pgmq, cron, suppression, unsubscribe tokens) que excede o scope deste prompt. Decisão: **HTML inline** num template literal pt-PT, premium, com fallback `text/plain`. Quando o produto evoluir para emails de marketing/lifecycle, pode adoptar-se a infra completa. v1 é uma chamada directa `fetch` ao Resend API com HTML inline.

**Resolver lead**: `report_requests.lead_id` → `SELECT email, name FROM leads WHERE id = $1`. Se faltar email → `LEAD_EMAIL_MISSING`.

---

## Ficheiros tocados

| Ficheiro | Acção | Locked? |
|---|---|---|
| `supabase/migrations/{ts}_email_delivery_tracking.sql` | **Criar** — `ALTER report_requests ADD email_sent_at, email_message_id, email_error_message` | Não |
| `src/lib/email/report-email-template.ts` | **Criar** — `buildReportEmailHtml()` + `buildReportEmailText()` em pt-PT | Não |
| `src/routes/api/send-report-email.ts` | **Criar** — server route POST, valida → fetch row → fetch lead → signed URL → Resend → update | Não |

**Secret a adicionar** (via `add_secret`): `RESEND_API_KEY` — necessária antes de a route funcionar.

**Zero ficheiros locked tocados.** Confirmado contra `LOCKED_FILES.md`.

---

## Schema da migração

```sql
ALTER TABLE public.report_requests
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_message_id text,
  ADD COLUMN IF NOT EXISTS email_error_message text;
```

`delivery_status` (`'not_sent' | 'sending' | 'sent' | 'failed'`) já existe — reusar.

---

## Fluxo do server route

```
POST /api/send-report-email
  body: { report_request_id: uuid }

1. Zod validate payload
2. Check RESEND_API_KEY present
   → if missing: { error_code: "EMAIL_PROVIDER_NOT_CONFIGURED" }
3. SELECT report_requests (id, lead_id, instagram_username, pdf_status,
                           pdf_storage_path, request_month, delivery_status,
                           email_sent_at)
   → if not found: { error_code: "REQUEST_NOT_FOUND" }
4. Validate pdf_status === 'ready' AND pdf_storage_path
   → if not: { error_code: "PDF_NOT_READY" }
5. SELECT leads (email, name) WHERE id = lead_id
   → if no email: mark failed + { error_code: "LEAD_EMAIL_MISSING" }
6. UPDATE delivery_status = 'sending', email_error_message = null
7. Generate signed URL (TTL 7d) for pdf_storage_path
   → if fails: mark failed + { error_code: "SIGNED_URL_FAILED" }
8. Build email HTML + plain text from template
9. POST https://api.resend.com/emails with sandbox sender
   → if !ok: mark failed + { error_code: "RESEND_FAILED" }
10. UPDATE delivery_status='sent', email_sent_at=now(), email_message_id=<resend id>
11. Return { success: true, ... }
```

---

## Email template — pt-PT premium

**Subject**: `O relatório do perfil @{username} está pronto`

**HTML body** (resumo):
- Header: `INSTABENCH` wordmark
- Heading: `O relatório está pronto`
- Lead text: `A análise completa de @{username} já está disponível.`
- Meta line: `Inclui benchmark por tier, leitura de métricas-chave e comparação com concorrentes.`
- CTA button: `Aceder ao relatório` → signed URL
- Fallback text: `Em alternativa, copiar o seguinte endereço:` + `<code>{signedUrl}</code>`
- Note: `O acesso ao ficheiro expira dentro de 7 dias.`
- Signature: `InstaBench · Relatórios premium para Instagram`

Inline styles, fundo branco, sem dark mode (premium editorial print-ready feel). Sem unsubscribe link (transaccional puro, gerado por acção do utilizador).

---

## Idempotência — regra v1

**Re-send sempre permitido.** Sem flag `force` necessária. Cada call:
- Sobrescreve `email_sent_at` com novo timestamp
- Sobrescreve `email_message_id` com novo id do Resend
- Mantém `delivery_status = 'sent'` no sucesso
- Gera signed URL nova (7d a contar do momento do re-send)

Ratione: signed URLs expiram, utilizadores podem perder email, suporte pode pedir re-envio. Bloquear re-send seria UX-hostile. Risco de spam (mesmo lead recebe múltiplos) é mitigado pela natureza low-volume + auditável (`email_sent_at` mostra histórico no campo, e poderemos adicionar `email_send_count` numa fase posterior se necessário).

---

## Resposta do route

**Sucesso**:
```json
{
  "success": true,
  "report_request_id": "uuid",
  "delivery_status": "sent",
  "email_sent_at": "2026-04-17T...",
  "message": "Report email sent."
}
```

**Falha**:
```json
{
  "success": false,
  "error_code": "INVALID_PAYLOAD" | "REQUEST_NOT_FOUND" | "PDF_NOT_READY"
              | "LEAD_EMAIL_MISSING" | "SIGNED_URL_FAILED"
              | "RESEND_FAILED" | "EMAIL_PROVIDER_NOT_CONFIGURED"
              | "PERSISTENCE_FAILED",
  "message": "..."
}
```

Mensagens internas em inglês (server-to-server, futuro admin).

---

## Validação dos guardrails

| Guardrail | Estado |
|---|---|
| Sem regenerar PDF | ✅ |
| Sem provider/Apify call | ✅ |
| Sem pagamentos / auth / admin UI | ✅ |
| Sem trigger automático no frontend | ✅ |
| Resend server-side only | ✅ |
| Secret em Supabase (`RESEND_API_KEY`) | ✅ |
| Locked files intactos | ✅ |
| Email pt-PT impessoal | ✅ |
| Comentários em inglês | ✅ |
| Schema mínimo (3 colunas, reusa `delivery_status`) | ✅ |
| Future-ready (auto-trigger / admin / attachments adicionáveis) | ✅ |

---

## Checkpoints

- ☐ Secret `RESEND_API_KEY` adicionada
- ☐ Migração: `email_sent_at` + `email_message_id` + `email_error_message`
- ☐ Reusa `delivery_status` existente (`not_sent | sending | sent | failed`)
- ☐ `src/lib/email/report-email-template.ts` com HTML + text pt-PT
- ☐ `/api/send-report-email` orquestra fetch → signed URL 7d → Resend → update
- ☐ Signed URL gerado on-send (não persistido)
- ☐ Re-send sempre permitido, sobrescreve timestamp + message_id
- ☐ Erros estruturados, sem stack leaks, `delivery_status='failed'` em falhas
- ☐ Sender sandbox `onboarding@resend.dev` em v1 (tech debt anotado)
- ☐ Sem PDF re-render / Apify / pagamentos / auth / admin / trigger automático

