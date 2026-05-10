## Estado atual

Template e formatter já existem mas não estão ligados ao unlock. Falta o sender e o disparo.

| Peça | Estado |
|---|---|
| `templates/report-summary.ts` | ✅ existe (4 KPIs + top post + CTA) |
| `build-report-summary-data.server.ts` | ✅ extrai do snapshot via `snapshotToReportData` (única fonte de verdade) |
| Allowlist eventos `report_summary_email_sent` / `_failed` / `_skipped_no_data` | ✅ em `tracking.functions.ts` |
| Mapping em `transactional-email.server.ts` | ✅ `report-summary → report_summary_email_failed` |
| Sender `send-report-summary.server.ts` | ❌ falta |
| Disparo em `unlock.server.ts` | ❌ falta |
| Subject/preheader iguais ao spec | ⚠️ desalinhados (ver abaixo) |
| Testes formatter + template | ❌ falta |

## Decisão sobre nomes de ficheiros

- **Manter** `build-report-summary-data.server.ts` (em vez do `report-summary-data.ts` do spec). O sufixo `.server.ts` está protegido contra import no client e é padrão neste projeto. Renomear não traz benefício e mexe em imports do admin registry.
- **Manter** `templates/report-summary.ts` (já no caminho que o spec pede).

## Refinamentos a aplicar

### 1. `src/lib/email/templates/report-summary.ts`
- Subject → `"Resumo da análise de @{handle}"` (literal do spec) em `buildSubject`.
- Preheader → `"Os principais sinais do teu relatório InstaBench."`.
- Manter `HEADLINE = "Resumo da tua análise"`, KPI grid, top post card, CTA "Ver relatório completo" — já cumprem spec.
- Sem mudanças de design/layout.

### 2. Novo `src/lib/email/send-report-summary.server.ts`
Espelha o padrão do `send-welcome-beta.server.ts`:

```
sendReportSummaryEmail({
  toEmail, firstName, leadId, reportRequestId, snapshotId,
}) → { ok, messageId, provider } | { ok: false, reason }
```

Fluxo:
1. `buildReportSummaryEmailData(snapshotId)` — se devolver `null`, retornar `{ ok: false, reason: "NO_DATA" }` (caller emite `report_summary_skipped_no_data`).
2. `renderReportSummary({ firstName, instagramHandle: data.instagramHandle, reportUrl: resolveReportUrl(handle), kpis, topPost })`.
3. `sendTransactionalEmail({ flowType: "report-summary", ... })` — Brevo + Resend fallback já existentes.
4. Nunca lança.

### 3. `src/lib/unlock.server.ts`
Logo após o bloco `welcome-beta` (dentro do mesmo `if (createdReportRequest)`), adicionar bloco fire-and-forget para o resumo. Vai sair só uma vez por `(lead, snapshot)` graças ao mesmo gate. Aplica a brand-new **e** returning leads (cada relatório novo merece resumo).

```
void (async () => {
  const { sendReportSummaryEmail } = await import(
    "@/lib/email/send-report-summary.server"
  );
  const res = await sendReportSummaryEmail({
    toEmail: data.email,
    firstName,
    leadId,
    reportRequestId,
    snapshotId: data.analysis_snapshot_id,
  });
  if (res.ok) {
    await recordProductEvent({
      eventType: "report_summary_email_sent",
      leadId, snapshotId: data.analysis_snapshot_id,
      handle: data.instagram_username,
      metadata: { message_id: res.messageId, provider: res.provider, report_request_id: reportRequestId },
    });
  } else if (res.reason === "NO_DATA") {
    await recordProductEvent({
      eventType: "report_summary_skipped_no_data",
      leadId, snapshotId: data.analysis_snapshot_id,
      handle: data.instagram_username,
      metadata: { report_request_id: reportRequestId },
    });
  } else {
    await recordProductEvent({
      eventType: "report_summary_email_failed",
      leadId, snapshotId: data.analysis_snapshot_id,
      handle: data.instagram_username,
      metadata: { reason: res.reason, report_request_id: reportRequestId },
    });
  }
})().catch((err) => console.error("[unlock] report-summary email error:", err));
```

Wraps em `void`/`catch` para não bloquear o unlock nem o welcome-beta. (`createdReportRequest = true` garante 1 envio por (lead, snapshot).)

### 4. `src/lib/admin/email-template-registry.ts`
- Atualizar `wiredAt` do `report_summary` para `"src/lib/email/send-report-summary.server.ts (após unlock)"`.
- Atualizar o preheader de preview para `"Os principais sinais do teu relatório InstaBench."`.

## Campos usados (do snapshot)

Do `snapshotToReportData`:
- `data.profile.followers` → KPI Seguidores
- `data.keyMetrics.engagementRate` → KPI Engagement médio (%)
- `data.keyMetrics.dominantFormat` → KPI Formato dominante
- `data.keyMetrics.engagementDeltaPct` → KPI Δ vs benchmark (pp)
- `data.topPosts[0]` → top post (format, engagementPct, thumbnailUrl, permalink)

Origem secundária: `instagram_username` da própria row `analysis_snapshots`.

## Regras do formatter (já implementadas, validar com testes)

- Hard-gate: se faltar followers, engagement, formato, top post ou top.engagement → devolve `null` (caller emite `report_summary_skipped_no_data`, **não** envia email).
- Followers ≤ 0 ou engagement ≤ 0 contam como em falta.
- `benchmarkDeltaPp` em falta cai para `0` (não bloqueia o envio — é métrica auxiliar).
- Sem fallback inventado: nada de "estimado", "≈", placeholders.
- Template escapa HTML em todos os campos via `escapeHtml`.

## Testes a criar

`src/lib/email/__tests__/report-summary.test.ts`:
1. `renderReportSummary` produz subject `"Resumo da análise de @frederico.m.carvalho"` e preheader literal do spec.
2. Valores KPI no HTML correspondem ao input (`12.480`, `3,42 %`, `Carrosséis`, `+1,2 pp`).
3. HTML escapa tentativa de injeção: handle `"a<b>c"` aparece como `a&lt;b&gt;c`.
4. Top post sem `permalink` não envolve em `<a>`; sem `thumbnailUrl` usa fallback gradient.

`src/lib/email/__tests__/build-report-summary-data.test.ts`:
5. Snapshot completo → todos os campos extraídos exatamente do `snapshotToReportData`.
6. Snapshot sem followers → `null`.
7. Snapshot sem `topPosts[0]` → `null`.
8. Snapshot com `engagementDeltaPct` ausente → KPI cai para `0` mas devolve objeto.

(Mock de `supabaseAdmin` + `snapshotToReportData` via `vi.mock`.)

## Não tocar

- Cálculos do relatório (`snapshotToReportData`, benchmarks)
- UI pública do report
- Apify / OpenAI / DataForSEO
- Welcome-beta (já enviado em paralelo)
- `personal-area-saved` (returning leads continuam a recebê-lo)
- Migração BD

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (8 testes novos + suite atual)
- Manual:
  1. Unlock novo → `welcome-beta` **e** `report-summary` chegam ao inbox; números no email = números no `/analyze/{handle}`.
  2. Unlock 2× mesmo (email, snapshot) → 1 só email de cada (gate `createdReportRequest`).
  3. Snapshot incompleto (followers=0) → unlock OK, evento `report_summary_skipped_no_data`, sem email.
  4. Provider Brevo+Resend a falhar → `report_summary_email_failed` em `product_events`, unlock OK.
  5. CTA do email abre `https://instagramaudit.lovable.app/analyze/{handle}`.

## Eventos finais

- `report_summary_email_sent` — `{ message_id, provider, report_request_id }`
- `report_summary_email_failed` — `{ reason, report_request_id }`
- `report_summary_skipped_no_data` — `{ report_request_id }` (já registado quando snapshot insuficiente)

## Ficheiros alterados / criados

- `src/lib/email/templates/report-summary.ts` (subject + preheader)
- **NOVO** `src/lib/email/send-report-summary.server.ts`
- `src/lib/unlock.server.ts` (novo bloco fire-and-forget)
- `src/lib/admin/email-template-registry.ts` (wiredAt + preheader)
- **NOVO** `src/lib/email/__tests__/report-summary.test.ts`
- **NOVO** `src/lib/email/__tests__/build-report-summary-data.test.ts`