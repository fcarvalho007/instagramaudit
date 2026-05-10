## Auditoria rápida

- **`/me` no `unlock-modal.tsx`**: a string literal `"/me"` **não existe** no ficheiro. A frase mais próxima é a description do `WelcomeBackState` (l.1219): _"Vamos guardar este report na tua área pessoal."_ — sem link e sem `/me`. O link `signupHref` aponta para `/signup?email=…`. O único `/me` no projecto é em `cost-sync.server.ts` (URL da Apify, fora de âmbito).
- **`EVENT_LABELS` em `lead-detail-sheet.tsx`** (l.134-158): existe, cobre 22 dos 30 eventos pedidos. Em falta: `personal_area_email_sent`, `personal_area_email_failed`, `beta_welcome_email_sent`, `beta_welcome_email_failed`, `report_summary_email_sent`, `report_summary_email_failed`, `brevo_email_sent`, `resend_fallback_email_sent`, `resend_fallback_email_failed`, `request_received_email_sent`, `request_received_email_failed`. Fallback actual = string crua (`ev.event_type`).

## Alterações

### 1. Copy do modal — `src/components/product/unlock-modal.tsx`

- L.1219: substituir _"Vamos guardar este report na tua área pessoal."_ por **"Podes voltar a consultar este relatório na tua área pessoal."** (versão preferida pelo briefing).
- Não há `/me` para remover. `signupHref` mantém-se (`/signup?...`) — leva à criação de conta, não à área pessoal; fora de âmbito.

### 2. Novo módulo `src/lib/admin/event-labels.ts`

Exports:

```ts
export const EVENT_LABELS: Record<string, string> = { /* 30 eventos pt-PT */ };
export function humanizeEventType(eventType: string): string;
export function getEventLabel(eventType: string): string;
```

`humanizeEventType` faz fallback legível: substitui `_` por espaço, faz sentence case (primeira letra maiúscula, restantes minúsculas).
`getEventLabel(t)` = `EVENT_LABELS[t] ?? humanizeEventType(t)`.

Cobertura completa (30 eventos da lista) com pt-PT consistente:

| event_type | label |
|---|---|
| unlock_email_submitted | Email submetido para desbloqueio |
| unlock_completed | Relatório desbloqueado |
| returning_lead_detected | Lead recorrente detetado |
| report_saved_to_account | Relatório guardado na conta |
| brevo_contact_synced | Contacto sincronizado com Brevo |
| brevo_contact_sync_failed | Falha na sincronização Brevo |
| personal_area_email_sent | Email da área pessoal enviado |
| personal_area_email_failed | Falha no envio do email da área pessoal |
| beta_welcome_email_sent | Email de boas-vindas enviado |
| beta_welcome_email_failed | Falha no envio do email de boas-vindas |
| report_summary_email_sent | Resumo do relatório enviado |
| report_summary_email_failed | Falha no envio do resumo do relatório |
| brevo_email_sent | Email Brevo enviado |
| brevo_email_failed | Falha no envio de email Brevo |
| resend_fallback_email_sent | Email Resend (fallback) enviado |
| resend_fallback_email_failed | Falha no envio do email Resend (fallback) |
| request_received_email_sent | Email de pedido recebido enviado |
| request_received_email_failed | Falha no envio do email de pedido recebido |
| report_link_sent | Link do relatório enviado |
| feedback_requested | Feedback pedido ao lead |
| feedback_started | Feedback iniciado pelo lead |
| feedback_submitted | Feedback submetido pelo lead |
| commercial_followup_sent | Follow-up comercial enviado |
| commercial_followup_failed | Falha no envio do follow-up comercial |
| pricing_clicked | Preço clicado |
| pricing_option_clicked | Opção de preço clicada |
| report_viewed | Relatório visualizado |
| report_generated | Relatório gerado |
| beta_request_created | Pedido beta criado |
| lead_status_changed | Estado comercial alterado |
| request_status_changed | Estado do pedido alterado |

Eventos extra já existentes que mantenho (não estão na lista do briefing mas estão no código): `unlock_clicked`, `module_visibility_published`, `public_report_link_copied`.

### 3. Refactor `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`

- Remover bloco local `EVENT_LABELS` (l.134-158).
- `import { getEventLabel } from "@/lib/admin/event-labels";`.
- L.1065: substituir `{EVENT_LABELS[ev.event_type] ?? ev.event_type}` por `{getEventLabel(ev.event_type)}`.

### 4. Teste — `src/lib/admin/__tests__/event-labels.test.ts`

- `humanizeEventType("foo_bar_baz")` → `"Foo bar baz"`.
- `humanizeEventType("")` → `""`.
- `getEventLabel("unlock_completed")` → `"Relatório desbloqueado"`.
- `getEventLabel("evento_desconhecido_qualquer")` → `"Evento desconhecido qualquer"` (fallback).
- Os 30 eventos do briefing existem em `EVENT_LABELS`.

## Fora de âmbito

- Schema, providers, emails (Brevo/Resend), report calculations, redesign público.
- Refactor de `EVENT_ICONS` (mantém-se in-place — só labels foram pedidas).

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run src/lib/admin/__tests__/event-labels.test.ts`
- QA manual: abrir um lead na CRM, confirmar labels pt-PT em eventos recentes; confirmar que um event_type inventado aparece formatado e não cru.

## Checkpoint

- ☐ Copy do modal actualizada
- ☐ `src/lib/admin/event-labels.ts` criado com 30+ labels + fallback
- ☐ `lead-detail-sheet.tsx` consome o módulo, sem map local
- ☐ Teste verde
- ☐ tsc limpo
