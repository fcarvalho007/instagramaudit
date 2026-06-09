## Objetivo

Substituir o passo 2 do `OnboardingModal` (qualification) por uma versão compacta com duas grelhas de **4 cartões quadrados em linha** (ícone em cima, label curto em baixo), tom claro, selecionado em azul preenchido, restantes neutros — tudo cabe sem scroll, igual ao mockup.

## Escopo

Apenas o passo 2 do `OnboardingModal`. **Não tocar** no `UnlockModal` legado, no schema Zod, nem em rotas/servidor. Os enums (`PROFILE_OWNERSHIPS`, `GOALS`) ficam intactos — apenas renderizamos um subconjunto curado de 4 valores cada no onboarding.

## Mudanças

### 1. Novo componente visual — `GridSelectField`
Local: `src/components/onboarding/grid-select-field.tsx` (novo).

- Grelha `grid-cols-2 sm:grid-cols-4 gap-2`.
- Cada cartão: quadrado, ~`min-h-[92px]`, `rounded-xl`, `border`, ícone `size-5` centrado em cima, label `text-[13px]` em baixo, padding `p-3`.
- Estado **não-selecionado**: `border-border-default/60`, `bg-surface-base`, ícone e label em `text-content-secondary`. Hover: `border-border-default`, `bg-surface-muted/40`.
- Estado **selecionado**: `border-primary`, `bg-primary/[0.08]`, ícone e label em `text-primary`, label `font-medium`.
- `input[type=radio] sr-only peer` para acessibilidade + `focus-visible:ring`.
- Props: `legend`, `name`, `value`, `onChange`, `options: { value; label; Icon }[]`, `error?`. Sem `otherValue`, sem texto livre, sem `twoColumns`.

### 2. Curadoria de opções no passo 2

Em `onboarding-modal.tsx`, dentro de `QualificationStepBody`, definir arrays locais com 4 valores cada (subconjunto dos enums existentes, sem alterar tipos):

```text
OWNERSHIP_GRID = ["own_profile", "brand_profile", "client_profile", "competitor_research"]
GOAL_GRID      = ["improve_content", "benchmark_competitors", "client_report", "grow_audience"]
```

Removidos da UI: `curiosity`, `validate_brand`, `other`. (Continuam válidos no schema — apenas não expostos aqui.)

Ícones (monocromáticos, sem fundo colorido):
- own_profile → `User`
- brand_profile → `Star`
- client_profile → `Briefcase`
- competitor_research → `Eye`
- improve_content → `Sparkles`
- benchmark_competitors → `Scale`
- client_report → `LineChart`
- grow_audience → `TrendingUp`

### 3. Refactor de `QualificationStepBody`

- Substituir os dois `RadioCardField` por `GridSelectField`.
- Remover toda a lógica de `goal === "other"`: `goal_other_text`, `goalOtherError`, `setGoalOtherError`, props `otherValue/otherText/onOtherTextChange/otherError/otherPlaceholder/otherHint`. Ao validar, basta `!goal`.
- Limpar `goal_other_text` no `form.setValue("goal", …)` (set `""`).
- Header passa a usar duas legendas inline ("Qual é o contexto?" / "Qual é o teu objetivo?") como labels das duas grelhas, em vez de subtítulo único duplicado.
- Reduzir paddings verticais (`py-7 sm:py-8`) e espaçamentos (`mt-5 space-y-5`) para garantir que tudo cabe sem scroll em viewport ≥ 640×720.
- Manter botões "Voltar" / "Continuar" no rodapé com o layout atual.

### 4. i18n (`public/locales/pt/gate.json`)

Adicionar/atualizar chaves curtas para o onboarding (sem mexer nas labels longas usadas pelo unlock-modal legado):

```text
onboarding.qualification.title           = "Conta-nos o contexto"
onboarding.qualification.subtitle        = "Duas escolhas rápidas para ajustarmos a análise."
onboarding.qualification.ownershipLegend = "Qual é o contexto?"
onboarding.qualification.goalLegend      = "Qual é o teu objetivo?"
onboarding.qualification.cta             = "Continuar"
onboarding.qualification.back            = "Voltar"

onboarding.qualification.ownership.own_profile         = "Perfil pessoal"
onboarding.qualification.ownership.brand_profile       = "A minha marca"
onboarding.qualification.ownership.client_profile      = "De um cliente"
onboarding.qualification.ownership.competitor_research = "Concorrência"

onboarding.qualification.goal.improve_content        = "Melhorar conteúdo"
onboarding.qualification.goal.benchmark_competitors  = "Comparar concorrentes"
onboarding.qualification.goal.client_report          = "Analisar p/ cliente"
onboarding.qualification.goal.grow_audience          = "Crescer audiência"
```

(Versão EN equivalente em `en/gate.json` se existir.)

### 5. Limpeza de imports

Remover do `onboarding-modal.tsx` imports já não usados: `GOAL_ICONS`, `PROFILE_OWNERSHIP_ICONS`, `RadioCardField` (vindos de `unlock-modal`), `GOALS`, `PROFILE_OWNERSHIPS`.

## Não-mexer

- `src/lib/unlock-flow.ts` (enums e schema Zod inalterados).
- `src/components/product/unlock-modal.tsx` (mantém RadioCardField e fluxo antigo).
- Rotas, server functions, eventos de tracking — apenas continuam a receber valores válidos do enum.
- Passo 1 e passo 3 do onboarding.

## Testes

- Atualizar `src/components/onboarding/__tests__/*` (se houver assertions sobre `goal_other_text` no passo 2) para refletir remoção do campo.
- Smoke manual: selecionar 1 contexto + 1 objetivo → "Continuar" segue para o passo final.
- Verificar viewport 375×667 (mobile) e 1280×800 (desktop): tudo visível sem scroll.

## Risco residual

- Valores `curiosity` / `validate_brand` / `other` deixam de ser escolhíveis no onboarding mas continuam no enum/DB — qualquer analítica que segmente por estes valores passará a ver volume zero a partir do deploy. Sem impacto funcional.
