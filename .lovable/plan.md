## Diagnóstico

A ação **"Pedir feedback"** já existe no Lead Detail Sheet (botão + dialog `FeedbackRequestDialog` + endpoint `POST /api/admin/send-feedback-request`) e cumpre 5 dos 6 requisitos:

- ✅ Botão na ficha do lead (secção Relatório)
- ✅ Habilitado apenas com email + handle + estado em `link_enviado` / `relatorio_visto` / `feedback_pedido`
- ✅ Modal mostra destinatário, assunto, link e pré-visualização do corpo
- ✅ Em sucesso: envia via Resend, regista evento, atualiza status, toast
- ✅ Em falha: status só muda após 200 OK do provider
- ❌ **Falta o aviso "Este relatório ainda não foi registado como visto."**
- ⚠️ Pequenos refinamentos: bloquear quando `feedback` já foi recebido e alinhar nome do evento com a spec/timeline

Plano cirúrgico (sem alterar lógica do envio nem o template).

---

## 1. Aviso "ainda não foi visto" no modal

`src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` → `FeedbackRequestDialog`.

Calcular `notViewed = lead.report_views === 0` e renderizar dentro do `description`, antes do bloco "Pré-visualização":

```tsx
{notViewed && (
  <div
    className="flex items-start gap-2 rounded-lg p-3 text-[13px]"
    style={{
      backgroundColor: "rgba(234,179,8,0.08)",
      border: "1px solid rgba(234,179,8,0.2)",
    }}
  >
    <AlertTriangle size={15} style={{ color: "#D97706" }} className="shrink-0 mt-0.5" />
    <div>
      <p className="font-medium m-0" style={{ color: "#D97706" }}>Sem visualização registada</p>
      <p className="mt-0.5 text-admin-text-secondary m-0">
        Este relatório ainda não foi registado como visto. Podes enviar
        mesmo assim — o pedido continuará válido quando o lead abrir o link.
      </p>
    </div>
  </div>
)}
```

`AlertTriangle` já está importado no ficheiro.

---

## 2. Bloquear quando feedback já foi submetido

`FeedbackRequestButton` recebe a `EnrichedLead` que agora inclui `feedback`. Adicionar regra:

```ts
else if (lead.feedback) disabledReason = "Feedback já recebido.";
```

Defesa server-side já existe (status passa a `feedback_recebido`, fora do `ELIGIBLE_STATUSES`).

---

## 3. Alinhar nome do evento com a spec e a timeline

Hoje o endpoint regista `feedback_request_sent`, mas a `EVENT_LABELS` e a `EVENT_ICONS` da timeline (e o `tracking.functions.ts` allowlist) só conhecem `feedback_requested` — resultado: o evento aparece sem label amigável.

Mudança mínima:

- `src/routes/api/admin/send-feedback-request.ts`:
  - `eventType: "feedback_request_sent"` → `eventType: "feedback_requested"`
  - Atualizar comentários do header e o JSDoc
- `src/lib/admin/lead-lifecycle.ts`: remover o caso obsoleto `case "feedback_request_sent"` (manter apenas `feedback_requested`).
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`: a linha do dialog que diz `<code>feedback_request_sent</code>` passa a `<code>feedback_requested</code>`.

Sem migration. Eventos antigos (se existirem) continuam a aparecer como “linha crua” na timeline — aceitável por serem residuais.

---

## 4. Validação

- `bunx tsc --noEmit` limpo
- `bunx vitest run` 100% verde
- Manual:
  - Lead em `link_enviado` com 0 views → modal mostra aviso amarelo + permite envio
  - Lead em `link_enviado` com views > 0 → sem aviso
  - Lead com `feedback` preenchido → botão desativado com tooltip "Feedback já recebido."
  - Sucesso: toast + status `feedback_pedido` + evento `feedback_requested` na timeline com label "Feedback pedido ao lead"
  - Falha provider (chave em falta / 502) → toast erro, status inalterado

---

## Ficheiros tocados

**Editados (3)**
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` — aviso no dialog, regra de desativação, código no rodapé
- `src/routes/api/admin/send-feedback-request.ts` — `feedback_requested`
- `src/lib/admin/lead-lifecycle.ts` — remover `feedback_request_sent`

**Não tocados**
- `src/lib/email/templates/feedback-request.ts` (template)
- `src/routes/api/public/feedback.$requestId.ts`
- Pipelines de relatório, PDF, providers
- Schema / migrations

---

## Checkpoint

- ☐ Aviso "ainda não visto" visível quando `report_views === 0`
- ☐ Botão desativado se `lead.feedback` já existe
- ☐ Evento gravado como `feedback_requested` e visível na timeline com label
- ☐ Status muda apenas após sucesso do provider
- ☐ `tsc --noEmit` limpo · `vitest` verde