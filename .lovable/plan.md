## Goal

Substituir o passo 2 atual (Select dropdown único de `qualification`) por **duas perguntas em cartões de rádio**, recuperando o visual do antigo `unlock-modal`:

- **Em cima:** "Qual é o contexto?" → `profile_ownership` (5 cartões)
- **Em baixo:** "Qual é o teu objetivo?" → `goal` (6 cartões, com "Outro" abrindo input)

Tudo num único passo (continua a ser o "Passo 2 de 3"). O dropdown atual sai. As outras etapas (entry, final, OTP) ficam intactas.

## UI

Reutilizar o componente `RadioCardField` do `src/components/product/unlock-modal.tsx` — mover/exportar para `src/components/onboarding/radio-card-field.tsx` para ser partilhado pelos dois modais sem duplicação.

Render do novo `QualificationStepBody`:

```
[ Eyebrow: PASSO 2 DE 3 ]
[ H2: "Conta-nos o contexto" ]
[ Subtítulo: "Duas escolhas rápidas — ajuda-nos a ajustar a análise." ]

┌─ Bloco "Qual é o contexto?" ──────────┐
│  ● É o meu perfil pessoal             │
│  ○ É o perfil da minha marca          │
│  ○ É o perfil de um cliente           │
│  ○ Estou a observar concorrência      │
│  ○ Estou só a explorar                │
└───────────────────────────────────────┘

┌─ Bloco "Qual é o teu objetivo?" ──────┐
│  ○ Melhorar o conteúdo                │
│  ○ Comparar com concorrentes          │
│  ○ Preparar uma análise para cliente  │
│  ○ Crescer a audiência                │
│  ○ Validar a presença da marca        │
│  ○ Outro            (abre input)      │
└───────────────────────────────────────┘

[ ← Voltar ]   [ Continuar → ]
```

Validação client-side: ambos os campos obrigatórios antes do "Continuar"; se `goal === "other"`, exigir `goal_other_text` (≥ 2 chars).

## Dados / payload

O schema `unlockFormSchema` já tem `profile_ownership` + `goal` + `goal_other_text`. O `buildStartPayload` já envia esses campos para `/api/onboarding/start` (que também já os aceita — ver `src/routes/api/onboarding/start.ts`).

O campo `qualification` continua a existir (opcional no schema partilhado) mas deixa de ser pedido. Para manter a admin Kanban/segmentação sem perdas, derivar `qualification` automaticamente a partir do `profile_ownership` no submit:

| profile_ownership | qualification derivada |
| --- | --- |
| brand_profile | brand_company |
| client_profile | consultant_agency |
| competitor_research | marketing_comms |
| own_profile | content_creator |
| curiosity | curiosity |

(Mapeamento aplicado em `buildStartPayload` quando `values.qualification` é `undefined`.)

## Files changed

1. `src/components/onboarding/radio-card-field.tsx` — **novo**: extrai o `RadioCardField` (e tipos `RadioOption`) de `unlock-modal.tsx`.
2. `src/components/product/unlock-modal.tsx` — passa a importar `RadioCardField` do novo módulo (remove a definição local; sem mudança visual).
3. `src/components/onboarding/onboarding-modal.tsx`:
   - Reescreve `QualificationStepBody` para renderizar dois `RadioCardField` (profile_ownership + goal).
   - Remove o `Select`/`SelectItem` daí.
   - `defaultValues` do form: `profile_ownership` e `goal` passam de `"own_profile" as never` para `undefined` (para validação correta).
   - Lógica do `handleEntrySubmit` mantém-se (continua a saltar para `qualification` no novo email).
4. `src/lib/leads/build-start-payload.ts` — adiciona derivação `qualification ← profile_ownership` quando ausente.
5. `src/lib/leads/__tests__/build-start-payload.test.ts` — caso para a derivação.
6. `src/i18n/locales/pt/gate.json` + `en/gate.json`:
   - Atualizar `onboarding.qualification.title/subtitle` (e variantes `*Checkout`).
   - Adicionar `onboarding.qualification.ownershipLegend` ("Qual é o contexto?") e `onboarding.qualification.goalLegend` ("Qual é o teu objetivo?").
   - Reutilizar `unlock.options.profileOwnership.*` e `unlock.options.goal.*` (já existem).

## Bonus — fix runtime error

`trackEvent({ eventType: "checkout_onboarding_shown" | "checkout_onboarding_completed" })` está a falhar Zod (enum não inclui os novos valores). Adicionar `checkout_onboarding_shown`, `checkout_onboarding_completed`, `credits_pack_non_pro_warning_shown` ao enum `eventType` em `src/lib/tracking.functions.ts` (ou `src/lib/tracking/events.ts` consoante a localização do schema).

## Out of scope

- Não mexer em `unlock-modal.tsx` para além da importação partilhada (ainda em uso na rota antiga).
- Não mexer no schema do servidor (`start.ts`) — já aceita os campos.
- Não mexer no fluxo de checkout/EuPago/credit grants.

## QA manual

1. `/precos` → checkout sem sessão → email → passo 2 mostra os **dois blocos de cartões** (não dropdown).
2. Tentar avançar sem preencher → erro inline em cada bloco.
3. Escolher "Outro" no objetivo → abre input; vazio bloqueia "Continuar".
4. Continuar → passo 3 (final form sem telemóvel) → OTP → checkout retoma com query params intactos.
5. Sem consola com `ZodError eventType`.
