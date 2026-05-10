## Objetivo

Fechar o lead magnet end-to-end:

1. Reduzir fricção do unlock — passar de 5 para 4 passos (sai a pergunta de preço).
2. Perguntar preço **só depois** do utilizador ter visto valor — sheet contextual disparado por 70% scroll **OU** export PDF **OU** 90s após unlock.
3. Enviar **email de boas-vindas via Brevo** no primeiro unlock (returning leads não recebem).

Tudo o resto (sync de contacto Brevo, persistência em `leads`, tracking) já existe. Esta fase liga as últimas pontas.

---

## Fase 1 — Unlock fica com 4 passos

**`src/lib/unlock-flow.ts`**
- `unlockFormSchema`: `pricing_preference` deixa de ser obrigatório, passa a `.optional()`.
- Manter as constantes `PRICING_PREFERENCES` / `PRICING_PREFERENCE_LABELS` exportadas (reusadas pelo sheet).

**`src/components/product/unlock-modal.tsx`**
- `TOTAL_STEPS = 4`. Tipo `Step = 1 | 2 | 3 | 4 | "success"`.
- Remover bloco do step 5 (pricing). Submit final passa a acontecer no step 4.
- `goNext` deixa de incluir o passo extra; submit envia `pricing_preference: undefined`.

**`src/lib/unlock.server.ts`** — já aceita `pricing_preference` opcional. Sem alterações.

**Testes**: actualizar `src/lib/__tests__/unlock-flow.test.ts` e `unlock-schema.test.ts` para aceitar `pricing_preference` ausente.

---

## Fase 2 — Sheet contextual de pricing (pós-valor)

Novo componente client-only:

**`src/components/product/pricing-feedback-sheet.tsx`**
- Usa `Sheet` do shadcn (mobile: bottom; desktop: side right, `sm:max-w-md`).
- Conteúdo: pergunta única "Quanto pagarias por um relatório completo (uso único)?" + 5 opções (`PRICING_PREFERENCES`) + botão "Saltar" discreto.
- Design system estrito (Inter/Fraunces, tokens semânticos, sem cores hardcoded). Título Fraunces, opções estilo `RadioCardField` (extraído ou reutilizado).
- Estado: idle → submitting → success (mensagem curta "Obrigado pelo feedback") → fecha automaticamente após 1.5s.

**Hook trigger** — `src/hooks/use-pricing-feedback-trigger.ts`
- Inputs: `{ leadId, snapshotId, enabled }`.
- Idempotência: chave `ib_pricing_asked:{snapshotId}` em `localStorage`. Se existir, nunca dispara.
- Três triggers (qualquer um abre):
  - **Scroll 70%**: listener com throttle de 200ms, calcula `(scrollY + innerHeight) / documentHeight ≥ 0.7`.
  - **PDF export**: novo `CustomEvent("ib:pdf-export")` disparado em `analyze.$username.tsx` no início de `shareActions.exportPdf()`.
  - **Timer 90s**: `setTimeout` armado quando o sheet fica `enabled` (após unlock).
- Ao disparar, marca `localStorage` (mesmo que utilizador feche sem responder, não voltamos a perguntar nesta sessão/dispositivo) e remove listeners.

**Persistência** — endpoint novo:

**`src/routes/api/public/pricing-feedback.ts`** (POST)
- Zod: `{ lead_id: string (uuid), snapshot_id: string, pricing_preference: enum }`.
- Update em `leads` (apenas se `pricing_preference IS NULL`, para não sobrepor resposta anterior).
- Insert `product_events`: `pricing_feedback_submitted` com `metadata = { trigger: "scroll" | "pdf" | "timer", snapshot_id }`.
- Adicionar `pricing_feedback_submitted` à allowlist em `src/lib/tracking.functions.ts`.
- Sem auth (segue padrão de `/api/public/*`), validação rigorosa, rate-limit ligeiro por `lead_id` (in-memory map, suficiente para MVP).

**Integração em `src/routes/analyze.$username.tsx`**
- Guardar `unlockResult` (lead_id) em estado.
- Render `<PricingFeedbackSheet leadId={...} snapshotId={...} enabled={unlocked && !!leadId} />` ao lado do `UnlockModal`.
- No `shareActions.exportPdf` wrapper, disparar `window.dispatchEvent(new CustomEvent("ib:pdf-export"))` antes de iniciar o export.

---

## Fase 3 — Email de boas-vindas Brevo (apenas no primeiro unlock)

**`src/lib/brevo/brevo-client.server.ts`** — nova função `sendBrevoTransactionalEmail`:
- POST `https://connector-gateway.lovable.dev/brevo/v3/smtp/email` (gateway pattern, headers `Authorization: Bearer LOVABLE_API_KEY` + `X-Connection-Api-Key: BREVO_API_KEY`).
- Payload mínimo: `sender`, `to`, `subject`, `htmlContent`, `tags: ["instabench-welcome"]`.
- Sender: `BREVO_SENDER_EMAIL` + `BREVO_SENDER_NAME` (novos secrets — pedir ao utilizador). Domínio tem de estar verificado no Brevo.
- Best-effort: nunca lança; devolve `{ ok, messageId | reason, status }`.

**Conteúdo** (pt-PT, copy real, sem placeholder):
- Assunto: `O teu relatório do @{handle} está guardado`
- HTML simples editorial (Inter system fallback): saudação, link para `/me`, link directo para o report (`PUBLIC_APP_BASE_URL + /analyze/{handle}`), nota "Sem spam, podes apagar a qualquer altura".
- Função pura `buildWelcomeEmail({ handle, reportUrl, meUrl })` em `src/lib/brevo/welcome-email.server.ts` (testável).

**Integração em `src/lib/unlock.server.ts`** (passo 7, depois do contact sync):
- Só envia se `returningLead === false` (primeiro unlock para este email).
- Loga `welcome_email_sent` ou `welcome_email_failed` em `product_events` (adicionar ambos à allowlist).
- Falha do Brevo nunca quebra o unlock.

**Nota interna ao utilizador**: este passo só funciona com domínio verificado no Brevo + `BREVO_SENDER_EMAIL` configurado. Se ainda não tiver, podemos preparar o código atrás de feature flag (`BREVO_WELCOME_EMAIL_ENABLED`) e activar quando estiver pronto. Confirmar com o utilizador antes de pedir secrets.

---

## Detalhes técnicos

- **Zero alterações de schema**: `leads.pricing_preference` já existe e aceita NULL.
- **Tracking events novos** (allowlist em `tracking.functions.ts`): `pricing_feedback_submitted`, `welcome_email_sent`, `welcome_email_failed`.
- **Locked files**: nenhum tocado. `report.example` intacto.
- **Idempotência**:
  - Pricing: `localStorage` por snapshot + guard server-side (`pricing_preference IS NULL`).
  - Email: `returning_lead` flag já calculada por `unlock.server.ts`.
- **Tokens**: Sheet usa `surface-base`, `border-default`, `content-primary/secondary/tertiary`, `primary`, sem cores hardcoded. Título em Fraunces (regra do design system).
- **Mobile-first**: Sheet em `bottom` no mobile, ≥640px passa a `right`. Botões `min-h-12`.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (ajustar testes existentes do unlock-flow + adicionar teste para `buildWelcomeEmail`).
- Manual:
  - Fluxo unlock fecha em 4 passos.
  - Após unlock, scroll até 70% → sheet abre. Submeter → grava em `leads.pricing_preference`, `product_events`.
  - Recarregar página → sheet **não** reabre (idempotência).
  - Em sessão limpa, esperar 90s sem scrollar → sheet abre.
  - Export PDF → sheet abre se ainda não tiver disparado.
  - Primeiro unlock → email de boas-vindas chega; segundo unlock do mesmo email → não chega novo email.

## Fora de âmbito

- Templates Brevo geridos remotamente.
- Página /admin para editar copy do email (pode vir depois).
- Múltiplas variantes de copy / A-B test.
- Bloqueio do sheet em utilizadores logados (versão simples: pergunta sempre uma vez por snapshot).

## Checkpoint

- ☐ Unlock reduzido para 4 passos, schema actualizado, testes verdes
- ☐ `PricingFeedbackSheet` + hook + endpoint `/api/public/pricing-feedback` a gravar em `leads`
- ☐ Triggers: 70% scroll, evento PDF, timer 90s — todos com idempotência por snapshot
- ☐ Brevo: `sendBrevoTransactionalEmail` + email de boas-vindas no primeiro unlock (atrás de flag até confirmação de sender verificado)
- ☐ Tracking events na allowlist; `tsc` + `vitest` verdes
