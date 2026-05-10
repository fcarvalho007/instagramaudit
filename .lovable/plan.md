## Estado atual

Os dois envios já existem como blocos inline dentro de `unlock.server.ts` (linhas 410-555):

- **welcome-beta** — só para brand-new leads (`!returningLead`), `await` (bloqueante dentro do try); `personal-area-saved` substitui-o em returning leads
- **report-summary** — fire-and-forget para todos, com `NO_DATA` → `report_summary_skipped_no_data`

**Dedup atual**: gate único `if (createdReportRequest)`. Isto cobre 99% dos casos mas é frágil (se algum dia chamarmos a sequência fora deste gate, ou se quisermos re-tentar manualmente, podemos duplicar emails). O spec pede dedup **explícito** consultando `product_events` por `(lead_id, report_request_id, event_type)`.

## Decisões

1. **Extrair para orquestrador, manter `personal-area-saved` inline.** A sequência lead-magnet ≠ comunicação para returning leads. O orquestrador trata só de welcome-beta + report-summary. O ramo returning lead continua a enviar `personal-area-saved` no `unlock.server.ts` (sem alteração de comportamento).

2. **Welcome-beta continua restrito a brand-new leads.** O orquestrador aceita `sendWelcome: boolean` (passado como `!returningLead` pelo unlock). Returning leads disparam só o resumo. Isto preserva o que já está em produção e evita enviar duas boas-vindas.

3. **Dedup via `product_events`** (substitui o gate atual):
   - Antes de cada envio, `SELECT id FROM product_events WHERE lead_id=$1 AND event_type=$2 AND metadata->>'report_request_id'=$3 LIMIT 1`
   - Se existir → `skipped_duplicate` (não emitir novo evento, apenas log).
   - Mantém o gate `createdReportRequest` no caller como otimização (evita query desnecessária na maioria dos unlocks repetidos), mas o dedup verdadeiro passa a estar no orquestrador.

4. **Sem delay artificial.** O Worker runtime do Lovable não tem suporte fiável a `setTimeout` longo nem job queue exposta. Sequencial síncrono (await welcome → await summary) é mais simples e suficiente. Se um dia houver pgmq/cron, adapta-se.

## Orquestrador

`src/lib/email/lead-magnet-sequence.server.ts`

```ts
export interface LeadMagnetSequenceArgs {
  leadId: string;
  reportRequestId: string;
  snapshotId: string;
  toEmail: string;
  firstName: string | null;
  instagramHandle: string;
  /** Send welcome-beta only when true (brand-new lead). Default false. */
  sendWelcome?: boolean;
}

export interface LeadMagnetSequenceResult {
  welcome: "sent" | "failed" | "skipped_duplicate" | "skipped_disabled";
  summary: "sent" | "failed" | "skipped_no_data" | "skipped_duplicate";
}

export async function sendLeadMagnetSequence(
  args: LeadMagnetSequenceArgs,
): Promise<LeadMagnetSequenceResult>
```

**Fluxo:**

1. **Welcome-beta** (apenas se `sendWelcome === true`):
   - Dedup: `eventAlreadyEmitted(leadId, reportRequestId, "beta_welcome_email_sent")` → se sim, `welcome = "skipped_duplicate"`.
   - Caso contrário: chama `sendWelcomeBetaEmail`. Emite `beta_welcome_email_sent` ou `beta_welcome_email_failed` (mesmo metadata atual).
   - Falha **não** aborta a sequência — passa ao summary.
   - Em sucesso, mantém o stamp Brevo `BETA_WELCOMED_AT` (move-se para dentro do orquestrador para não ficar duplicado).

2. **Report-summary** (sempre):
   - Dedup: idem com `report_summary_email_sent`.
   - Chama `sendReportSummaryEmail`. Emite `report_summary_email_sent`, `report_summary_email_failed` ou `report_summary_skipped_no_data`.

3. Devolve resultado estruturado para tests/admin.

**Helper interno** `eventAlreadyEmitted(leadId, reportRequestId, eventType)`:
```ts
const { data } = await supabaseAdmin
  .from("product_events")
  .select("id")
  .eq("lead_id", leadId)
  .eq("event_type", eventType)
  .eq("metadata->>report_request_id", reportRequestId)
  .limit(1)
  .maybeSingle();
return Boolean(data);
```
(Nota: jsonb path query no PostgREST — `metadata->>report_request_id`. Validar sintaxe; alternativa segura é `.contains("metadata", { report_request_id })`.)

## Mudanças em `unlock.server.ts`

Substituir as **duas** secções (welcome-beta block + report-summary block) por uma chamada única, mantendo o ramo returning lead intacto:

```ts
if (createdReportRequest) {
  const firstName = data.name ?? (existingLead?.name as ... ?? null);

  if (returningLead) {
    // mantém: sendPersonalAreaSavedEmail + recordProductEvent inline
  }

  // Sempre: lead-magnet sequence (fire-and-forget)
  void (async () => {
    const { sendLeadMagnetSequence } = await import(
      "@/lib/email/lead-magnet-sequence.server"
    );
    await sendLeadMagnetSequence({
      leadId,
      reportRequestId,
      snapshotId: data.analysis_snapshot_id,
      toEmail: data.email,
      firstName,
      instagramHandle: data.instagram_username,
      sendWelcome: !returningLead,
    });
  })().catch((err) => console.error("[unlock] lead-magnet sequence error:", err));
}
```

Ganho: 90 linhas a menos no `unlock.server.ts`, lógica testável isoladamente, dedup explícito que sobrevive a futuros call sites.

## Tests novos — `src/lib/email/__tests__/lead-magnet-sequence.test.ts`

Mocks: `supabaseAdmin.from("product_events")`, `sendWelcomeBetaEmail`, `sendReportSummaryEmail`, `recordProductEvent`, `upsertBrevoContact`.

1. **first unlock — brand-new lead**: `sendWelcome=true`, sem eventos prévios → ambos enviados; eventos `beta_welcome_email_sent` + `report_summary_email_sent` registados; resultado `{ welcome: "sent", summary: "sent" }`.
2. **first unlock — returning lead**: `sendWelcome=false` → welcome NÃO chamado, resultado `welcome: "skipped_disabled"`; summary enviado normalmente.
3. **duplicate unlock**: ambos os eventos já em `product_events` → ambos os senders **não** são chamados; resultado `{ welcome: "skipped_duplicate", summary: "skipped_duplicate" }`.
4. **welcome falha, summary OK**: welcome sender devolve `{ ok: false }` → emite `beta_welcome_email_failed`; summary chamado e enviado.
5. **summary sem dados**: builder devolve `null` (`reason: "NO_DATA"`) → emite `report_summary_skipped_no_data`, sem `_failed`.
6. **welcome dup, summary novo**: welcome já em `product_events`, summary não → welcome skipped, summary enviado.
7. **welcome OK dispara stamp Brevo**: verificar que `upsertBrevoContact` é chamado com `BETA_WELCOMED_AT` quando welcome=sent.

Adicionar também um teste mínimo ao `unlock-flow.test.ts` se necessário para garantir que o caller passa `sendWelcome: !returningLead` (provavelmente já coberto se mockarmos a sequência).

## Não tocar

- `personal-area-saved` (returning leads, ramo separado)
- Templates (`templates/welcome-beta.ts`, `templates/report-summary.ts`)
- Senders individuais (`send-welcome-beta.server.ts`, `send-report-summary.server.ts`, `build-report-summary-data.server.ts`)
- Allowlist de eventos em `tracking.functions.ts` (não há novos eventos)
- Cálculos do report
- UI pública
- Migração BD
- Provider stack (Brevo + Resend)

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (7 testes novos + suite atual)
- Manual:
  1. Unlock novo (lead inédito) → query `product_events` deve mostrar exatamente 1× `beta_welcome_email_sent` e 1× `report_summary_email_sent` para `(leadId, reportRequestId)`.
  2. Repetir o mesmo unlock (sem mudar snapshot) → não cria novos `product_events` (gate `createdReportRequest` evita até a chamada).
  3. Forçar reentrada com `createdReportRequest=true` (cenário hipotético via shell admin) → orquestrador deteta dup via `product_events` e não duplica envio.
  4. Lead com snapshot incompleto → `beta_welcome_email_sent` (se brand-new) + `report_summary_skipped_no_data`, sem email de resumo na inbox.
  5. Provider Brevo+Resend offline → `beta_welcome_email_failed` e `report_summary_email_failed`, unlock OK.

## Comportamento final

| Cenário | Welcome | Summary |
|---|---|---|
| Brand-new lead, primeira vez | sent | sent |
| Brand-new lead, retry no mesmo report_request | skipped_duplicate | skipped_duplicate |
| Returning lead, novo snapshot | skipped_disabled | sent |
| Returning lead, retry | skipped_disabled | skipped_duplicate |
| Snapshot incompleto | sent (se aplicável) | skipped_no_data |
| Provider falha | failed | failed (independente) |

## Ficheiros alterados

- **NOVO** `src/lib/email/lead-magnet-sequence.server.ts`
- **NOVO** `src/lib/email/__tests__/lead-magnet-sequence.test.ts`
- `src/lib/unlock.server.ts` — substitui ~90 linhas pelos ~12 do call da sequência (welcome+summary). Ramo `personal-area-saved` (returning leads) mantém-se intacto.

## Checkpoint

- ☐ `lead-magnet-sequence.server.ts` criado com `sendLeadMagnetSequence` + dedup via `product_events`
- ☐ `unlock.server.ts` simplificado, ramo `personal-area-saved` preservado
- ☐ 7 testes novos passam
- ☐ `bunx tsc --noEmit` limpo
- ☐ `bunx vitest run` 100%
- ☐ Validação manual: 1 unlock = 1 par de eventos `(beta_welcome_email_sent, report_summary_email_sent)` em `product_events`