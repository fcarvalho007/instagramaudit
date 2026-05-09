## Lead Detail Sheet — vista `Comunicação` enriquecida

### Descoberta

A `LeadDetailSheet` já tem uma tab **Comunicação** (linhas 718–726 de `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`) que reutiliza `TimelineSection` filtrando por `COMMUNICATION_EVENT_TYPES = { report_link_sent, feedback_requested, feedback_started, email_failed, email_bounced }`. Limitações actuais:

- Não inclui **pedido recebido** (`beta_request_created`), nem **feedback submetido** (`feedback_submitted`), nem o sinal de **abertura** (`report_viewed`) nesta tab.
- Não mostra **message_id**, **recipient** nem **status badge** (Enviado / Falhou / Recebido / Aberto / Submetido) — apenas label + tempo.
- Não colapsa runs de `report_viewed` (a colapsagem só acontece na tab Histórico via `groupConsecutiveViews`).

Eventos realmente emitidos (verificado em `src/lib/tracking.functions.ts`, `src/routes/api/...`): `beta_request_created`, `report_link_sent` (com `metadata.message_id`, `metadata.recipient`, `metadata.channel`, `metadata.public_url`), `feedback_requested` (com `message_id`, `recipient`, `feedback_url`), `feedback_started`, `feedback_submitted`, `report_viewed` (sem recipient — é evento do lead, não envio). Não são emitidos hoje `request_received_email_sent`, `request_received_email_failed`, `email_failed`, `email_bounced` — ficam no mapa para suporte futuro mas não aparecem agora.

### Mapeamento `event_type → label / badge / extras`

| `event_type` | Label (pt-PT) | Badge | Extras mostrados |
|---|---|---|---|
| `beta_request_created` | Pedido recebido | Recebido (info) | — |
| `report_link_sent` | Link do relatório enviado | Enviado (success) | recipient, message_id |
| `feedback_requested` | Pedido de feedback enviado | Enviado (success) | recipient, message_id |
| `report_viewed` | Relatório aberto pelo lead | Aberto (signal) | colapsado: ×N visualizações |
| `feedback_started` | Formulário de feedback iniciado | Aberto (signal) | — |
| `feedback_submitted` | Feedback submetido | Submetido (success forte) | — |
| `email_failed` / `email_bounced` (futuro) | Falha no envio | Falhou (danger) | error_code (se houver) |

### Mudança proposta

**Ficheiros novos:** 1 · **alterados:** 1.

#### `src/components/admin/v2/beta-leads/communication-history.tsx` (novo)

Componente UI puro, recebe `timeline: TimelineEvent[]` e `loading: boolean`. Lógica:

1. Filtra `timeline` pelos `event_type` da tabela acima (set local — independente de `COMMUNICATION_EVENT_TYPES` do ficheiro principal, mais alargado).
2. Aplica `groupConsecutiveViews` (importado/copiado do ficheiro principal) para colapsar runs consecutivos de `report_viewed` num único item com `metadata.grouped_count`.
3. Renderiza linha por linha — mesmo estilo visual do `TimelineSection` actual mas com:
   - **Badge de estado** à direita (`Enviado` / `Falhou` / `Recebido` / `Aberto` / `Submetido`) usando `--admin-success-500`, `--admin-danger-500`, `--admin-info-500`, `--admin-accent-500`/signal — sempre via `style={{ background: "rgb(var(--...) / 0.12)", color: "rgb(var(--...))" }}`. Nunca cores hardcoded.
   - **Linha meta** em `admin-meta`: `Para: <recipient>` (se existir) · `ID: <message_id curto>` (font-mono — admin permite) · timestamp relativo + absoluto. Para `report_viewed` colapsado, `×N` em vez de recipient.
4. Botão "Ver mais" igual ao `TimelineSection` (limite inicial 10).
5. Empty state pt-PT: "Sem comunicações registadas para este lead."
6. Loading state com `Loader2` (mesmo padrão).

Sem fetch, sem mutações, sem botões de envio, sem importações de SMS/WhatsApp.

#### `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` (edit)

- Substituir o conteúdo do `<TabsContent value="comunicacao">` (linhas 719–726) por `<CommunicationHistory timeline={timeline} loading={timelineLoading} />`.
- Manter `COMMUNICATION_EVENT_TYPES` e `TimelineSection` intactos (usados pela tab Histórico e por outras zonas).
- Adicionar import do novo componente.

### Restrições respeitadas

- UI only — read-only. Sem schema, sem mutações, sem providers, sem emails.
- Sem novos endpoints, sem alterações a rotas públicas, sem `/report.example`.
- Sem importar nada do CRM Webinar (apenas padrão UX).
- Tokens `--admin-*` apenas; pt-PT/AO90; mobile-first (badge colapsa para baixo do label a <360px via `flex-wrap`).
- `report_viewed` colapsado evita inundação (×N pill em vez de 200 linhas).
- Outras tabs (`Resumo`, `Relatório`, `Feedback`, `Histórico`) e fluxos (`SendLinkButton`, `RequestFeedbackButton`) não são tocados.

### Validação

1. `bunx tsc --noEmit` → 0 erros.
2. `bunx vitest run` → 163/163.
3. Manual em `/admin/beta-leads`:
   - Lead com `report_link_sent` + várias `report_viewed` → mostra badge **Enviado** com `Para:` e `ID:`, mais uma linha **Aberto ×N**; mobile (411px) sem overflow horizontal.
   - Lead novo sem comunicações → empty state "Sem comunicações registadas para este lead.".
   - Tab `Histórico` continua a mostrar todos os eventos como antes.

### Fora de âmbito (próxima fase)

- Emitir `email_failed` / `email_bounced` (precisa webhook Resend + tabela ou metadata de falha).
- Mostrar abertura por click tracking (precisa Resend events).
- Reenvio rápido a partir desta vista (sai do âmbito read-only).