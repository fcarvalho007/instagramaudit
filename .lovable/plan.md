
# Auditoria — Modo Comparação Fase 1

## 1. Mapa actual da implementação

Único ponto de inserção: `src/components/report-redesign/v2/report-overview-block.tsx`.

```
ReportOverviewBlock
├── EditorialIdentityCard            (single-profile, sempre)
├── MethodologyLine                  (single-profile)
├── CompetitorOverviewCompare        ← apenas se firstCompetitor (mode=all)
├── CompetitorBioCompare             ← apenas se firstCompetitor (mode=all)
├── EngagementCardRefined            (single-profile)
│   └── CompetitorEngagementCompare  ← APÊNDICE abaixo, mt-6
├── FrequencyCard                    (single-profile)
│   └── CompetitorCadenceCompare     ← APÊNDICE abaixo, mt-6
├── FormatCard                       (single-profile, SEM comparação)
└── PostComparisonBlock              (single-profile, SEM comparação)
```

`firstCompetitor = competitorBreakdown[0] ?? null` (linha 120). O segundo competitor é ignorado (TODO Fase 1.5).

Primitivas em `src/components/report-redesign/v2/compare/`:
- `CompareStatBlock` — usada por Overview, Engagement, Cadence
- `CompareTable` — usada por Bio
- `CompareBarPair` — **criada mas nunca consumida** (cobre o caso 2 do mockup: distribuições)

## 2. Classificação card por card (estado actual)

| Card | Comportamento actual com competitor |
|---|---|
| EditorialIdentityCard | inalterado (single-profile com nº de competitors no rodapé) |
| MethodologyLine | inalterado |
| EngagementCardRefined | inalterado + apêndice `CompetitorEngagementCompare` abaixo |
| FrequencyCard | inalterado + apêndice `CompetitorCadenceCompare` abaixo |
| FormatCard | inalterado, **sem comparação** |
| PostComparisonBlock (best vs worst) | inalterado, **sem comparação** |
| CompetitorOverviewCompare | bloco novo intercalado entre MethodologyLine e Engagement |
| CompetitorBioCompare | bloco novo intercalado a seguir ao anterior |

Padrão dominante: **append**. Resultado percebido: relatório fica ~30–40% mais longo, com leitura duplicada (KPIs do perfil → mesmos KPIs com competitor abaixo).

## 3. Causa-raiz da percepção

Não é bug de dados nem de cor — é **estratégia de inserção errada**. O mockup pede que o card *vire* modo-comparação; a implementação faz `Card + CompareBlock` lado-a-lado vertical.

## 4. Arquitectura recomendada

### 4.1 Estado partilhado: `ComparisonContext`

Um Context React mínimo no topo do `ReportShellV2`:

```ts
interface ComparisonContextValue {
  hasCompetitor: boolean;          // competitorBreakdown.length > 0
  comparisonMode: boolean;         // hasCompetitor && variant !== "public_mvp"
  competitors: CompetitorBreakdown[]; // todos
  primary: { handle, … };
}
```

Vantagens vs prop-drilling:
- cada card decide internamente se renderiza versão single ou compare
- evita lógica gating duplicada em `report-overview-block.tsx`
- Free/Public passa `comparisonMode=false` → zero alteração no fluxo gratuito
- escala trivialmente para 2 competitors em Fase 1.5 (o context já entrega o array; cada card escolhe quantos consumir)

### 4.2 Decisão por card

Comparação **inline-na-própria-card** (card-aware) — não secção separada, não apêndice.

| Card | Desired comparison | Padrão visual | Fase |
|---|---|---|---|
| EditorialIdentityCard | dual-handle header (avatar + @handle do primary e do competitor lado-a-lado) + sub-grid de scores comparados | `CompareStatBlock` ×2 (envolvimento, frequência) | **1.1** |
| EngagementCardRefined | substituir KPI hero por `CompareStatBlock` (ER) + sub-stats (avg likes / comments) também em compare; gráfico de benchmark ganha 2ª linha do competitor | `CompareStatBlock` + line overlay | **1.1** |
| FrequencyCard | KPI principal (posts/sem) em `CompareStatBlock`; timeline pode permanecer single (custo de leitura > valor) | `CompareStatBlock` | **1.1** |
| FormatCard | **transformar em paired-bars** (Reels/Carousels/Imagens) — caso clássico de distribuição | `CompareBarPair` ×3 | **1.2** |
| EditorialIdentityCard — bloco bio | mover `CompetitorBioCompare` para dentro do card de identidade como secção colapsável "Identidade vs concorrente" | `CompareTable` | **1.2** |
| MethodologyLine | mantém single (descreve a metodologia do perfil principal) | n/a | — |
| PostComparisonBlock (best vs worst) | mantém single-profile em Fase 1; comparação de posts top vs top tem alto custo de implementação e dados | n/a | **2.x** |
| Diagnóstico editorial (Q01–Q07) | mantém single — texto IA por perfil | n/a | **2.x** |
| Benchmark gauge / Market signals | mantém single em pro_preview (já hidden) | n/a | — |

### 4.3 Eliminações resultantes

Após card-aware:
- `CompetitorOverviewCompare` → absorvido pelo EditorialIdentityCard (deixa de existir como bloco isolado)
- `CompetitorEngagementCompare` → absorvido pelo EngagementCardRefined
- `CompetitorCadenceCompare` → absorvido pelo FrequencyCard
- `CompetitorBioCompare` → secção dentro do EditorialIdentityCard

→ Os 4 wrappers convertem-se em "compare-mode renderers" *dentro* dos cards originais. Isto resolve a percepção de relatório duplicado.

### 4.4 Recomendação inline vs secção

**Híbrido enviesado para inline:**
- Inline (dentro do card) para tudo que tem equivalente single-profile.
- Secção separada apenas para conteúdo que **não existe** no modo single (ex.: futuro "gap analysis" Fase 2).

Justificação: o utilizador lê "Engagement deste perfil" — se acima ou abaixo lhe mostras "Engagement deste perfil vs X", são duas leituras do mesmo facto. Substituir.

### 4.5 Escala para 2+ competitors (Fase 1.5)

`CompareStatBlock` actual aceita primary + 1 competitor. Para N competitors:
- Variante `CompareStatBlockN` que renderiza primary + array (até 3) com mesma altura por barra
- `CompareBarPair` evolui para `CompareBarGroup` (N+1 barras agrupadas por categoria)
- `CompareTable` já é trivial (linhas = entradas, colunas = handles)

O `ComparisonContext` já entrega `competitors[]` completo; só os cards precisam de saber quantos consumir. Fase 1 fixa em 1 via `context.competitors.slice(0, 1)`.

## 5. Riscos

| Risco | Mitigação |
|---|---|
| Cards comparison-mode crescem em altura e quebram mobile | Mobile-first: stack vertical primary→competitor; o `CompareStatBlock` já tem fallback grid-cols-1 |
| Free/Public passa a chamar lógica compare por engano | `comparisonMode` no context é `false` quando `variant === "public_mvp"`; cards default a single |
| AI insights por card foram escritos para single-profile | Em Fase 1.1/1.2 mantém-se o texto IA single — só a *visualização* dos números muda; texto comparativo é Fase 2 |
| Snapshot sem `competitorBreakdown` mas com `competitor_usernames` | `hasCompetitor` baseia-se em `competitorBreakdown.length`, não em usernames — não há risco de render vazio |
| Locked teasers podem reagir mal a comparison-mode | Apenas `mode === "all"` ou `"locked"` activam compare; teasers em `free_with_engagement` ficam isolados |
| Adapter `snapshot-to-report-data` pode não ter todos os campos de competitor necessários para Engagement/Format | Verificar antes de Fase 1.2 — Fase 1.1 só consome o que já existe (handle, followers, postsAnalyzed, engagementRate, avgLikes, avgComments, postingFrequencyWeekly) |

## 6. Plano de implementação em fases seguras

### Fase 1.0 — Foundation (sem mudança visual)
Prompt: "Cria `ComparisonContext` (Provider em ReportShellV2, hook `useComparison()`), com `hasCompetitor`, `comparisonMode`, `competitors`, `primary`. NÃO alterar nenhum card ainda. Apenas wiring + testes. Free/Public mantém `comparisonMode=false`."

### Fase 1.1 — Card-aware: Engagement + Frequência + Identity scores
Prompt: "Move comparison de KPIs principais para dentro de `EngagementCardRefined`, `FrequencyCard` e do mini-grid de scores no `EditorialIdentityCard`. Remove os 3 wrappers append (`CompetitorEngagementCompare`, `CompetitorCadenceCompare`, `CompetitorOverviewCompare`) do `report-overview-block.tsx`. Mantém `CompetitorBioCompare` por enquanto."

### Fase 1.2 — FormatCard com paired bars + Bio absorvida
Prompt: "Transforma `FormatCard` em modo comparação usando `CompareBarPair` ×3 (Reels/Carousels/Imagens). Move `CompetitorBioCompare` para uma secção colapsável dentro do `EditorialIdentityCard`. Elimina os wrappers redundantes."

### Fase 1.3 — Limpeza
Prompt: "Remove ficheiros `competitor-*-compare.tsx` que ficaram órfãos. Atualiza imports. Confirma typecheck. Re-QA visual em `nunomarkl` desktop+375px."

### Fase 1.5 (futura) — Multi-competitor
Evolui `CompareStatBlock` → `…N`, `CompareBarPair` → `…Group`. Sem alterar contracts do context.

### Fase 2 (futura) — Gap analysis e IA comparativa
Bloco novo (única secção *adicionada*, não absorvida) com gap analysis IA-gerada. Requer prompt IA dedicado.

## 7. O que NÃO se toca

Apify, OpenAI, DataForSEO, EuPago, checkout, credits, entitlements, schema, Free/Public report, providers, adapter de dados, lógica de Add Competitor, snapshot `nunomarkl`. Zero migrations. Zero secrets.

## 8. Deliverable desta auditoria

Esta auditoria é a entrega. Nada foi alterado. Próximo passo: tua decisão de aprovar Fase 1.0 isoladamente ou pedir refinamento.
