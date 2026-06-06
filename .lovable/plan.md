# Plano — Final estratégico do Pro report (06 + 07)

## Estado actual

`ReportDiagnosticBlock` (renderizado pelo shell quando `premiumUnlocked && features.blockDiagnosis !== "hidden"`) mostra hoje, na ordem:
- Grupo A: Q01 contentType + Q02 funnel
- Grupo B: Q03 hashtags + Q04 captions
- Grupo E: análise visual de capas
- Grupo C: Q05 audience (+ comment intelligence)
- Grupo D: Q06 integração de canais → `id="contexto-estrategico"`
- `ReportDiagnosticPriorities` → `id="prioridades"`

Resposta às perguntas: **substituir tudo no Pro por 06 + 07** e **fonte híbrida** (AI quando há `aiInsightsV2`, regras determinísticas como fallback).

## Mudanças

### 1. Detector de modo no diagnostic block
Ficheiro: `src/components/report-redesign/v2/report-diagnostic-block.tsx`

- Importar `useReportVariant()` de `@/lib/report/report-variant`.
- Computar `isLab = variant === "internal_lab"`.
- Quando `isLab === false` (público + pro_preview): renderizar apenas `<StrategicContextCard>` + `<ReportDiagnosticPriorities>`. Saltar grupos A/B/C/D/E completamente.
- Quando `isLab === true`: render existente intacto (todos os grupos + capas + integração + prioridades).
- Manter as âncoras `id="contexto-estrategico"` e `id="prioridades"` para a sidebar.

### 2. Novo componente `StrategicContextCard` (06)
Ficheiro: `src/components/report-redesign/v2/strategic-context-card.tsx`

Layout editorial premium (sem dashboard pesado):
- Header:
  - Eyebrow: `06 · CONTEXTO ESTRATÉGICO` (Inter uppercase via `.text-eyebrow-sm`).
  - H2 Fraunces: "O que estes sinais dizem sobre o perfil?"
- Síntese editorial (1 parágrafo, 2–4 frases): pt-PT, prosa calma. Hybrid:
  - Se `result.enriched.aiInsightsV2?.editorial_verdict?.summary` existir, usar.
  - Else `result.enriched.aiInsightsV2?.sections.hero?.text` se existir.
  - Else fallback determinístico curto: `"Este perfil mostra um padrão {contentType.label} com {funnel.label}. {audience.status === "active" ? "A audiência responde activamente." : "A audiência ainda interage pouco."}"` — só usando campos que existem.
- 3 pilares em grid `grid-cols-1 md:grid-cols-3 gap-4`. Cada pilar é um cartão minimalista (sem heavy chrome, `border border-border-default rounded-xl p-5`, eyebrow + título + 1 frase):
  1. **Padrão forte** (eyebrow `signal-success`): derivar do sinal mais positivo disponível — maior share de formato dominante, funnel focado, audience activa, integração clara, ou AI `sections.topPosts.text` / `sections.formats.text` quando `emphasis === "positive"`.
  2. **Risco editorial** (eyebrow `signal-warning`): derivar do sinal mais frágil — dominância excessiva (>70% de um formato), comunicação dispersa, audience silent, integração ausente, ou AI section com `emphasis === "negative"`.
  3. **Sinal a acompanhar** (eyebrow `accent-primary`): tendência neutra a monitorizar — share secundária a crescer, hashtags moderadamente usadas, captions com pattern emergente, ou AI section neutra.
- Fallback gracioso: se nenhum pilar tiver evidência mínima, render apenas a síntese com nota discreta `"Sinais insuficientes para conclusões mais detalhadas."` (sem placeholders quebrados).

**Helper puro** `buildStrategicPillars({ contentType, funnel, audience, integration, hashtags, aiSections, editorialVerdict })` → `{ summary: string; pillars: Array<{ kind, title, body }> }` em `src/lib/report/strategic-context.ts`. Sem I/O. Testável.

### 3. Refinamento mínimo de `ReportDiagnosticPriorities` (07)
Ficheiro: `src/components/report-redesign/v2/report-diagnostic-priorities.tsx`

- Header passa de "PRIORIDADES" (eyebrow neutro) para um header editorial:
  - Eyebrow: `07 · PRIORIDADES DE ACÇÃO`
  - H3 Fraunces: "O que testar, corrigir ou repetir?"
  - Manter chip de count + `<ReportSourceLabel type="ia" />` quando AI.
- Manter os 3 cards (alta/media/oportunidade) — já encaixam no padrão pedido (título + body + "resolves" como why-it-matters).
- Sem mexer em `derivePriorities`, `PriorityItem` ou lógica de fallback. Só copy/header.

### 4. i18n
Adicionar chaves opcionais a `public/locales/pt/report.json` para o eyebrow/título de 06 e 07. Fallbacks inline garantem que nada quebra se estiverem ausentes.

## Ficheiros a editar

- `src/components/report-redesign/v2/report-diagnostic-block.tsx` (gating por variant, render condicional)
- `src/components/report-redesign/v2/strategic-context-card.tsx` (novo)
- `src/lib/report/strategic-context.ts` (novo, helper puro híbrido)
- `src/components/report-redesign/v2/report-diagnostic-priorities.tsx` (header editorial)
- `public/locales/pt/report.json` (chaves de strategic_context.* — opcional, com fallbacks)

## Fora do âmbito (não tocar)

- `block02-diagnostic.ts` (classifiers + `derivePriorities` intactos)
- `aiInsightsV2` schema / generation pipeline
- Preço, checkout, EuPago, entitlements, créditos
- `report-variant.ts`, gating do shell
- Lab full preview — continua a render tudo (Q01-Q05, capas, integração, priorities)
- Cálculos, scraping, snapshot, DB
- Componentes 01–05 (overview, engagement, frequência, formatos, publicações-chave)

## Riscos e salvaguardas

- **Risco:** lab perde diagnósticos. Mitigado: gating por `variant === "internal_lab"` mantém render completo no lab.
- **Risco:** AI overclaim. Helper apenas mapeia secções AI existentes — sem prompts novos, sem inferências privadas. Quando AI ausente, fallback determinístico usa só `sample size`, `sharePct`, `label`, etc.
- **Risco:** sinais insuficientes geram pilares vazios. Helper devolve apenas pilares com evidência; UI degrada para "síntese + nota" graciosamente.
- **Risco:** sidebar 06/07 perde âncora. Mantemos `id="contexto-estrategico"` e `id="prioridades"`.
- **Risco:** `aiInsightsV2` pode ser undefined em snapshots antigos. Helper trata `null/undefined` em todos os campos.

## Checklist de validação manual

1. Pro report (premium unlocked, variant comercial) termina com exactamente dois cards: 06 Contexto estratégico + 07 Prioridades.
2. Não aparecem Q01–Q05, capas visuais, hashtags diagnostics, captions diagnostics nem integração no Pro.
3. Lab (`/admin/report-preview/$handle?variant=internal_lab`) continua a mostrar todos os grupos como antes.
4. 06 mostra síntese editorial + até 3 pilares (Padrão forte / Risco editorial / Sinal a acompanhar) ou fallback gracioso quando sinal insuficiente.
5. 07 mostra header editorial novo e até 5 prioridades (AI quando disponível, determinísticas como fallback — sem mudar lógica).
6. Sidebar 06/07 ainda scroll-link para os cartões.
7. Mobile: layout legível, sem overflow, espaçamento generoso.
8. Public/free (sem premium) continua a mostrar teasers 03–07 inalterado.
9. Copy em pt-PT, sem afirmações de dados privados.

## Aprovação

Posso avançar?
