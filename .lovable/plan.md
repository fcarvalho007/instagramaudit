## Refinement pass · Bloco 02

Cinco ajustes cirúrgicos. Sem providers, sem locked files, sem PDF, sem schema.

### Decisões prévias

- **F1 — âncora do CTA**: manter `href="#leitura-completa"` (já é a âncora real existente em `tier-comparison-block.tsx`, confirmada por `rg`). **Não** criar id `tier-comparison` adicional. Apenas atualizar o comentário em `report-diagnostic-cta.tsx` (que erradamente diz "âncora `#tier-comparison`").
- **F2 — `analyzedAtIso`**: opção A. O componente `ReportDiagnosticBlock` nunca aceitou esta prop nem a usa. Não há nada a remover do código — é uma correção de spec apenas. Sem alteração de ficheiros para este ponto.

### Alterações de código

**1. `src/lib/report/block02-diagnostic.ts` (F3)**

- Adicionar helper exportado `classifyQuestionShare(posts: SnapshotPost[]): { available: boolean; sharePct: number; sampleSize: number }`:
  - Disponível só quando `posts.length >= 4`
  - Para cada caption: remover hashtags (`/#\S+/g → ""`) **antes** de procurar `?`
  - Conta posts onde a caption (sem hashtags) contém `?`
  - Devolve `{ available: true, sharePct: round(count/total * 100), sampleSize }`
- Em `CaptionPatternResult`: adicionar `questionShareAvailable: boolean` ao lado do `questionSharePct` já existente
- Em `classifyCaptionPattern`: substituir o cálculo inline `caption.includes("?")` (que usa caption crua, contando hashtags como `#?... `) pela chamada a `classifyQuestionShare(posts)`. Popular `questionSharePct` e `questionShareAvailable` consistentemente nos três returns. Quando `posts.length < 4`, `questionShareAvailable = false`.

**2. `src/components/report-redesign/v2/report-diagnostic-block.tsx` (F3 + F4)**

- `renderCaptionCard`: condicionar a stat "COM PERGUNTAS" — só passar o item ao `DiagnosticMiniStats` quando `r.questionShareAvailable === true`. Se < 4 posts, mostrar só 2 mini-stats (caracteres médios + CTA).
- `buildVerdictText` (F4): reescrever os fallbacks deterministas com hedges canónicos. Linguagem proposta:
  - Prefixo: `"Com base na amostra analisada, "`
  - Conector forte: trocar `"com presença forte de"` por `"sinais de"`
  - Audiência: `"sinais de audiência silenciosa — likes consistentes, conversa rara"` / `"sinais de audiência ativa"`
  - Fallback de baixa amostra: `"Com base na amostra analisada, ainda não há sinal suficiente para um veredito editorial — a amostra é pequena ou pouco diferenciada."`
- `renderObjectiveCard` (Q08, F4): substituir o body atual (`"Inferência por padrão de conteúdo + funil + bio + ligação entre canais. É uma hipótese de leitura — confirme com o contexto real do perfil."`) por:
  - `"Hipótese principal derivada de sinais de conteúdo, funil, bio e ligação entre canais. Com base na amostra analisada — confirme com o contexto real do perfil."`
- `answerLabel` da Q08 já usa "Hipótese principal" / "Hipótese (sinal parcial)" — manter.

**3. `src/components/report-redesign/v2/report-diagnostic-cta.tsx` (F1)**

- Atualizar **apenas o comentário** JSDoc do componente: trocar "âncora `#tier-comparison` já existente" por "âncora `#leitura-completa` do `TierComparisonBlock`". Sem mudança de markup nem de href.

**4. `src/components/report-redesign/v2/report-diagnostic-group.tsx` (R1 / F5)**

- Já implementado na sessão anterior (linhas 42-50): quando `questionsCount === 1`, o filho recebe wrapper `md:col-span-2` via `Children.map`. Sem alteração — apenas confirmar.

### Ficheiros tocados (3)

- `src/lib/report/block02-diagnostic.ts` — novo `classifyQuestionShare` + `questionShareAvailable` em `CaptionPatternResult`
- `src/components/report-redesign/v2/report-diagnostic-block.tsx` — esconder stat se < 4 posts; reescrita do veredito determinista e do body do Q08 com hedges canónicos
- `src/components/report-redesign/v2/report-diagnostic-cta.tsx` — apenas comentário JSDoc

### Fora do scope

- Sem chamadas a Apify / DataForSEO / OpenAI / PDFShift / Supabase write
- Sem alterações a PDF, admin, `/report/example`, schema, prompts AI
- Sem novas dependências
- Sem regenerar relatórios
- Sem alterações a `tier-comparison-block.tsx` (decisão F1: manter âncora existente)

### Validação

- `bunx tsc --noEmit` (auto-build do harness)
- `bunx vitest run` (suite atual: 12 testes / 3 ficheiros — todos verdes na sessão anterior)
- Sem QA browser

### Checkpoint

☐ `classifyQuestionShare` criado e exportado
☐ `CaptionPatternResult.questionShareAvailable` populado nos 3 returns de `classifyCaptionPattern`
☐ Stat "COM PERGUNTAS" escondida quando `< 4` posts
☐ Veredito determinista usa hedges canónicos ("Com base na amostra analisada", "sinais de")
☐ Body do Q08 reescrito com hedges canónicos
☐ Comentário do CTA atualizado para `#leitura-completa`
☐ TypeScript verde
☐ Vitest verde (12 testes)
☐ Confirmação: zero chamadas externas
