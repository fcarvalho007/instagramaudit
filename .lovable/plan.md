# Step 5 — Rewrite `commercial_followup` copy

Goal: replace the generic "Próximos passos" sales copy with a narrative continuation of the free report. Keep all wiring, prices, checkout URLs, payment logic, schema and the manual admin send route untouched.

## Files changed

1. **`src/lib/email/templates/commercial-followup.ts`** — rewrite copy + structure. Backward-compatible input shape.
2. **`src/lib/admin/email-template-registry.ts`** — update `shortDescription`, `wiredNote`, `preheader`, and the `variables` preview list for `commercial_followup`.

No changes to:
- `src/routes/api/admin/send-commercial-followup.ts` (the admin manual sender keeps working as-is — same prop names).
- Any pricing, checkout, EuPago, credit, report-generation, or schema file.
- `template-overrides.server.ts` (variable map unchanged at runtime; we only add an optional `insights` field that the sender does not pass yet).

## Template rewrite — `commercial-followup.ts`

**New subject (dynamic per handle):**
`O que o relatório gratuito ainda não mostra sobre @{handle}`
If handle is missing, falls back to `O que o relatório gratuito ainda não mostra sobre o teu perfil`.

**Preheader:**
`A comparação com concorrentes e a evolução temporal ficam no relatório completo.`

**Headline (dark navy header in `wrapHtml`):**
`O relatório completo responde à pergunta seguinte`

**Input shape — fully backward compatible:**

```ts
export interface CommercialFollowupInsights {
  engagementVerdict?: string | null; // ex.: "está acima da média no engagement"
  gapArea?: string | null;           // ex.: "há margem nos comentários e na consistência dos formatos"
}

export interface CommercialFollowupInput {
  firstName?: string | null;
  instagramHandle?: string | null;
  reportUrl?: string | null;
  replyToEmail?: string | null;
  checkoutUrl?: string | null;
  unsubscribeUrl?: string | null;
  insights?: CommercialFollowupInsights | null; // NEW, optional
}
```

The admin sender does not pass `insights`, so today every send uses the **generic narrative fallback** — no broken placeholders.

**Body sections, in order:**

1. Greeting (`Olá {firstName},` or `Olá,`).
2. Lead-in paragraph: `A análise gratuita de @{handle} já mostrou uma primeira leitura:`
3. Subtle insight card (light surface, 3 px navy-blue left border, "PRIMEIRA LEITURA" eyebrow). Content:
   - With insights: `o perfil {engagementVerdict}, mas ainda {gapArea}.`
   - Without insights (default for current admin flow): `o que está a funcionar bem e onde ainda há margem para crescer.`
4. Question paragraph: `**A pergunta seguinte é mais importante:** isto é um bom resultado isolado, ou está realmente acima dos concorrentes directos?`
5. Bridge sentence: `É essa leitura que fica no relatório completo.`
6. `O relatório completo desbloqueia:` followed by a `<ul>` with the 5 bullets:
   - comparação com perfis semelhantes;
   - leitura temporal para perceber se o engagement está a subir ou a descer;
   - análise dos formatos que estão a puxar melhor desempenho;
   - identificação de oportunidades editoriais;
   - leitura completa das secções disponíveis.
7. Reassurance block (muted card, 3 lines):
   - `Não é uma subscrição.`
   - `Não há renovação automática.`
   - `É um pagamento único para desbloquear este relatório.`
8. Primary CTA — preserves existing logic (no price/URL changes):
   - `checkoutUrl` present → button `Desbloquear relatório completo` → `checkoutUrl`.
   - else if `replyToEmail` present → button `Responder para desbloquear` → `mailto:replyToEmail`.
   - else muted line `Para desbloquear, basta responderes a este email.` (current safe reply fallback).
9. Secondary note (muted): `Se a análise for para uso académico, equipa ou clientes, responde a este email{ ou escreve para {replyTo}}. Há formas melhores de usar isto em escala.`
10. Optional `Rever o relatório gratuito: …` link when `reportUrl` is present.
11. Signature + optional unsubscribe footer (unchanged helpers).

**Important guarantees:**
- No hardcoded prices, plan names ("7€", "Pack 5 relatórios", "28€") — all removed from the new copy. Pricing is owned by the checkout page, not the email.
- No new env vars, no schema changes, no new RPC calls.
- All dynamic content goes through `escapeHtml`.
- `renderCommercialFollowup.subject` static export is removed (subject is now per-handle); the registry already calls `render()` and reads `RenderedEmail.subject` directly, so EmailLab is unaffected. I'll grep to confirm no other consumer reads the static `.subject` before deleting.

**Design fidelity:**
- Keeps the existing `wrapHtml` shell (dark navy header / white body / muted footer).
- Insight card and reassurance block reuse the same neutral surfaces and accent (`#3772E5`) already used in `report_saved`.
- Mobile-first: tables with `width="100%"`, padding 14–20 px, font-size ≥14 px.

## Registry update — `email-template-registry.ts`

For the `commercial_followup` entry only:

- `shortDescription`: `"Continuação narrativa do relatório gratuito — manual, sem auto-trigger."`
- `wiredNote`:
  > `Lifecycle: CONVERSÃO · Status: Manual · Trigger: admin action only (src/routes/api/admin/send-commercial-followup.ts). Continua a narrativa do relatório gratuito sem alterar preços nem URLs de checkout. Auto-trigger intencionalmente não activo nesta fase.`
- `preheader`: `"A comparação com concorrentes e a evolução temporal ficam no relatório completo."`
- `variables` preview list: keep `firstName`, `instagramHandle`, `reportUrl`, `checkoutUrl (opcional)`; add `engagementVerdict (opcional)` and `gapArea (opcional)` using new `SAMPLE.engagementVerdictSample` / `SAMPLE.gapAreaSample` (e.g. `"está acima da média no engagement"` / `"há margem nos comentários e na consistência dos formatos"`).
- `render()`: call `renderCommercialFollowup` with the existing sample fields plus `insights: { engagementVerdict: SAMPLE.engagementVerdictSample, gapArea: SAMPLE.gapAreaSample }` so EmailLab shows the richest variant by default. The "no insights" variant can still be inspected by clearing the override.

`TEMPLATE_VARIABLES.commercial_followup` (used by `template-overrides`) stays as the existing 4 keys to avoid changing the override editor contract.

## Validation (manual)

1. `/admin/email-lab` → `commercial_followup` preview renders new copy with insight card visible (uses sample insights).
2. Toggle the SAMPLE insights off (temporarily set them to `null` in dev) → email renders the neutral "o que está a funcionar bem…" line, no broken `{{...}}` tokens, no empty card.
3. Toggle `checkoutUrl` off → primary CTA becomes `Responder para desbloquear` (mailto) when `replyToEmail` is set, or the muted reply-only line otherwise. No 404 link.
4. From `/admin` lead detail, click `Enviar follow-up comercial` against a test lead with a verified inbox → email arrives with new subject `O que o relatório gratuito ainda não mostra sobre @{handle}`, body matches preview, CTA opens the existing checkout URL untouched.
5. Verify `product_events` still receives `commercial_followup_sent` row with the same metadata shape.
6. Verify the lead's `contacted_at` / `commercial_status` transition still happens exactly as before (logic in send route is untouched).
7. Repeat send against the same lead — resend still works (idempotency is intentionally not enforced by the admin route).

## Output after implementation

1. **Files changed:** `src/lib/email/templates/commercial-followup.ts`, `src/lib/admin/email-template-registry.ts`.
2. **Commercial follow-up remains manual:** only `src/routes/api/admin/send-commercial-followup.ts` invokes it; no cron, no webhook, no lifecycle hook added.
3. **Prices and checkout logic unchanged:** no edits under `src/lib/pricing*`, checkout routes, EuPago files, or product catalog; `checkoutUrl` continues to flow from admin payload → template prop → `<a>` href verbatim.
4. **Preview variables updated:** `commercial_followup` registry entry shows `firstName`, `instagramHandle`, `reportUrl`, `checkoutUrl`, plus the new optional `engagementVerdict` / `gapArea` insight fields.
5. **Manual validation checklist:** above (7 items).

## Risks / follow-ups

- Override editor (`template-overrides.server.ts`) does not surface the new `insights` field — intentional, since today no sender supplies it. Future Step could add an admin form to type the two insight strings before sending; out of scope here.
- Removing `renderCommercialFollowup.subject` static is safe per grep, but I'll re-confirm in build mode before deleting.
