## Auditoria de envio de emails (read-only)

### Mapa de fluxos

| Flow | Endpoint / ficheiro | Template | Eventos `product_events` | Transição `commercial_status` | Notas / risco |
|---|---|---|---|---|---|
| Pedido recebido (form beta) | `src/lib/beta.functions.ts` (server fn `submitBetaRequest`, linhas 186–235) | `renderRequestReceived` (`@/lib/email/templates`) | `beta_request_created`, depois `request_received_email_sent` ou `request_received_email_failed` | Não toca (lead criado com `novo_pedido` por default da tabela) | Fire-and-forget; usa `RESEND_API_KEY` direto + `from: onboarding@resend.dev` (sandbox Resend, não pelo domínio próprio nem pela queue Lovable Email). Falha silenciosa se faltar key. |
| Envio do link do relatório (admin) | `src/routes/api/admin/send-report-link.ts` | `renderReportReady` (`@/lib/email/templates`) | `report_link_sent` (success path apenas) via `lead-events.server` | `→ link_enviado` (com `maybeAdvanceLeadStatus`, nunca regride) | OK. Fonte canónica para envio do link. |
| Pedido de feedback (admin) | `src/routes/api/admin/send-feedback-request.ts` | `renderFeedbackRequest` (`@/lib/email/templates`) | `feedback_requested` | `→ feedback_pedido` (apenas se atual ∈ {`link_enviado`, `relatorio_visto`, `feedback_pedido`}) | OK. |
| Follow-up comercial | _nenhum_ | `renderCommercialFollowup` exportado em `src/lib/email/templates/index.ts` mas **sem call-site** | — | — | **Template órfão.** Existe + testado mas nenhum endpoint o invoca. |
| Preview no admin sheet | `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` (linhas 1011, 1169) | `renderReportReady`, `renderFeedbackRequest` (apenas para preview de subject/text na UI) | — | — | OK. Render-only para o sheet, não envia. |
| Legacy: envio direto do report email | `src/routes/api/send-report-email.ts` | `@/lib/email/report-email-template` | `report_link_sent` (linha 351) | Atualiza `report_requests.delivery_status` (`sending`/`sent`/`failed`); **não** mexe em `commercial_status` | **Endpoint legacy ainda exposto** (`/api/send-report-email`). Sem chamada interna em `src/`. Tem optimistic lock + `INTERNAL_API_TOKEN`. Pode ser chamado externamente; risco se ainda houver cron/integração que dependa dele. |

### Templates órfãos

- `renderCommercialFollowup` — sem call-site.

### Templates legacy ainda em uso

- `src/lib/email/report-email-template.ts` — usado **apenas** por `src/routes/api/send-report-email.ts` (rota legacy).
- `src/lib/email/report-link-email-template.ts` — **não existe** no repo. Já foi removido.

### Recomendações

| Item | Recomendação |
|---|---|
| `renderRequestReceived` em `beta.functions.ts` | **Migrar** para a infraestrutura padrão (queue Lovable Email + domínio próprio) em vez de `RESEND_API_KEY` + `onboarding@resend.dev`. Atualmente envia de uma sandbox e ignora a fila. |
| `renderReportReady` em `send-report-link.ts` | **Keep** (canónico). |
| `renderFeedbackRequest` em `send-feedback-request.ts` | **Keep** (canónico). |
| `renderCommercialFollowup` (órfão) | **Do not touch / pending wiring.** Confirmar com o utilizador se há endpoint planeado. Caso contrário, candidato a `delete later`. |
| `src/routes/api/send-report-email.ts` + `src/lib/email/report-email-template.ts` | **Delete later** após confirmar que nenhum sistema externo (cron, automation, integração) ainda chama `/api/send-report-email`. Hoje todo o fluxo admin passa por `send-report-link.ts` com `renderReportReady`. |

### Pontos de atenção (sem ação agora)

1. **Inconsistência de provider/from**: `beta.functions.ts` usa `onboarding@resend.dev` (sandbox Resend), enquanto `send-report-link.ts` e `send-feedback-request.ts` usam o caminho/`from` correto. Isto provavelmente reduz deliverability do email de "pedido recebido".
2. **Nenhum endpoint atual move o lead para um estado pós-`feedback_pedido`** via email — coerente com `renderCommercialFollowup` ainda não estar ligado.
3. `send-report-email.ts` (legacy) regista `report_link_sent` igual ao novo endpoint — se ambos forem chamados para o mesmo lead/snapshot, pode duplicar o evento. Como não há call-site interno do legacy, na prática não acontece, mas é um risco se reactivado.

### Validação

- Sem alterações de código.
- Auditoria executada apenas com `rg`, leituras pontuais de ficheiros e inspeção do `routeTree.gen.ts`.
