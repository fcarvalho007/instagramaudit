# Ação admin: enviar link público ao beta tester

Adiciona uma ação **"Enviar link"** no Lead Detail Sheet que envia o link do relatório público (`/analyze/:handle`) por email via Resend, regista `report_link_sent` e move o estado comercial para `link_enviado`.

Distinto do envio de PDF existente (`/api/send-report-email`): aquele envia o PDF por signed URL com auth interno; este envia o **link público** com auth de admin.

## Ficheiros a criar / alterar

### 1. `src/lib/email/report-link-email-template.ts` (novo)
Template pt-PT inline-styles, sem unsubscribe.

- **Assunto:** `O teu relatório InstaBench já está pronto`
- **Corpo (HTML + text)**:
  - Saudação: `Olá {primeiro_nome},` ou `Olá,` se não houver nome
  - Parágrafo 1: «A análise do perfil **@{handle}** já está disponível para consultares.»
  - Botão: **"Abrir relatório"** → URL pública
  - URL em texto monoespaçado abaixo (fallback)
  - Parágrafo: «Este é um relatório beta — pode evoluir nos próximos dias com base no que aprendermos.»
  - Parágrafo: «Depois de explorares, agradecemos imenso se nos enviares feedback. Vamos contactar-te em breve para o pedir.»
  - Footer InstaBench
- Sem promessas exageradas. Sem link de unsubscribe.

Exporta `buildReportLinkEmailSubject()`, `buildReportLinkEmailHtml(params)`, `buildReportLinkEmailText(params)` e uma helper isomórfica `buildPreviewBody(params)` para o modal de confirmação reusar (texto plano resumido).

### 2. `src/routes/api/admin/send-report-link.ts` (novo server route)
`POST /api/admin/send-report-link`

- `requireAdminSession()`
- Input zod: `{ lead_id: string; report_request_id: string }`
- Verifica `RESEND_API_KEY` → 500 `EMAIL_PROVIDER_NOT_CONFIGURED` se ausente
- Carrega `report_requests` (id, lead_id, instagram_username, request_status, analysis_snapshot_id) e valida:
  - `request_status ∈ {completed, ready, generated, approved}` E `analysis_snapshot_id` presente → senão 409 `REPORT_NOT_READY`
- Carrega `leads` (id, email, name) → valida email com regex → 422 `LEAD_EMAIL_MISSING`/`LEAD_EMAIL_INVALID`
- Constrói URL pública: usa `process.env.PDF_PUBLIC_BASE_URL` se existir, senão derivado do header `Origin`/`Host` do request (preferindo `https://`). Forma final: `${base}/analyze/${handle}`
- Envia via Resend (timeout 10s, mesmo padrão de `send-report-email.ts`); reusa `SENDER_FROM = "InstaBench <onboarding@resend.dev>"`
- Em **sucesso**:
  - `recordProductEvent({ eventType: "report_link_sent", leadId, snapshotId, handle, metadata: { report_request_id, message_id, channel: "admin_manual", recipient: email_normalizado } })` — o timestamp é o `created_at` do evento
  - `updateLeadCommercialStatus({ leadId, status: "link_enviado", source: "manual", reason: "admin sent public report link" })` (do helper criado na fase anterior)
  - Devolve `{ success: true, message_id, sent_at, public_url }`
- Em **falha** de envio: NÃO altera `commercial_status`; devolve `error_code` adequado (`RESEND_FAILED`, `RESEND_TIMEOUT`, `RESEND_SANDBOX_RECIPIENT_BLOCKED`)
- Logs: apenas excerto do erro (até 300 chars), sem secrets, sem corpo da resposta Resend

### 3. `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` (alterar)
Na grelha de ações da secção **Relatório**, adicionar botão `Enviar link` (ícone `Send` ou `Mail`).

**Visibilidade:**
- Sempre presente quando `lead.handle && lead.report_request_id`
- **Ativo** quando: `lead.email` existe E `lead.report_status ∈ {completed, ready, generated}` E `lead.handle` existe
- **Desativado** caso contrário, com `title` explicativo:
  - sem email: «Lead sem email — não é possível enviar.»
  - sem relatório: «Este lead ainda não tem relatório público disponível.»
  - sem handle: «Handle Instagram em falta.»

Click → abre `<SendLinkDialog>` (novo componente local no mesmo ficheiro, à imagem do `GenerateReportDialog`).

### 4. `<SendLinkDialog>` (novo, dentro de `lead-detail-sheet.tsx`)
Modal de confirmação com `ConfirmDialog`. Mostra preview:

- **Para:** `{lead.email}`
- **Perfil:** `@{lead.handle}`
- **Link público:** `${origin}/analyze/${lead.handle}` (em mono, com botão copiar)
- **Assunto:** `O teu relatório InstaBench já está pronto`
- **Pré-visualização do corpo:** primeiros 6–8 linhas em texto plano (do `buildPreviewBody`)
- Botão confirmar: **"Enviar email"** (loading state «A enviar…»)

`onConfirm` faz `POST /api/admin/send-report-link` com `{ lead_id, report_request_id }`, lê `success` e:
- sucesso: `toast.success("Link enviado por email")`, fecha modal, chama `onRefresh?.()`
- falha: lê `error_code` e mostra `toast.error` com mensagem pt-PT mapeada:
  - `EMAIL_PROVIDER_NOT_CONFIGURED` → «Email provider não configurado.»
  - `LEAD_EMAIL_MISSING` → «Lead sem email.»
  - `LEAD_EMAIL_INVALID` → «Email do lead inválido.»
  - `REPORT_NOT_READY` → «Este lead ainda não tem relatório público disponível.»
  - `RESEND_SANDBOX_RECIPIENT_BLOCKED` → «Resend está em modo sandbox — só pode enviar para o dono da conta. Verificar domínio.»
  - `RESEND_TIMEOUT` / `RESEND_FAILED` → «Falha ao enviar email. Tenta novamente.»
  - default → «Erro ao enviar.»

## Sem alterações de schema

- `link_enviado` já existe no lifecycle (fase anterior)
- `report_link_sent` já está em `ALLOWED_EVENTS` e tem o timestamp em `product_events.created_at`
- Sem novas colunas

## Comportamento de estado

| Resultado | `report_link_sent` event | `commercial_status` |
|---|---|---|
| Email enviado | ✅ inserido | ✅ `link_enviado` |
| Resend falhou | ❌ não inserido | ❌ não muda |
| Provider não configurado | ❌ | ❌ |
| Lead sem email | ❌ | ❌ |
| Relatório não pronto | ❌ | ❌ |

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Smoke manual:
  1. Lead com email + relatório completo → botão ativo, modal mostra preview, envio OK, status muda para `link_enviado`, evento aparece no timeline
  2. Lead sem email → botão desativado com tooltip
  3. Lead com `report_status = pending` → botão desativado com tooltip
  4. Forçar erro (chave Resend inválida em ambiente local) → toast erro, status **não** muda

## Fora de âmbito

- Geração/regeneração de relatório (já existe acção separada)
- Envio automático sem confirmação
- Templates configuráveis por admin
- Tracking de cliques no link (fica para fase futura quando houver UTM/redirector)
