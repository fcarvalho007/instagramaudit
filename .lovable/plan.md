## Estado actual — auditoria

A funcionalidade pedida **já está integralmente implementada** no código. Só falta um pequeno alinhamento de copy + cobertura de testes. Confirmações:

| Requisito | Local | Estado |
|---|---|---|
| Triggers: 70% scroll, 90s, PDF export | `src/hooks/use-pricing-feedback-trigger.ts` (`SCROLL_THRESHOLD = 0.7`, `TIMER_MS = 90_000`, listener `PRICING_PDF_EVENT`) | ✅ |
| Não aparece antes do unlock | `analyze.$username.tsx` l.366 (`enabled: unlocked && Boolean(unlockedLeadId)`) | ✅ |
| Não bloqueia, é dismissível | `PricingFeedbackSheet` (Sheet bottom, `onOpenChange` → `dismiss()`) | ✅ |
| 5 opções correctas | `PRICING_PREFERENCES` em `src/lib/unlock-flow.ts` + labels (`Até 3 €`, `Até 9 €`, `Até 19 €`, `Só uso se for gratuito…`, `Ainda não sei`) | ✅ |
| Endpoint público sem auth/sem providers/sem email | `src/routes/api/public/pricing-feedback.ts` (Zod estrito, rate-limit 5s, guard `pricing_preference IS NULL`, evento `pricing_feedback_submitted`) | ✅ |
| Disparo no export PDF | `analyze.$username.tsx` l.404 (`window.dispatchEvent(new CustomEvent(PRICING_PDF_EVENT))`) | ✅ |

## Gaps a fechar

### 1. Copy do título não corresponde 100% ao briefing

- Actual: `"Quanto pagarias por um relatório completo?"`
- Pedido: `"Depois de ver este relatório, quanto pagarias por uma análise completa de uma rede social?"`

Acção: actualizar `SheetTitle` em `src/components/product/pricing-feedback-sheet.tsx` (l.114-116). O eyebrow e a description mantêm-se.

### 2. Faltam testes automatizados

Não há ficheiro `*pricing-feedback*test*` em todo o `src/`. Adicionar:

- `src/lib/__tests__/pricing-feedback.test.ts` — valida o `pricingFeedbackSchema`:
  - aceita payload correcto com cada um dos 5 valores e cada um dos 3 triggers (`scroll`, `pdf`, `timer`)
  - rejeita `lead_id`/`snapshot_id` não-uuid
  - rejeita valor de `pricing_preference` fora do enum
  - rejeita campos extra (modo `.strict()`)

- `src/hooks/__tests__/use-pricing-feedback-trigger.test.ts` — usando `@testing-library/react` + `vi.useFakeTimers()`:
  - não dispara enquanto `enabled=false`
  - dispara `trigger="timer"` aos 90s após `enabled=true`
  - dispara `trigger="pdf"` quando o `PRICING_PDF_EVENT` é emitido
  - `dismiss()` fecha e bloqueia disparos posteriores na mesma sessão (se essa for a semântica actual — confirmar lendo o ficheiro completo durante a implementação)

(Trigger de scroll é mais frágil de testar de forma fiável em jsdom — testar o resto e deixar o scroll documentado para QA manual.)

### 3. Validação manual

- Carregar `/analyze/<username>`, fazer unlock, deixar correr 90s → sheet aparece com `trigger=timer`.
- Refresh, fazer unlock, scroll ≥70% → sheet aparece com `trigger=scroll`.
- Refresh, fazer unlock, clicar Export PDF → sheet aparece com `trigger=pdf`.
- Submeter cada uma das 5 opções → confirmar registo em `leads.pricing_preference` + evento `pricing_feedback_submitted` em `product_events`.
- Re-abrir o relatório no mesmo browser → sheet **não** reaparece (lead já tem `pricing_preference`).

## Fora de âmbito

- Backend, schema, endpoint, eventos: já estão em produção e cumprem todas as constraints (não envia emails, não chama providers, não exige login).
- Lógica de triggers: 0.7/90000/PDF event já correctos.

## Checkpoint

- ☐ Título do sheet alinhado com briefing
- ☐ Testes do schema (5 valores × 3 triggers + rejeições)
- ☐ Testes do hook (timer + pdf event + enabled gating)
- ☐ `bunx tsc --noEmit` limpo
- ☐ `bunx vitest run` verde
- ☐ QA manual dos 3 triggers + dedup
