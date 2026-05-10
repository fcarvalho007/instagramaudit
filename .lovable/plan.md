## Plano: email transacional após unlock do report público

### Arquitetura geral
Reutilizo o sistema de templates existente (`src/lib/email/templates/`, render puro pt-PT) e o padrão de envio Resend já usado em `src/routes/api/send-report-email.ts`. **Não introduzo Lovable Email infra nem novo connector** — alinha com o stack atual e com a regra "Email: Resend".

### 1. Novo template (puro render, testável)
Ficheiro: `src/lib/email/templates/personal-area-saved.ts`

```ts
export interface PersonalAreaSavedInput {
  firstName?: string | null;
  instagramHandle?: string | null;
  appUrl: string;       // ex: https://instagramaudit.lovable.app/app/reports
}
export function renderPersonalAreaSaved(input): RenderedEmail
```

- **Subject**: `O teu relatório InstaBench foi guardado`
- **Preheader**: `Podes voltar a consultá-lo sempre que precisares.`
- **Headline**: `Relatório guardado`
- **Body**:
  - greeting via `greetingHtml`/`greetingText`
  - `Guardámos a análise de @<handle> na tua área pessoal.`
  - botão `Abrir a minha área` → `appUrl`
  - fallback URL via `renderUrlFallbackHtml`
  - linha em `pMuted`: `Durante a beta, este acesso é gratuito.`
  - assinatura via `signatureHtml/Text`
- Exportar em `src/lib/email/templates/index.ts`.
- Teste em `src/lib/email/__tests__/templates.test.ts`: subject, preheader, handle escapado, presença do `appUrl`, fallback quando handle é null.

### 2. Sender server-only
Ficheiro: `src/lib/email/send-personal-area-saved.server.ts`

```ts
export async function sendPersonalAreaSavedEmail(args: {
  toEmail: string;
  firstName: string | null;
  instagramHandle: string | null;
}): Promise<{ ok: true; messageId: string | null } | { ok: false; reason: string }>
```

- Lê `RESEND_API_KEY` (já configurado, ver secrets).
- `SENDER_FROM = "InstaBench <onboarding@resend.dev>"` (mesmo padrão do send-report-email; não há domínio verificado ainda).
- Base URL: `process.env.PUBLIC_APP_BASE_URL ?? process.env.PDF_PUBLIC_BASE_URL ?? "https://instagramaudit.lovable.app"` → concatena `/app/reports`.
- Timeout 8s via `AbortController` (idêntico a send-report-email mas mais curto para não atrasar resposta do unlock).
- Nunca faz throw — devolve `{ ok: false, reason }` em qualquer falha (network, 4xx/5xx, timeout, sem API key).
- Não escreve em `report_requests` (este envio é distinto do PDF report email).

### 3. Eventos
Em `src/lib/tracking.functions.ts` acrescentar a `ALLOWED_EVENTS`:
- `personal_area_email_sent`
- `personal_area_email_failed`

A nota "Adding a new event requires a corresponding handler in `lead-lifecycle.ts`" é apenas informativa; estes não disparam mudança de status comercial → não requerem handler novo.

### 4. Integração com unlock
Em `src/lib/unlock.server.ts`, no fim de `processReportUnlock`, **antes do `return success`**, **só quando `createdReportRequest === true`**:

```ts
if (createdReportRequest) {
  try {
    const { sendPersonalAreaSavedEmail } = await import(
      "@/lib/email/send-personal-area-saved.server"
    );
    const res = await sendPersonalAreaSavedEmail({
      toEmail: data.email,
      firstName: data.name ?? null,
      instagramHandle: data.instagram_username,
    });
    await recordProductEvent({
      eventType: res.ok ? "personal_area_email_sent" : "personal_area_email_failed",
      leadId, snapshotId: data.analysis_snapshot_id, handle: data.instagram_username,
      metadata: res.ok
        ? { message_id: res.messageId, sender: "resend" }
        : { reason: res.reason },
    });
  } catch (err) {
    console.error("[unlock] personal-area email error:", err);
    // never blocks
  }
}
```

**Justificação da estratégia anti-duplicado** (sem nova tabela):
- `report_requests` tem unicidade lógica `(lead_id, analysis_snapshot_id)`. O email só é enviado quando esse par é INSERIDO pela primeira vez (`createdReportRequest === true`).
- Resubmissões do mesmo email + mesmo snapshot reutilizam o `report_request` existente e **não** disparam novo envio. Isto cobre StrictMode, double-click, retries do cliente.
- Sem necessidade de janela temporal explícita nem coluna nova.

**Por que `await` em vez de fire-and-forget**: o runtime serverless pode terminar promessas após a resposta. `await` com timeout de 8s garante execução; o utilizador já gastou 1 min no flow, +2-3s na resposta final é aceitável e mantém a UX honesta ("guardámos na tua área").

### 5. Constraints respeitados
- ✅ Sem chamadas a Apify/OpenAI/DataForSEO.
- ✅ Sem mexer em geração de report nem PDF.
- ✅ Sem newsletter/marketing — é estritamente transacional, 1:1, disparado por ação do próprio utilizador.
- ✅ Falha de Resend não bloqueia unlock (try/catch externo + sender que nunca faz throw).

### 6. Ficheiros tocados
- **NEW** `src/lib/email/templates/personal-area-saved.ts`
- **EDIT** `src/lib/email/templates/index.ts` (export)
- **NEW** `src/lib/email/send-personal-area-saved.server.ts`
- **EDIT** `src/lib/tracking.functions.ts` (2 eventos)
- **EDIT** `src/lib/unlock.server.ts` (~20 linhas no fim do success path)
- **EDIT** `src/lib/email/__tests__/templates.test.ts` (novos casos)

### 7. Validação
- `bunx tsc --noEmit`
- `bunx vitest run` (cobre só o template; sender é mock-friendly mas sem teste de integração — Resend não é chamado em testes)
- Manual: completar unlock com email novo → verificar inbox + `product_events` (`personal_area_email_sent`); repetir mesmo email + mesmo snapshot → não deve aparecer novo evento de email; remover `RESEND_API_KEY` em runtime e refazer → unlock continua a devolver success e aparece `personal_area_email_failed`.

### Checkpoint
☐ Template criado e exportado  
☐ Sender server-only com timeout e sem throw  
☐ Eventos registados em ALLOWED_EVENTS  
☐ Integração no fim de `processReportUnlock` apenas quando `createdReportRequest`  
☐ Testes do template a passar  
☐ tsc + vitest verdes
