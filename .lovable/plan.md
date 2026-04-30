
# Bloco 02 · Diagnóstico Editorial — replan + implementação

## Objetivo

Substituir a atual grelha fria de 6 cartões do Bloco 02 por um módulo editorial premium em que cada cartão é uma **pergunta humana com resposta sustentada nos dados já recolhidos**. Visual segue o mockup anexo: fundo claro, número grande "02", cabeçalho serif, eyebrows mono, cartões brancos, azul como cor analítica primária, âmbar só para cautela, vermelho só para alerta crítico genuíno.

Tudo deriva de heurísticas deterministas sobre `payload.posts`, `result.data` e `result.enriched`. Sem provedores externos, sem schema, sem prompts OpenAI, sem PDF, sem `/report/example`, sem admin.

## Auditoria de dados disponíveis

Confirmado em `snapshot-to-report-data.ts` e `block02-diagnostic.ts`:

- Posts: `caption`, `caption_length`, `hashtags`, `mentions`, `format`, `likes`, `comments`.
- `result.data.keyMetrics`: `dominantFormat`, `dominantFormatShare`.
- `result.data.formatBreakdown`: distribuição com nome + share.
- `result.data.topHashtags`, `result.data.topKeywords`.
- `result.enriched.profile.bio`, `result.enriched.mentionsSummary`.
- `result.enriched.editorialPatterns` (CTA density, cadência, mentions lift).
- `result.enriched.aiInsightsV2.sections` — secções já validadas, em particular `hero` (síntese geral) e `topPosts`/`language` que podem alimentar o veredito.

Conclusão: 8 perguntas são todas suportáveis com fallback gracioso. Nenhuma exige nova fonte de dados.

## Header do bloco

Atualizar `BLOCKS[1]` em `block-config.ts`:

- `shortLabel`: `"Diagnóstico"` (mantém — usado pela sidebar).
- `question`: `"O que explica estes resultados?"` (já está).
- `subtitle`: passa a `"Oito perguntas que qualquer marketer faz ao olhar para um perfil — respondidas pelo cruzamento dos dados recolhidos."`

O eyebrow renderizado pelo `ReportBlockSection` é derivado de `shortLabel.toUpperCase()` → mostrará `DIAGNÓSTICO`. Para alinhar com o mockup (`"DIAGNÓSTICO EDITORIAL"`), adicionamos um campo opcional `eyebrowOverride` em `BlockConfig` e usamo-lo apenas para o bloco 02 (`"DIAGNÓSTICO EDITORIAL"`). Os outros blocos continuam com o comportamento atual. Esta é a única alteração tocada fora do escopo do Bloco 02 e é puramente cosmética.

## Componentes a criar

Todos sob `src/components/report-redesign/v2/`:

1. **`report-diagnostic-block.tsx`** — orquestrador. Recebe `result` + `payload` e compõe veredito → 3 grupos → prioridades → CTA. Decide quais cartões esconder por falta de dados.
2. **`report-diagnostic-verdict.tsx`** — caixa azul/neutra com eyebrow `VEREDITO EDITORIAL · IA`, ícone `Bot` (lucide), texto. Usa `aiInsightsV2.sections.hero.text` se existir; caso contrário compõe um fallback determinista a partir de tipo de conteúdo + funil + formato dominante. Se nem o fallback tiver sinal mínimo, mostra cópia neutra: `"Ainda não há sinal suficiente para um veredito editorial — a amostra é pequena."`.
3. **`report-diagnostic-group.tsx`** — divisor full-width: letra (A/B/C) + label esquerda, contador `"N PERGUNTAS"` à direita, linha subtil.
4. **`report-diagnostic-card.tsx`** — cartão branco padrão: eyebrow `PERGUNTA NN · LABEL`, título serif entre aspas (a pergunta), bloco de "resposta dominante" colorido (slot configurável: barra simples, ranking, checklist, mini-stats), body interpretativo curto. Tom (`blue` neutro padrão; `amber` quando o cartão sinaliza cautela como "concentração alta num único formato"; `rose` só se houver `audiência silenciosa` real). Sem animações.
5. **`report-diagnostic-priorities.tsx`** — 3 cartões em coluna no mobile, 3 colunas em desktop. Tags coloridas (`PRIORIDADE ALTA` rose, `PRIORIDADE MÉDIA` amber, `OPORTUNIDADE` blue). Cada cartão indica que pergunta resolve.
6. **`report-diagnostic-cta.tsx`** — strip subtil com cópia "Quer aprofundar?…" e botão `Ver análise completa →` que aponta para a âncora `#tier-comparison` já existente (sem nova rota).

## Helper a estender

`src/lib/report/block02-diagnostic.ts` (não locked) ganha funções puras adicionais:

- `classifyChannelIntegration(enriched)` → `{ available, label, signals: { bioLink, newsletterMention, explicitCta } }`. Usa `enriched.profile.bio` (regex http/url/newsletter), `mentionsSummary`, e ratio CTA já calculado em `editorialPatterns.captionsCtaShare` (ou similar — se ausente, fallback para o cálculo já existente em `classifyCaptionPattern`).
- `inferProbableObjective(args)` → ranking até 4 hipóteses `[Notoriedade, Geração de leads, Comunidade, Vendas online, Educação]` derivado de mistura tipo de conteúdo + funil + bio + presença de link. Devolve `{ available, primary, ranking: [{label, score}], confidence: "low"|"med" }`.
- `inferThemes(topHashtags, topKeywords)` → label `"Hashtags mais recorrentes"` ou `"Temas mais recorrentes"` consoante a fonte com mais sinal, mais top 3.
- `derivePriorities(allClassifiers)` → escolhe até 3 ações deterministas a partir dos sinais (ex.: dominância de formato ≥ 60% → "Diversificar formatos"; CTA share < 10% → "Adicionar perguntas no fim das captions"; tema com tração externa = oportunidade). Cada item carrega `{ priority: "alta"|"media"|"oportunidade", title, body, resolves: "Pergunta NN" }`.

Tudo continua sem I/O e sem novas dependências.

## Mapeamento das 8 perguntas

```text
A · IDENTIDADE EDITORIAL (2)
  01 · Tipo de conteúdo  → classifyContentType(posts)
  02 · Funil             → classifyFunnelStage(posts)

B · COMO COMUNICA (4)
  03 · Formato           → keyMetrics.dominantFormat + formatBreakdown (barra)
  04 · Temas             → inferThemes(topHashtags, topKeywords)
  05 · Legendas          → classifyCaptionPattern(posts) + 3 mini-stats
  06 · Resposta público  → classifyAudienceResponse(posts)

C · CONTEXTO ESTRATÉGICO (2)
  07 · Integração canais → classifyChannelIntegration(enriched) + checklist
  08 · Objetivo provável → inferProbableObjective(...)
```

Regra de hide: se um classificador devolver `available:false` **e** não houver fallback útil, o cartão é escondido e o contador no divisor (`"N PERGUNTAS"`) é recalculado dinamicamente. Layout obriga a número par por linha — se ficar ímpar, o cartão restante ocupa coluna dupla no desktop para evitar órfão. Se um grupo inteiro ficar vazio, o divisor desse grupo também desaparece. Mínimo aceitável: 4 cartões totais.

## Layout

- Container já é `max-w-7xl px-5 md:px-6` herdado do `ReportShellV2`. O conteúdo do bloco fica `min-w-0`.
- Veredito: `max-w-none` dentro do bloco, padding interno generoso.
- Grupos: divisor full-width; grelha `grid-cols-1 md:grid-cols-2 gap-5`.
- Prioridades: `grid-cols-1 md:grid-cols-3 gap-4`.
- CTA: full-width com botão à direita em desktop, full-width em mobile.
- Sem overflow horizontal a 375px (testado mentalmente com `min-w-0` em todos os filhos do flex/grid).

## Integração no `ReportShellV2`

No `report-shell-v2.tsx`, secção `02 · Diagnóstico`:

- Remove `ReportAiReading` (mantém-se intacto, ainda usado no shell legacy do PDF — não tocamos).
- Remove `ReportPendingAiNotice` (idem).
- Remove `ReportDiagnosticGridV2` da renderização do bloco 02 (componente continua a existir para não quebrar nada, mas deixa de ser importado).
- Renderiza apenas `<ReportDiagnosticBlock result={result} payload={payload} analyzedAtIso={analyzedAtIso} />`.

Tom da banda passa de `soft-blue` para `canvas` para combater a "duplicação visual" do mockup (fundo claro neutro). Confirmado que isto é só o Bloco 02.

## Ficheiros tocados

**Criados:**
- `src/components/report-redesign/v2/report-diagnostic-block.tsx`
- `src/components/report-redesign/v2/report-diagnostic-verdict.tsx`
- `src/components/report-redesign/v2/report-diagnostic-group.tsx`
- `src/components/report-redesign/v2/report-diagnostic-card.tsx`
- `src/components/report-redesign/v2/report-diagnostic-priorities.tsx`
- `src/components/report-redesign/v2/report-diagnostic-cta.tsx`

**Editados:**
- `src/lib/report/block02-diagnostic.ts` (acrescenta classifiers; mantém os existentes — não quebra a `report-diagnostic-grid-v2.tsx` legada).
- `src/components/report-redesign/v2/block-config.ts` (subtitle do bloco 02 + campo opcional `eyebrowOverride`).
- `src/components/report-redesign/v2/report-block-section.tsx` (lê `eyebrowOverride` se existir).
- `src/components/report-redesign/v2/report-shell-v2.tsx` (substitui o conteúdo do bloco 02; muda tom para `canvas`).

**Não tocados (verificado contra `LOCKED_FILES.md`):**
- Toda a foundation (`tokens.css`, `styles.css`, `__root.tsx`).
- `report-shell.tsx` (legacy / PDF), `report-hero.tsx`, `report-kpi-grid.tsx`, `report-framed-block.tsx`, `report-section-frame.tsx`, `report-ai-reading.tsx`, `report-methodology.tsx`.
- Qualquer ficheiro de `/report/example`, admin, PDF, providers, schema, validators, prompts.
- `report-diagnostic-grid-v2.tsx` (não removido — fica latente para evitar regressões enquanto migramos).

## Validação

Após implementação:

- `bunx tsc --noEmit`
- `bunx vitest run`

Sem QA browser automático.

## Critérios de aceitação

- Bloco 02 segue o mockup: número grande, cabeçalho serif + eyebrow `DIAGNÓSTICO EDITORIAL`, veredito azul, 3 grupos com divisores, cartões brancos, prioridades, CTA.
- Cada cartão é pergunta humana entre aspas + resposta dominante + suporte de dados + interpretação curta.
- Não repete KPIs do Bloco 01.
- Veredito nunca inventa: usa AI v2 ou fallback determinista; tem cópia segura quando vazio.
- Cartões sem dados são escondidos sem deixar layout órfão; mínimo 4.
- `tsc` e `vitest` passam.
- pt-PT em toda a copy visível, sem termos técnicos (`payload`, `engagement_pct`, etc.).
- Sem chamadas a Apify/DataForSEO/OpenAI/PDFShift/Supabase write.
- PDF, providers, admin, schema e `/report/example` intactos.
