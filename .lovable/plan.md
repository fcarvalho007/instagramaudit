## Estado atual (descoberta)

A funcionalidade está **>90% implementada**. Auditoria do que existe:

| Componente | Existe | Notas |
|---|---|---|
| `PricingFeedbackSheet` | ✅ `src/components/product/pricing-feedback-sheet.tsx` | UI completa: 5 opções pt-PT, sheet bottom mobile/popover desktop, estado submitting/success, dismissível |
| Hook trigger 70% / 90s / PDF | ✅ `src/hooks/use-pricing-feedback-trigger.ts` | Idempotente por snapshot via `localStorage` (`ib_pricing_asked:{snapshotId}`) |
| Evento PDF (`ib:pdf-export`) | ✅ Disparado em `analyze.$username.tsx:404` no `onExportPdf` |
| Endpoint público | ✅ `POST /api/public/pricing-feedback` — Zod, rate-limit por lead, só atualiza se `pricing_preference IS NULL` (não sobrescreve) |
| Schema partilhado | ✅ `src/lib/pricing-feedback.ts` (`pricingFeedbackSchema`) |
| Update `leads.pricing_preference` | ✅ |
| Integração em `/analyze/$username` | ✅ Linhas 365-462 |
| `pricing_feedback_submitted` | ✅ Emitido pelo endpoint |
| `pricing_feedback_dismissed` | ⚠️ Listado em `ALLOWED_EVENTS` mas **nunca emitido** |
| `pricing_feedback_shown` (= `_micro_survey_shown`) | ❌ **Não existe** |
| Não pedir pricing no unlock | ✅ `unlock.server.ts` ainda aceita `pricing_preference` opcional mas o `UnlockModal` já não tem o campo (verificável; se ainda tiver, é gap separado fora do escopo deste prompt) |

## Decisões e desvios face ao spec

Para evitar churn desnecessário num feature já em produção:

1. **Manter nomes de evento existentes** (`pricing_feedback_*`) em vez de renomear para `pricing_micro_survey_*`.
   - Estão na allowlist, em testes (`feedback-intent.test.ts`), em sync Brevo, em dashboards admin. Renomear quebra histórico.
   - Adiciona-se apenas o que falta: `pricing_feedback_shown`. Funcionalmente equivalente ao `_micro_survey_shown` do spec.

2. **Manter endpoint `POST /api/public/pricing-feedback`** em vez de criar novo `PATCH /api/public/lead-pricing-preference`.
   - O caminho atual é semanticamente mais claro (descreve a survey, não só o campo).
   - `POST` num endpoint público com payload validado é convenção dominante no projeto (todos os outros `/api/public/*` usam `POST`).
   - O endpoint já garante "no overwrite" via `.is("pricing_preference", null)`, que é o comportamento idempotente que o `PATCH` sugeriria.
   - Se for crítico cumprir o spec à letra, sinaliza e adiciono uma tarefa separada de renomeação + redirect — não é técnico, é apenas surface.

3. **Payload mantém `lead_id` (uuid) + `snapshot_id`**.
   - Spec diz "email or lead access token". Hoje usamos o `leadId` retornado pelo unlock e guardado em `sessionStorage` (`ib_unlock_lead:{snapshotId}`). É efetivamente um token de acesso por sessão, não exposto no DOM público pré-unlock.
   - Adicionar suporte a email/token criava nova superfície de ataque (enumeração) sem benefício prático — o utilizador acabou de fazer unlock e o leadId está em sessão.
   - Mantém-se. `report_request_id` opcional não é necessário porque o snapshot é a chave do unlock.

## Mudanças necessárias

Apenas dois pontos:

### A) Adicionar evento `pricing_feedback_shown`

1. **`src/lib/tracking.functions.ts`** — adicionar `"pricing_feedback_shown"` à `ALLOWED_EVENTS`.
2. **`src/components/product/pricing-feedback-sheet.tsx`** — emitir evento no primeiro render quando `open === true` (via `useEffect` com guard ref). Metadata: `{ trigger }`.
3. **Alternativa cleaner**: emitir no hook `use-pricing-feedback-trigger.ts` no momento em que `fire()` corre (uma vez por snapshot, garantido). Isto evita lógica de guard no sheet e mantém a responsabilidade no único sítio que sabe quando "abrir pela primeira vez". **Vou por aqui.**

### B) Emitir `pricing_feedback_dismissed`

Cenário: utilizador fecha o sheet sem submeter (botão Saltar, X, ou clica fora).

- O `PricingFeedbackSheet` chama `onDone()` quando fecha sem sucesso (linhas 44-48 + 164).
- Em `analyze.$username.tsx`, `onDone={() => pricingTrigger.dismiss()}` apenas marca como asked.
- **Mudança**: no `handleClose` do sheet, quando `next === false` E `status !== "success"`, fazer `void trackEvent({ data: { eventType: "pricing_feedback_dismissed", snapshotId, metadata: { trigger } }})`. Fire-and-forget.
- Garante 1 só emissão (o sheet fecha uma vez); se o utilizador já submeteu (status=success → `onOpenChange(false)` interno), não emite (status check).

## Ficheiros alterados

- `src/lib/tracking.functions.ts` — adicionar `"pricing_feedback_shown"` à allowlist
- `src/hooks/use-pricing-feedback-trigger.ts` — emitir `pricing_feedback_shown` em `fire()`, com `{ trigger }`
- `src/components/product/pricing-feedback-sheet.tsx` — emitir `pricing_feedback_dismissed` em `handleClose` quando fechado sem submissão

## Não tocar

- Endpoint `POST /api/public/pricing-feedback` (já correto)
- Schema `pricingFeedbackSchema`
- Lista `PRICING_PREFERENCES` / labels (já em pt-PT, AO90, alinhada com spec)
- `UnlockModal` (não pede pricing — já feito anteriormente; verificar e flag se ainda tiver)
- Integração em `analyze.$username.tsx`
- BD / migrações (campo `leads.pricing_preference` já existe)
- Cálculos do report
- UI pública

## Trigger logic (recap, sem alterações)

```
unlock done → unlockedLeadId em sessionStorage
  → usePricingFeedbackTrigger(enabled=true, snapshotId)
    → on first of:
        · scroll ≥ 70% (rAF-throttled, also runs once on mount)
        · CustomEvent "ib:pdf-export" (disparado pelo onExportPdf)
        · setTimeout 90 000 ms
      → fire(trigger):
          · markAsked(snapshotId) em localStorage  ← idempotente cross-reload
          · setOpen(true)
          · trackEvent("pricing_feedback_shown", { trigger })   ← NOVO
  → user submits → POST /api/public/pricing-feedback
    → server: trackEvent("pricing_feedback_submitted", { pricing_preference, trigger, updated })
  → user dismisses (skip / X / overlay click)
    → trackEvent("pricing_feedback_dismissed", { trigger })   ← NOVO
    → onDone → dismiss() (already-asked persiste)
```

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (suite atual)
- Manual:
  1. Unlock + scroll devagar → ao chegar a 70% do report, sheet abre. Verificar `product_events` para `pricing_feedback_shown` com `metadata.trigger = "scroll"`.
  2. Unlock + esperar 90s parado → sheet abre com `trigger = "timer"`.
  3. Unlock + clicar Exportar PDF → sheet abre com `trigger = "pdf"`.
  4. Submeter → `pricing_feedback_submitted` registado, `leads.pricing_preference` atualizado.
  5. Fechar sem submeter → `pricing_feedback_dismissed` registado.
  6. Refresh da página → sheet **não** reabre (localStorage `ib_pricing_asked:{snapshotId}`).
  7. Não há trigger antes do unlock (sheet enabled depende de `unlocked && unlockedLeadId`).

## Checkpoint

- ☐ `pricing_feedback_shown` adicionado a `ALLOWED_EVENTS`
- ☐ Hook emite `pricing_feedback_shown` em `fire()`
- ☐ Sheet emite `pricing_feedback_dismissed` em close-without-submit
- ☐ `bunx tsc --noEmit` limpo
- ☐ `bunx vitest run` 100%
- ☐ Manual: 3 triggers + submit + dismiss produzem eventos esperados sem duplicação