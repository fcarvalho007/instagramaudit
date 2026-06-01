# Plano: Fase 3 — onboarding modal antes da geração da análise

## Resumo do fluxo final

```
Homepage → handle no HeroActionBar
   ↓ submit (sem navegar)
   ↓ valida formato client-side
OnboardingModal abre  (NOVO componente)
   ├─ Step 0 (intro): "Vais analisar @{handle}" + créditos + valor grátis
   ├─ Steps 1–5: nome / profile_ownership / goal / user_type / email+phone+RGPD
   │             (reutiliza schema e copy do UnlockModal existente)
   └─ Submit final → POST /api/onboarding/start
                     ↓ ok=true ⇒ cookie lead_session + 2 créditos atribuídos
                     ↓
                     navigate({ to: "/analyze/$username", params: { username }, search: { vs } })
/analyze/$username monta
   └─ fetchPublicAnalysis(handle) → POST /api/analyze-public-v1
                                       ↓ cookie presente, saldo ≥ 1
                                       ↓ reserve → run → confirm → consome 1 crédito
                                       ↓
        AnalysisSkeleton (já existe, mostra "A preparar a análise…" via i18n)
        → ReportShellV2 (inalterado)
        → UnlockModal post-report continua a gerir gating premium (INALTERADO)
```

## Decisões de arquitectura

### 1. Onboarding modal é um componente novo, NÃO uma alteração ao UnlockModal

Razão: `UnlockModal` submete a `/api/public/report-unlock` e exige `snapshotId` + `instagramUsername` para ser uma "open report unlock". Mudar o seu submit endpoint quebraria o gating premium pós-relatório, que o user explicitamente pediu para não mexer.

**Solução**: criar `src/components/onboarding/onboarding-modal.tsx` que:
- Reutiliza `unlockFormSchema`, `GOALS`, `PROFILE_OWNERSHIPS`, `USER_TYPES` de `@/lib/unlock-flow` (sem alterações).
- Reutiliza a copy de `gate.json` para os 5 passos (chaves `unlock.step1..step5`). Não duplica copy.
- Prepende um Step 0 de "expectation management" com copy nova em `gate.json` (`onboarding.intro.*`).
- Substitui o submit final: chama `/api/onboarding/start` com o payload mapeado:
  - `name` ← `full_name`
  - `email` ← `email`
  - `phone` ← `phone`
  - `marketing_consent` ← `marketing_consent`
  - `beta_consent` ← `false` (não pedido nesta modal)
  - `user_type`, `purpose` ← `goal`, `profile_ownership`
- Não passa `snapshotId` / `instagramUsername` ao endpoint (não existem ainda).
- No Step 0 mostra o handle que vai ser analisado (prop `handle`).
- Sucesso → `onSuccess(handle)` callback ⇒ caller navega para `/analyze/$username`.

**Refactor mínimo opcional**: extrair os corpos dos `Step1Body..Step5Body` do `unlock-modal.tsx` para `src/components/onboarding/steps/` e importar de ambos. Recomendo NÃO fazer agora (risco de regressão no premium gating); fazer numa Fase 4 de dedup.

### 2. HeroActionBar deixa de navegar directamente

Em `src/components/landing/hero-action-bar.tsx`, no `handleSubmit`:
- Mantém validação client-side do handle e dos competitors.
- Em vez de `navigate(...)`, guarda `{ handle, competitors }` em estado local e abre o `OnboardingModal`.
- Passa `onSuccess` que faz o `navigate({ to: "/analyze/$username", ... })` com competitors.

### 3. AnalyzePage trata `ONBOARDING_REQUIRED` reabrindo a modal

Em `src/routes/analyze.$username.tsx`:
- No `load()`, se `analysis.error_code === "ONBOARDING_REQUIRED"`, em vez de mostrar erro genérico, abre o `OnboardingModal` no próprio AnalyzePage (caso o user entre directamente via URL sem cookie). Após sucesso da modal, refaz `load()`.
- Para `INSUFFICIENT_CREDITS`, mostra mensagem amigável via `errors.json` (chave nova `INSUFFICIENT_CREDITS`).
- `PROFILE_PERSONAL_NO_FEED` já tem copy — manter.

### 4. Copy i18n (novo em `gate.json` + `errors.json`)

`pt/gate.json` adicionar:
```json
"onboarding": {
  "intro": {
    "title": "Cria a tua conta e abre o relatório",
    "subtitle": "São algumas perguntas rápidas para personalizar a análise e guardar o relatório.",
    "handleContext": "Vais analisar @{{handle}}",
    "creditNote": "Esta análise usa 1 crédito. Começas com 2 créditos gratuitos.",
    "freeValueTitle": "O que recebes grátis",
    "freeValue": [
      "Índice geral do perfil",
      "Métricas-base da visão geral",
      "Amostra analisada e período observado",
      "Relatório guardado para rever depois"
    ],
    "premiumNote": "As secções avançadas fazem parte do relatório premium.",
    "cta": "Começar",
    "trustLine": "~1 min · RGPD · sem spam",
    "personalHint": "Funciona melhor com perfis públicos Creator ou Empresa. Alguns perfis pessoais podem não devolver publicações suficientes."
  }
}
```

`pt/errors.json` adicionar:
- `"INSUFFICIENT_CREDITS": "Sem créditos disponíveis."`
- `"INSUFFICIENT_CREDITS_HELPER": "Já usaste os teus 2 relatórios gratuitos."`
- `"ONBOARDING_REQUIRED": "Para gerar a análise, completa o registo rápido."` (fallback caso a modal não consiga abrir)
- `pt/analyze.json` — chave `loading.preparing: "A preparar a análise do perfil…"` (usada por `AnalysisSkeleton` se ainda não tiver).

Espelhos em `en/`. Mantenho "Construído em Leiria" e outras strings como estão.

### 5. Endpoint `/api/onboarding/start` — sem alterações

Confirmado em `src/routes/api/onboarding/start.ts`:
- Aceita o payload que vou mandar.
- Faz upsert do lead, atribui créditos idempotentes, escreve cookie.
- Retorna `{ ok, lead_id, credits }`.

Pequena nuance: o endpoint trata `purpose` e `user_type` separadamente. No `unlockFormSchema` actual temos `goal` (→ mapeio para `purpose`) e `user_type`. OK.

## Ficheiros afectados

**Novos**
- `src/components/onboarding/onboarding-modal.tsx`
- `src/components/onboarding/onboarding-intro-step.tsx`
- `src/components/onboarding/__tests__/onboarding-modal.test.tsx`
- `src/components/landing/__tests__/hero-action-bar.test.tsx` (ou estender existente)

**Editados**
- `src/components/landing/hero-action-bar.tsx` — abrir modal em vez de navegar.
- `src/routes/analyze.$username.tsx` — tratar `ONBOARDING_REQUIRED` reabrindo modal; tratar `INSUFFICIENT_CREDITS` com copy amigável.
- `src/i18n/locales/pt/gate.json` + `src/i18n/locales/en/gate.json` — bloco `onboarding.intro`.
- `src/i18n/locales/pt/errors.json` + `src/i18n/locales/en/errors.json` — `INSUFFICIENT_CREDITS`, `ONBOARDING_REQUIRED`.
- `src/i18n/locales/pt/analyze.json` + `en/analyze.json` — `loading.preparing` se faltar.

**Não tocar** (lock list para esta fase)
- `src/components/product/unlock-modal.tsx`
- `src/routes/api/public/report-unlock.ts`
- `src/routes/api/analyze-public-v1.ts` (Phase 2 já fechou)
- `src/routes/api/onboarding/start.ts` (Phase 1 já fechou)
- Qualquer componente em `src/components/report-redesign/v2/`
- `src/lib/analysis/cache.ts`, `src/lib/credits/credits.server.ts`
- Apify actor, OpenAI prompts, thumbnails, emails, pricing

## Testes a adicionar

1. **`hero-action-bar.test.tsx`**
   - Handle vazio → mostra erro de validação, NÃO chama `fetch` nem `navigate`.
   - Handle inválido → idem.
   - Handle válido → abre `OnboardingModal` e não navega.
2. **`onboarding-modal.test.tsx`**
   - Step 0 mostra `@{handle}` correctamente.
   - Submit final faz POST a `/api/onboarding/start` com payload esperado (mock `fetch`).
   - Resposta `ok: true` chama `onSuccess(handle)`.
   - Resposta 500 mostra erro amigável; não chama `onSuccess`.
3. **Integração `analyze.$username.tsx`** (test simples):
   - `fetchPublicAnalysis` devolve `ONBOARDING_REQUIRED` → modal abre.
   - `fetchPublicAnalysis` devolve `INSUFFICIENT_CREDITS` → mostra copy + helper.
4. **Tests existentes do `UnlockModal` e `analyze-public-v1`** continuam a passar (regressão).

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual em preview (sessão fresh, browser anónimo):
  1. `/` → escrever `frederico.m.carvalho` → submit
  2. modal abre no Step 0 com "@frederico.m.carvalho"
  3. completar 5 passos
  4. confirmar request `/api/onboarding/start` 200 nas devtools
  5. confirmar cookie `lead_session` Set-Cookie
  6. navegação para `/analyze/frederico.m.carvalho`
  7. skeleton com "A preparar a análise do perfil…"
  8. relatório abre, sem 402 visível
  9. recarregar — análise vem de cache, não pede onboarding outra vez

## Riscos remanescentes

1. **Duplicação visual entre OnboardingModal e UnlockModal pós-relatório**: o user pede para ambos os flows existirem (não mexer em premium gating). Resultado: utilizador grátis vê o mesmo tipo de modal duas vezes (uma antes de analisar, outra ao tentar abrir secções premium). Aceitável nesta fase; flag para Fase 4 (unificar lead capture, ou tornar o segundo unlock só "upgrade premium").
2. **Lead session sem créditos a tentar nova análise**: após esgotar 2 créditos, `INSUFFICIENT_CREDITS` aparece. Mensagem amigável existe; não há ainda fluxo de checkout — é o estado terminal definido no plano. UI deve apontar para "upgrade premium" futuramente.
3. **Bypass via URL directa**: utilizador anónimo que cola `/analyze/<handle>` sem passar pela homepage. Tratado pelo handler de `ONBOARDING_REQUIRED` que reabre a modal no AnalyzePage.
4. **Direct navigation com cookie inválido**: cookie expirado → backend devolve `ONBOARDING_REQUIRED` → mesma rota de tratamento.
5. **Mobile**: `UnlockModal` (que vamos espelhar) já é mobile-first (`px-7 sm:px-9`, `max-h-[92vh] overflow-y-auto`). Mantemos a mesma estrutura.

## Checkpoint

- ☐ criar `OnboardingModal` reusando `unlockFormSchema` e copy do `gate.json`
- ☐ adicionar Step 0 (intro) com copy nova
- ☐ POST a `/api/onboarding/start` no submit final, com mapeamento de campos
- ☐ alterar `HeroActionBar` para abrir modal em vez de navegar
- ☐ tratar `ONBOARDING_REQUIRED` e `INSUFFICIENT_CREDITS` em `analyze.$username.tsx`
- ☐ copy i18n em pt + en (`gate.json`, `errors.json`, `analyze.json`)
- ☐ testes novos (HeroActionBar, OnboardingModal, AnalyzePage)
- ☐ `bunx tsc --noEmit` limpo
- ☐ `bunx vitest run` — só falhas pré-existentes nos email templates
- ☐ smoke manual em preview com sessão fresh
