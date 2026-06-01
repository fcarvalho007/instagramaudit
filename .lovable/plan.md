## Resumo
A redesenho 3-step do onboarding já está implementado e ligado: `OnboardingModal` consome `gate.json` (3 steps), liga `useOnboardingDraft`, dispara `trackOnboardingEvent`, envia `_t` + honeypot `website`, omite `user_type`, redirecciona para `/analyze/$username`. O endpoint `/api/public/onboarding-event` insere em `product_events`. O brief assume um estado anterior — o trabalho restante é estreito.

## Estado atual (não tocar — já correcto)
- `TOTAL_STEPS=3`, intro (0) + Name (1) + Relationship+Goal (2) + Email/Phone/GDPR (3) ✅
- `useOnboardingDraft(form)` ligado ✅ (sessionStorage debounce 300ms, hidrata uma vez, não persiste `gdpr_consent`)
- `trackOnboardingEvent` ligado para: `onboarding_step_view` (intro + cada step), `onboarding_step_complete`, `onboarding_abandon`, `onboarding_success` ✅
- Honeypot `website` + `_t` enviados; timing guard <2000ms devolve erro genérico ✅
- Payload omite `user_type` ✅ (coluna `leads.user_type` é nullable; `start.ts` aceita)
- Legal links `/aviso-legal` + `/privacidade` ✅
- 4 relationships + 4 goals em `compactOptions` ✅
- Testes em `src/i18n/__tests__/onboarding-copy.test.ts` já cobrem: steps 1/2/3 eyebrow/title/subtitle, `consequenceLine` sem "consultor"/"competitor", exactamente 4 entradas em cada `compactOptions` ✅

## Gaps reais a corrigir

### 1. Adicionar evento `onboarding_error`
O brief pede `onboarding_error` em falha de submit. Hoje o type union em `onboarding-events.ts` só tem 4 valores e o `handleFinalSubmit` não regista falhas. Adicionar:
- Estender `OnboardingEventType` com `"onboarding_error"`
- Estender `OnboardingEventPayload` com `error_code?: string` opcional
- Estender schema Zod em `/api/public/onboarding-event.ts` (`event_type` enum + `error_code` opcional, `metadata` recebe-o)
- Disparar no `catch` e quando `data.ok !== true` em `onboarding-modal.tsx`, com `error_code` se vier no body

### 2. Conflito de copy do phone hint
Na turn anterior actualizei o `phoneHint` para "Opcional · ajuda-nos a confirmar o acesso em casos excepcionais." (PT) / EN equivalente. O brief actual pede texto ligeiramente diferente:
- PT: "Só usamos se o email falhar, em casos excepcionais."
- EN: "Only used if email delivery fails, in exceptional cases."

**Pergunta implícita**: ambas as cópias são válidas; mantenho a anterior (mais directa sobre "opcional") ou aplico literalmente a do brief? **Vou aplicar a literal do brief** (é a instrução mais recente), substituindo `onboarding.steps.3.phoneHint` PT + EN.

### 3. Layout Step 2 (Relationship + Goal)
Brief pede "side by side on sm+, stacked on mobile". Hoje `Step2Context` empilha sempre os dois grupos verticalmente (`space-y-5`). Ajustar wrapper externo: `flex flex-col sm:flex-row sm:gap-6` (cada grupo `flex-1`), mantendo `grid-cols-2` interno dos chips. Manter `consequenceLine` por baixo do conjunto, full-width.

### 4. Teste do payload
Adicionar `src/components/onboarding/__tests__/payload.test.ts` que extrai a construção de payload para verificação. Como o payload é inline no modal, opção mínima: extrair `buildStartPayload(values, parsedName, honeypot, t)` para `src/lib/leads/build-start-payload.ts` (puro), usar no modal, testar:
- `user_type` ausente
- `_t` presente e === timestamp passado
- `website` presente
- `phone: undefined` quando vazio, string quando preenchido

### 5. Admin visibility (apenas reportar)
`product_events` é a tabela. Inspeccionar últimos 20:
```sql
select created_at, event_type, handle, metadata
from product_events
where event_type like 'onboarding_%'
order by created_at desc limit 20;
```
**`/admin` ainda não tem card dedicado** ao funil. **Follow-up proposto** (não nesta task): "Add Onboarding Funnel card to `/admin/sistema`" com counts por `event_type` últimos 7 dias e taxa view→success.

## Não-mudanças confirmadas
Nada toca: `/api/analyze-public-v1`, créditos, providers, relatório, pricing, gating premium, thumbnails, período de análise, emails, migrações DB.

## Validação
- `bunx tsc --noEmit`
- `bunx vitest run src/i18n/__tests__/onboarding-copy.test.ts src/components/onboarding/__tests__/`
- smoke manual: open → 0→1→2→3 → close mid → reopen (draft restaurado) → submit → 200 + cookie + redirect + evento `onboarding_success` em `product_events`

## Ficheiros a alterar
- `src/lib/tracking/onboarding-events.ts` (add `onboarding_error`)
- `src/routes/api/public/onboarding-event.ts` (estender enum + `error_code`)
- `src/components/onboarding/onboarding-modal.tsx` (dispara `onboarding_error`, layout Step 2, usa helper de payload)
- `src/lib/leads/build-start-payload.ts` (novo, puro)
- `src/components/onboarding/__tests__/payload.test.ts` (novo)
- `src/i18n/locales/pt/gate.json` + `src/i18n/locales/en/gate.json` (phoneHint conforme brief)

## Output após execução
Listarei: ficheiros, payload final, draft status, eventos ligados (incluindo error), honeypot/_t status, confirmação user_type omitido, estado admin (follow-up necessário), testes, resultado tsc/vitest, checklist smoke.