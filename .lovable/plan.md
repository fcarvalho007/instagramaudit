## Estado das fases (auditoria)

| Fase | Estado |
|---|---|
| **Prompt 1** — Welcome Beta email | ✅ Concluído (template + sender + integração no `unlock.server` + `BETA_WELCOMED_AT`) |
| **Prompt 2** — Lookup endpoint + skip qualification | ⛔ Não iniciado |
| **Prompt 3** — Summary email + trigger manual no admin | ⛔ Não iniciado |
| **Prompt 4** — Evento `report_engaged` (frontend) | ⛔ Não iniciado |
| **Prompt 5** — Automação cron do summary | Adiado (fora do âmbito imediato) |

Proponho avançar com **Prompt 2 + Prompt 3** neste lote. O Prompt 4 fica para um lote separado (é puramente frontend e de baixo risco) e o Prompt 5 só faz sentido depois do summary estar validado manualmente.

---

## Prompt 2 — Lookup de lead e skip de qualificação para recorrentes

**Objetivo:** quando um lead recorrente reabre o modal de unlock, pular as 3 perguntas de qualificação se já as respondeu antes.

### Backend

Criar `src/routes/api/public/lookup-lead.ts` (server route):

- `POST { email }` com validação Zod (email válido, lower-cased no servidor).
- Rate limit por IP-hash: 5/min (reutilizar padrão existente em `report-unlock.ts` se existir, senão um in-memory simples como o já usado em outras rotas públicas).
- Resposta sempre constant-time, **sem PII**:
  ```
  { exists: boolean, has_qualification: boolean }
  ```
- `has_qualification = true` apenas se os 3 campos estiverem todos preenchidos no lead: `profile_ownership`, `purpose` (goal), `user_type`. Qualquer um nulo → `false`.
- Não revela `name`, `handle`, `lead_id`, datas. Não cria nada na BD.

### Frontend (`src/components/product/unlock-modal.tsx`)

- Após o submit do step 1 (email), antes de avançar, chamar `lookup-lead`.
- Se `exists && has_qualification`: marcar estado interno `skipQualification = true`, saltar steps 2-4, ir direto ao submit final (que chama `report-unlock` com payload mínimo: email + snapshot_id + handle; campos de qualificação ficam `undefined`).
- Caso contrário, fluxo atual (4 passos).
- Em caso de erro/timeout do lookup: fallback **conservador** = pedir as perguntas (não bloqueia o utilizador).
- Microcopy quando salta: success state mostra "Bem-vindo de volta — desbloqueámos diretamente".

### Backend `unlock.server.ts`

Já lida com merge conservador. Confirmar que payload mínimo (sem qualification) **não regrida** campos existentes do lead. Se necessário, ajuste ínfimo: só atualizar campos quando o input vier preenchido.

### Eventos

Reutilizar `returning_lead_detected` já existente. Não criar novos.

### Testes

- Unit do endpoint: 4 cenários (lead inexistente, lead sem qualification, lead com qualification completa, rate-limit).
- Validação `tsc --noEmit` + `vitest run`.

---

## Prompt 3 — Summary email + trigger manual no admin

**Objetivo:** segundo email de nutrição com KPIs reais do snapshot, disparado manualmente pelo admin (cron entra na fase seguinte).

### Template `src/lib/email/templates/report-summary.ts`

- Subject: "O teu raio-X de @{handle} em 60 segundos"
- Preheader: "4 números reais e o post que mais resultou."
- Headline: "Resumo da tua análise"
- KPI grid 2×2 (Inter SemiBold tabular-nums): Seguidores, Engagement médio %, Formato dominante, Δ vs benchmark (pp).
- Top post card: thumb via `/api/public/ig-thumb?url=...`, formato, engagement %.
- Microcopy + CTA "Ver relatório completo" → `${PUBLIC_APP_BASE_URL}/analyze/{handle}`.
- Reutilizar `escapeHtml`, `greetingHtml`, `renderButtonHtml`, `renderUrlFallbackHtml`, `signatureHtml` de `shared.ts`.
- Sem mocks; tudo a partir do snapshot.

Registar em `templates/index.ts` e em `email-template-registry.ts`.

### Helper `src/lib/email/build-report-summary-data.server.ts`

- `buildReportSummaryEmailData(snapshotId): Promise<ReportSummaryEmailData | null>`
- Lê `analysis_snapshots` + faz `snapshotToReportData()` (já existente).
- Extrai os 4 KPIs + top post (ordenado por engagement % desc).
- **Hard gate:** devolve `null` se faltar qualquer um dos 4 KPIs ou se não houver top post válido. Quem chamar regista evento `report_summary_skipped_no_data`.

### Sender `src/lib/email/send-report-summary.server.ts`

- Espelha `send-welcome-beta.server.ts`: `sendTransactionalEmail({ flow: "report-summary", ... })`.
- On success: regista `report_summary_email_sent` + `upsertBrevoContact({ email, attributes: { LAST_SUMMARY_SENT_AT: new Date().toISOString() } })` fire-and-forget.
- On failure: regista `report_summary_email_failed`.
- Adicionar `"report-summary"` ao union `TxFlow` e `FLOW_FAILURE_EVENT` em `transactional-email.server.ts`.

### Eventos novos em `tracking.functions.ts`

- `report_summary_email_sent`
- `report_summary_email_failed`
- `report_summary_skipped_no_data`

### Trigger admin

Em `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`:

- Adicionar botão "Enviar resumo do relatório" na zona de ações.
- Estado: desabilitado se (a) não há snapshot disponível, (b) helper devolve `null` (pré-validação), (c) já existe `report_summary_email_sent` para este lead (lookup nos `product_events`).
- Ação chama nova server function `sendReportSummaryFromAdmin({ leadId })` em `src/lib/admin/report-actions.ts` (ou ficheiro novo `report-summary.functions.ts`):
  - Resolve `lead → último report_request → snapshot_id`.
  - Constrói data, envia, regista evento, devolve `{ ok, reason? }`.
  - Protegido por middleware admin existente.

### Testes

- Unit do helper: ok, missing-kpi, missing-snapshot.
- Unit do sender: success path + failure path.
- Validação `tsc --noEmit` + `vitest run`.

---

## Restrições

- Sem alterações de schema.
- Sem cron, sem queue, sem novos providers.
- Brevo continua via `upsertBrevoContact` existente; atributos `LAST_SUMMARY_SENT_AT` precisam ser pré-criados como Date na UI Brevo (documentar, não bloqueia).
- Falha do summary nunca bloqueia outros fluxos.
- Copy pt-PT (Acordo 1990).

## Riscos e mitigações

1. **Lookup expor enumeração de emails** → rate-limit + resposta minimalista + constant-time.
2. **Summary com KPI vazio parecer pobre** → hard gate no helper, evento `skipped_no_data`.
3. **Admin reenviar summary por engano** → botão desabilitado se evento já existe; tooltip explica.
4. **Atributos Brevo a entrar como Text** → checklist documentada (não bloqueia envio).

## Checkpoint

☐ Avançar com Prompts 2 e 3 neste lote (Prompt 4 — `report_engaged` — fica para lote seguinte)?
☐ Confirmas que o botão admin do summary fica **single-shot** (desabilitado após primeiro envio bem-sucedido)?
☐ Confirmas que o lookup endpoint pode ficar em `/api/public/lookup-lead` sem auth, com rate-limit por IP-hash?