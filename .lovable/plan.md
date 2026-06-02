# Pré-Publish onboarding: 3 fixes

## Fix 1 — Step 3 overflow a 360/390px

Causa: `DialogTitle` com `text-[28px] sm:text-[30px]` + `<em>` via `Trans`. Wrappers (`div.px-7`, `DialogHeader`, `DialogTitle`) não têm `min-w-0`, e o título não tem `break-words`, por isso uma palavra longa em PT (ex.: "Recebe o teu relatório") empurra o `DialogContent` (`sm:max-w-[760px]` em desktop, w-full mobile mas dentro de flex/grid do Radix). A barra inferior com `-mx-7 sm:-mx-9 px-7 sm:px-9` está OK, mas o botão "Continuar/Analisar" com `flex-1` pode ser clipado pelo overflow horizontal do título.

Ações em `src/components/onboarding/onboarding-modal.tsx`:
- Container `FormStepBody`: adicionar `min-w-0` ao `div.px-7 py-8`.
- `DialogHeader`: adicionar `min-w-0`.
- `DialogTitle`: reduzir para `text-[22px] sm:text-[30px]`, adicionar `break-words text-balance min-w-0`.
- `DialogDescription`: `break-words`.
- Barra de acções: adicionar `min-w-0` no wrapper e `min-w-0 truncate` no Button (texto pode encolher).
- `DialogContent`: garantir `w-[calc(100vw-2rem)] sm:max-w-[760px]` para não ser empurrado.

Validação: screenshots a 360×800 e 390×844 em PT e EN.

## Fix 2 — Draft não deve manter `profile_ownership`/`goal` ao trocar de handle

Ficheiro: `src/lib/leads/use-onboarding-draft.ts`.

Opção A (escolhida — minimiza staleness):
- Estender `DraftSchema` com `last_handle: z.string().optional()`.
- `useOnboardingDraft(form, handle)`: novo argumento `handle` (lowercase).
- Na hidratação:
  - Se `draft.last_handle === handle`: restaurar todos os campos permitidos (comportamento actual).
  - Caso contrário: restaurar apenas `full_name`, `email`, `phone`, `marketing_consent`; **omitir** `profile_ownership` e `goal`.
- Na escrita: incluir sempre `last_handle: handle` no payload persistido.
- `gdpr_consent` continua não persistido.

Actualizar chamada em `onboarding-modal.tsx`:
`useOnboardingDraft(form, handle.toLowerCase())`.

Testes (novo `src/lib/leads/__tests__/use-onboarding-draft.test.ts` — funções puras `loadOnboardingDraft`/escrita via mock de `sessionStorage`):
- draft sem `last_handle` em handle novo → identidade restaurada, contexto undefined.
- draft com `last_handle === handle` → tudo restaurado.
- draft com `last_handle !== handle` → contexto resetado, identidade mantida.

## Fix 3 — GDPR consent server-side

Auditoria de schema `leads`: existem `marketing_consent[_at]`, `beta_consent[_at]`, `contacted_at`, `archived_at`. **Não existe** `gdpr_consent_at` nem campo equivalente. Decisão: criar migration mínima.

### Migration (nova)
`supabase/migrations/<timestamp>_add_gdpr_consent_to_leads.sql`:
```sql
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS gdpr_consent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS gdpr_consent_version text NULL;
```
Sem alteração de RLS (tabela já é gerida via service role).

### Builder
`src/lib/leads/build-start-payload.ts`:
- Adicionar `gdpr_consent: true` ao tipo e ao retorno (sempre `true` — o form só chega aqui se válido; envia explicitamente para o servidor validar).
- Actualizar `build-start-payload.test.ts`: novo assert que `gdpr_consent === true`.

### Server
`src/routes/api/onboarding/start.ts`:
- `PayloadSchema`: adicionar `gdpr_consent: z.literal(true)` (rejeita `false`/ausente com 400 `INVALID_PAYLOAD`).
- `upsertLead`: ao inserir e ao actualizar, gravar:
  - `gdpr_consent_at: consentTimestamp`
  - `gdpr_consent_version: "v1"`
- Não armazenar texto legal.

### Testes
`src/routes/api/onboarding/__tests__/start.test.ts`:
- payload válido com `gdpr_consent: true` → 200.
- `gdpr_consent: false` → 400 `INVALID_PAYLOAD`.
- `gdpr_consent` ausente → 400 `INVALID_PAYLOAD`.
- `user_type` continua omitido; `website` + `_t` continuam aceites.

## Out of scope (não tocar)
Apify, OpenAI, DataForSEO, report UI, pricing, premium gating, thumbnails, analysis-period selector, emails, credit reserve/confirm/release, `/api/analyze-public-v1`.

## Ficheiros alterados
- `src/components/onboarding/onboarding-modal.tsx` (fix 1 + passar handle ao draft)
- `src/lib/leads/use-onboarding-draft.ts` (fix 2)
- `src/lib/leads/__tests__/use-onboarding-draft.test.ts` (novo)
- `src/lib/leads/build-start-payload.ts` (fix 3)
- `src/lib/leads/__tests__/build-start-payload.test.ts`
- `src/routes/api/onboarding/start.ts` (fix 3)
- `src/routes/api/onboarding/__tests__/start.test.ts`
- `supabase/migrations/<ts>_add_gdpr_consent_to_leads.sql` (nova)

## Validação
- `bunx tsc --noEmit`
- `bunx vitest run` nos suites tocados
- Screenshots manuais 360/390 PT+EN

## Checkpoint
- ☐ Fix 1: sem scroll horizontal e CTA visível em 360 e 390, PT e EN
- ☐ Fix 2: trocar handle reseta `profile_ownership` e `goal`, mantém identidade
- ☐ Fix 3: migration aplicada, server rejeita sem `gdpr_consent: true`, grava `gdpr_consent_at`/`version`
- ☐ tsc + vitest verdes
- ☐ Nenhum ficheiro fora do âmbito tocado
