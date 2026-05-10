## Communication Tab — Lead Detail Sheet (InstaBench CRM)

The Communication tab already exists, with `CommunicationHistory` rendered in tab `comunicacao`. The plan is therefore an **extension + rename**, not a from-scratch build: add the 4 missing email events, add a new badge state ("Guardado"), surface failure reasons consistently, and rename the component to `LeadCommunicationTimeline` as requested.

### 1. Files changed

| File | Action |
|---|---|
| `src/components/admin/v2/beta-leads/lead-communication-timeline.tsx` | **New.** Renamed and extended replacement for `communication-history.tsx`. |
| `src/components/admin/v2/beta-leads/communication-history.tsx` | **Delete.** Sole consumer is `lead-detail-sheet.tsx`. |
| `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` | Update import + JSX usage (`<LeadCommunicationTimeline />`). Drop now-unused `COMMUNICATION_EVENT_TYPES` set. |
| `src/components/admin/v2/beta-leads/__tests__/lead-communication-timeline.test.tsx` | **New.** Cover: empty state copy, sent vs. failed rendering, recipient + message_id + reason fields, `report_viewed` collapse, badge mapping for the 4 new events. |

No backend, schema, route, or email-sending code is touched.

### 2. Events included (final mapping)

Source of truth confirmed in code (`unlock.server.ts`, `beta.functions.ts`, `send-report-email.ts`, `feedback.$requestId.ts`, `lead-events.server.ts`):

| event_type | Label (pt-PT) | Badge | Icon |
|---|---|---|---|
| `request_received_email_sent` | Confirmação de pedido enviada | Enviado | Mail |
| `request_received_email_failed` | Falha na confirmação de pedido | Falhou | AlertCircle |
| `personal_area_email_sent` | Email da área pessoal enviado | Enviado | Mail |
| `personal_area_email_failed` | Falha no email da área pessoal | Falhou | AlertCircle |
| `report_link_sent` | Link do relatório enviado | Enviado | Mail |
| `feedback_requested` | Pedido de feedback enviado | Enviado | Mail |
| `feedback_started` | Formulário de feedback iniciado | Aberto | MessageCircle |
| `feedback_submitted` | Feedback submetido | Submetido | CheckCircle2 |
| `commercial_followup_sent` | Follow-up comercial enviado | Enviado | Mail |
| `commercial_followup_failed` | Falha no follow-up comercial | Falhou | AlertCircle |
| `email_failed` *(legacy, generic)* | Falha no envio de email | Falhou | AlertCircle |
| `email_bounced` *(legacy)* | Email devolvido | Falhou | AlertCircle |

Excluded from the Communication tab:
- `report_viewed` → kept in main "Histórico" tab. Already excluded here (not in the whitelist) — keeps tab focused on outbound communication. The collapse helper stays for safety but won't run.
- `beta_request_created`, `report_generated`, `unlock_*`, `pricing_*`, `lead_status_changed`, `module_visibility_published`, `request_status_changed`, `returning_lead_detected`, `report_saved_to_account`, `unlock_email_submitted`, `unlock_completed` → not communication, stay in Histórico.

The full timeline tab (`historico`) is untouched.

### 3. Status badge mapping

Spec mentions five badges: Enviado, Falhou, Aberto, Submetido, **Guardado**. None of the current/expected events naturally map to "Guardado" (saving is a UI action, not an email). Two options — pick one:

- **(default in this plan)** Add the badge kind to the type system but don't assign it yet, so future events (e.g. `commercial_note_saved`) can use it without a refactor.
- Map `personal_area_email_sent` to "Guardado" instead of "Enviado" — semantically wrong (it's still an outbound email), not recommended.

Token mapping (admin tokens only, no hard-coded colors):

| Badge | Token |
|---|---|
| Enviado | `--admin-revenue-500` |
| Falhou | `--admin-danger-500` |
| Aberto | `--admin-signal-500` |
| Submetido | `--admin-leads-500` |
| Guardado | `--admin-info-500` |

(`Recebido` from the current implementation is dropped — `beta_request_created` is not in the whitelist anymore.)

### 4. Metadata surfaced per row

| Field | Source key(s) | Display |
|---|---|---|
| Recipient | `metadata.recipient` | "Para: …" (truncated, mobile-safe) |
| Message ID | `metadata.message_id` | Mono short form `abc123…ef01` + copy-to-clipboard |
| Report/request link | `metadata.report_request_id` | "Pedido #abcd1234" linking to `/admin/v2/beta-leads?lead=…` if same lead, else passive label |
| Public link | `metadata.public_url` ‖ `metadata.feedback_url` | "Abrir link" with ExternalLink icon |
| Failure reason | `metadata.reason` ‖ `metadata.error_code` ‖ `metadata.http_status` (formatted "HTTP 4xx") | Danger-token line: "Erro: …" |
| Timestamp | `created_at` | `formatDate` absolute + `relativeTime` |

`request_received_email_failed` only carries `http_status` — the helper falls back to `HTTP {status}` so it's never blank.

### 5. Empty state

Replace current text with the exact spec copy:

> Ainda não há comunicações registadas.

### 6. UI / accessibility

- Mobile-first: existing flex layout already wraps; verified at 375 px in current build, kept.
- Semantic admin tokens only (`text-admin-text-primary`, `--admin-*-500`, `admin-meta`, `admin-section-title`). No hard-coded hex.
- No new dependencies.
- Tooltip / hover hints kept minimal — the row itself shows recipient + ID + reason inline.

### 7. Constraints respected

- UI / read-only. No emails, no Resend, no provider calls, no DB mutation, no schema change, no public-report change.
- `lead-detail-sheet.tsx` keeps the Histórico tab for the full timeline.

### 8. Validation

- `bunx tsc --noEmit`
- `bunx vitest run` (incl. new `lead-communication-timeline.test.tsx`)
- Manual: lead with `request_received_email_failed` shows red "Falhou" badge + HTTP status; lead with no events shows new empty copy; mobile 375 px has no overflow.

### Open question (please confirm before I implement)

The "Guardado" badge has no current event source. Confirm option **A** (reserve the badge kind for the future, don't assign now) — or pick another mapping.
