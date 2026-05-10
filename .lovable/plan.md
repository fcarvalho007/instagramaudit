## Auditoria — estado atual

### Templates existentes (`src/lib/email/templates/`)
| Ficheiro | Renderer | Uso operacional |
|---|---|---|
| `welcome-beta.ts` | `renderWelcomeBeta` | ✅ Wired (orchestrator, `sendWelcome=true`) |
| `report-summary.ts` | `renderReportSummary` | ✅ Wired (orchestrator, sempre) |
| `personal-area-saved.ts` | `renderPersonalAreaSaved` | ⚠️ Wired em `unlock.server.ts` para **returning leads** — sobrepõe-se ao report-summary |
| `request-received.ts`, `report-ready.ts`, `feedback-request.ts`, `commercial-followup.ts` | — | Operacional/admin (beta requests, follow-ups manuais) — fora deste escopo |

### Wiring atual (`src/lib/unlock.server.ts:439-496`)
```text
if (createdReportRequest):
    if returningLead:
        sendPersonalAreaSavedEmail()            // ← duplica info
        record: personal_area_email_sent
    sendLeadMagnetSequence({ sendWelcome: !returningLead }):
        if sendWelcome: sendWelcomeBetaEmail()  // novo lead
        sendReportSummaryEmail()                // sempre
```

**Resultado por cenário:**
- Lead novo (1ª vez) → 2 emails: `welcome-beta` + `report-summary`
- Lead recorrente (mesmo email, novo perfil) → 2 emails: `personal-area-saved` + `report-summary` ⚠️ **redundância**
- Lead recorrente, mesmo `report_request_id` → 0 emails (dedup por `product_events`)

### Eventos emitidos (`product_events`)
- `beta_welcome_email_sent` / `beta_welcome_email_failed`
- `report_summary_email_sent` / `report_summary_email_failed` / `report_summary_skipped_no_data`
- `personal_area_email_sent` (⚠️ **sem** `_failed` correspondente)
- Stamp Brevo: `BETA_WELCOMED_AT` (após welcome-beta)

### Dedup
- Por `(lead_id, event_type, metadata.report_request_id)` no `eventAlreadyEmitted` da orchestrator.
- Linha defensiva final: idempotency key do sender (`flow + report_request_id`).
- ⚠️ `sendPersonalAreaSavedEmail` **não** passa pela orchestrator — não tem dedup por `product_events`, só pela idempotency key do `sendTransactionalEmail`.

### Numbers no report-summary — origem real?
✅ **Sim**, exclusivamente snapshot. `build-report-summary-data.server.ts:29-33` lê apenas `analysis_snapshots.normalized_payload` e passa por `snapshotToReportData` (mesma função do relatório web). Hard-gate (linhas 55-63) retorna `null` se faltar qualquer KPI — emite `report_summary_skipped_no_data` em vez de enviar valores fake. **Zero chamadas a Apify/DFS/OpenAI.**

---

## Avaliação `personal-area-saved`

Sobrepõe-se a `report-summary` em conteúdo (ambos confirmam que o relatório está guardado e linkam para o relatório/área pessoal), mas **sem KPIs reais**. Para o utilizador é ruído: 2 emails na mesma fração de segundo a dizer essencialmente o mesmo.

**Recomendação: depreciar como email transaccional.** Manter o ficheiro template como morto-mas-versionado durante 1 release (caso seja preciso reactivar) e remover na limpeza seguinte.

---

## Sequência final proposta

| Passo | Trigger | Quem recebe | Conteúdo |
|---|---|---|---|
| **1. welcome-beta** | `createdReportRequest && !returningLead` | Lead novo, 1ª vez no produto | Boas-vindas ao piloto, contexto MVP, CTA "Abrir relatório", explicação que fica guardado |
| **2. report-summary** | `createdReportRequest` (qualquer lead) | Sempre | KPIs reais do snapshot (followers, ER %, formato dominante, Δ benchmark) + top post + CTA relatório |

Fluxo final por cenário:
- Lead novo → `welcome-beta` (≤5s) + `report-summary` (≤5s) — 2 emails complementares (1 institucional, 1 com dados)
- Lead recorrente, novo perfil → apenas `report-summary` — sem repetir boas-vindas, sem `personal-area-saved`
- Mesmo `report_request_id` reaberto → 0 emails (dedup mantido)

### Triggers exactos (server)
Permanece em `src/lib/unlock.server.ts` no bloco `if (createdReportRequest)`:
```text
sendLeadMagnetSequence({
  sendWelcome: !returningLead,
  ...resto inalterado
})
```
Remover o bloco `if (returningLead) { sendPersonalAreaSavedEmail(...) }` (linhas 449-478).

### Lógica de dedup (inalterada)
- `eventAlreadyEmitted(leadId, reportRequestId, event_type)` em `product_events`
- Idempotency key no sender (`flow + report_request_id`) como rede de segurança

### Eventos finais
Manter:
- `beta_welcome_email_sent` / `_failed`
- `report_summary_email_sent` / `_failed` / `_skipped_no_data`
- `BETA_WELCOMED_AT` (Brevo)

Descontinuar (não emitir mais):
- `personal_area_email_sent` — manter histórico em DB; deixar de emitir.

### Hierarquia de copy
1. **welcome-beta** — institucional, 1ª impressão. Tom: "bem-vindo ao piloto", explica o que é o produto, fase MVP, pede uso/feedback. Sem números.
2. **report-summary** — utilitário, com substância. Tom: "este é o teu retrato", 4 KPIs reais, top post, CTA forte para relatório completo. Sem repetir explicação institucional.

**Princípio:** welcome-beta = quem somos. report-summary = o que descobrimos sobre ti. Nunca colidem.

---

## Ficheiros a manter / remover / adiar

**Manter:**
- `templates/welcome-beta.ts`, `send-welcome-beta.server.ts`
- `templates/report-summary.ts`, `send-report-summary.server.ts`, `build-report-summary-data.server.ts`
- `lead-magnet-sequence.server.ts`

**Remover wiring (manter ficheiro 1 release):**
- `templates/personal-area-saved.ts` — manter
- `send-personal-area-saved.server.ts` — manter mas deixar de chamar
- Bloco `if (returningLead)` em `unlock.server.ts:449-478` — **remover**
- Export de `renderPersonalAreaSaved` em `templates/index.ts` — manter (não quebra build)

**Não tocar:**
- `request-received`, `report-ready`, `feedback-request`, `commercial-followup` — fluxo admin de beta-requests, fora desta consolidação

---

## Prompt de implementação (para approval seguinte)

> Implement the consolidated lead-magnet sequence:
>
> 1. In `src/lib/unlock.server.ts`, remove lines 449-478 (the `if (returningLead) { sendPersonalAreaSavedEmail(...) }` block) — keep the `sendLeadMagnetSequence` call intact at lines 480-495.
> 2. Update the comment at lines 439-444 to reflect the new behaviour: returning leads receive only `report-summary`; new leads receive `welcome-beta` + `report-summary`.
> 3. Do NOT delete `send-personal-area-saved.server.ts` or `templates/personal-area-saved.ts` yet (keep one release for safety).
> 4. Add a test to `src/lib/email/__tests__/lead-magnet-sequence.test.ts` (or create) covering: returning lead receives only summary; new lead receives both; same `report_request_id` reattempt is dedup'd.
> 5. Run `bunx tsc --noEmit` and `bunx vitest run`.
> 6. No emails actually sent. No provider calls. No Brevo bulk sync.

Constraints:
- Não enviar nenhum email durante implementação.
- Não chamar Apify/DFS/OpenAI.
- Não alterar templates institucionais (`request-received`, etc).
- Plan-then-build: aguardar approval explícito antes de executar este prompt.
