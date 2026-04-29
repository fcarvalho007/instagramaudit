Redesign do relatório público `/analyze/$username` — premium, cinematic, analytics-first

Objectivo
Transformar o relatório de uma pilha plana de cards num documento editorial com hierarquia clara, secções diferenciadas visualmente, CTAs fortes e leitura rápida em mobile. Inspirado em Iconosquare nos princípios — não no visual nem na marca. Preserva integralmente `/report/example`, providers, schema e ficheiros locked.

Princípios de design aplicados
- 3 níveis visuais: hero / secção primária, cards analíticos, notas metodológicas.
- Áreas com gradientes pastel suaves apenas em zonas-âncora (hero, AI reading, market signals, CTA final). Resto fica em superfícies calmas.
- Cards brancos espaçosos sobre fundo levemente tingido — chega de “20 cards iguais”.
- Ritmo alternado: full-bleed soft → grelha de cards densos → full-bleed soft.
- CTAs primários com forte contraste; secundários em pílula minimal.
- Tipografia: Fraunces para headings editoriais grandes; Inter para corpo; mono apenas em eyebrows e KPIs.
- Mobile-first: hero compacto, KPIs em grelha 2×2, secções com mais respiração e nada de overflow horizontal a 375px.

Mapa de antes → depois (hierarquia)

Antes (ordem actual)
1. Bio enriquecida (faixa fina)
2. CoverageStrip (4 chips)
3. Glossário (3 termos)
4. ReportPage locked: header com avatar, KPIs, gráfico temporal, gauge, formatos, concorrentes, top posts, heatmap, melhores dias, hashtags, AI insights, footer
5. Companion AI insights (resumo técnico + details)
6. Top links enriquecidos (lista)
7. Menções enriquecidas (chips)
8. CTA concorrentes (quando vazio)
9. Market signals (quando ready)
10. Fonte do benchmark (faixa fina)
11. Scope strip
12. Tier comparison (free vs pro)
13. ReportFinalBlock (PDF + partilha + feedback)

Depois (ordem nova)
1. Hero premium (novo wrapper editorial, sobre `ReportPage`/`ReportHeader` locked)
   - Eyebrow “InstaBench · Relatório editorial”
   - Avatar grande + `@username` Fraunces XL + nome real
   - Bio truncada (1 linha em mobile, 2 em desktop)
   - Linha de badges de cobertura: “Dados públicos”, “IA editorial”, “Benchmark”, “Pesquisa” — cada uma com cor de status (real/partial/empty)
   - Linha meta: nº de publicações · janela · data da análise
   - CTAs visíveis: PDF primário grande (cyan sólido) + “Copiar link” secundário em pílula
   - Fundo com gradiente pastel cyan→violet muito suave + grão sutil (radial-gradient)
2. Executive summary strip (faixa de 4–5 KPIs grandes)
   - Engagement médio · Posts analisados · Frequência semanal · Formato dominante · Estado do benchmark
   - Numero grande Fraunces, micro-caption em mono, sem cards pesados (dividers verticais)
3. Strategic AI reading (secção premium, full-bleed leve)
   - Reaproveita os insights persistidos via `enriched.aiInsights`
   - Cards numerados generosos com faixa de cor lateral por prioridade
   - Sub-linhas humanas: “envolvimento médio”, “referência de mercado”, “diferença face ao benchmark” — substitui qualquer rótulo cru
   - Resumo técnico (confiança/modelo/data) recolhido num details discreto no fim
4. Procura de mercado (Market Signals)
   - Sai do meio do scroll para uma secção dedicada com fundo pastel
   - Título: “Procura de mercado associada ao perfil”
   - Descrição: “Cruza o conteúdo do Instagram com sinais de pesquisa para perceber se os temas também despertam interesse fora da plataforma.”
   - Mostra: chips de keywords usáveis, palavra mais forte em destaque, gráfico, footer com fonte
   - Estado vazio compacto e elegante (em vez de invisível) explicando porquê
5. Performance ao longo do tempo (chart locked do `ReportPage`)
   - Mantido, com header editorial reescrito por copy do hero (sem mudar o componente locked)
6. Benchmark + performance por formato
   - Gauge + format breakdown (locked) com novo enquadramento editorial
7. Top posts (locked, já clicáveis)
   - Mantém imagens reais e link clicável
   - Lista de top links + menções movem para uma “Camadas extras” compacta
8. Resposta da audiência (heatmap + melhores dias)
9. Hashtags + palavras-chave de captions
10. Metodologia
    - Card único com 4 fontes (Apify · DataForSEO · OpenAI · benchmark dataset)
    - Linguagem não-técnica
11. Bloco final único
    - PDF grande primário, “Copiar link” / “Partilhar” secundário, LinkedIn em pílula
    - Feedback beta em linha discreta
    - Tier comparison passa para um teaser compacto antes do CTA, em vez de bloco gigante a meio

Como vou implementar (não-destrutivo)

Novos componentes (não-locked)
- `src/components/report-redesign/report-hero.tsx`
- `src/components/report-redesign/report-executive-summary.tsx`
- `src/components/report-redesign/report-section-frame.tsx` (frame editorial reutilizável: eyebrow + título Fraunces + subtítulo + slot)
- `src/components/report-redesign/report-ai-reading.tsx` (substitui visualmente o `ReportAiInsights` locked num envelope premium, reusando os mesmos dados de `enriched.aiInsights` que já existem; o locked dentro de `ReportPage` continua igual e é reordenado/renderizado fora — ver abaixo)
- `src/components/report-redesign/report-methodology.tsx`
- `src/components/report-redesign/report-tier-teaser.tsx` (versão compacta do tier comparison)
- `src/components/report-redesign/report-shell.tsx` (orquestrador novo que compõe a nova hierarquia)
- `src/components/report-redesign/report-tokens.ts` (gradientes pastel + utilidades de classe; sem hardcoding de cores: usa tokens existentes via `bg-[color-mix(...)]` ou utilities Tailwind)

Reutilização de componentes locked sem os modificar
- Posso renderizar `ReportPage` inteiro como bloco “núcleo analítico”, mas o pedido dele sai escondido se já tivermos hero novo e executive summary que duplicam o `ReportHeader` e o `ReportKeyMetrics`.
- Estratégia limpa: extraio para `ReportShell` apenas as secções locked que continuam relevantes:
  - `ReportTemporalChart`
  - `ReportBenchmarkGauge`
  - `ReportFormatBreakdown`
  - `ReportCompetitors`
  - `ReportTopPosts`
  - `ReportPostingHeatmap`
  - `ReportBestDays`
  - `ReportHashtagsKeywords`
  - `ReportFooter`
- Cada uma é importada directamente (são componentes named export) e envolvida pelo novo `ReportSectionFrame`. Não toco no código locked.
- `ReportHeader` e `ReportKeyMetrics` ficam fora do novo shell — o hero novo + summary substituem-nos visualmente. `/report/example` continua a usar `ReportPage` completo, intacto.
- `ReportDataProvider` continua a fornecer o contexto a toda a árvore.

Mudanças mínimas em ficheiros existentes
- `src/routes/analyze.$username.tsx`: substitui o orquestrador actual por `<ReportShell …/>`. Mantém `useReportShareActions` e passa actions ao hero e ao bloco final. Mantém `Toaster`. Sem alterar a fetch logic.
- `src/components/report-share/report-final-block.tsx`: refresh visual leve (gradiente pastel + CTA PDF maior + LinkedIn em pílula). Mantém a mesma API.
- `src/components/report-market-signals/report-market-signals.tsx`: novo enquadramento (gradiente pastel, título em pt-PT humano, estado vazio compacto em vez de `return null`).
- `src/components/report-enriched/report-enriched-ai-insights.tsx`: passa a ser usado como “details” técnico dentro do novo `ReportAiReading`, não como bloco autónomo.
- `src/components/report-tier/scope-strip.tsx`: deixa de ser usado como secção full; o seu conteúdo informativo migra para o teaser compacto no fim.
- `src/components/report-tier/tier-comparison-block.tsx`: continua a existir, mas só é renderizado se quisermos manter a versão grande; por defeito o shell usa o teaser compacto e omite o bloco grande para encurtar o relatório.

NÃO toco em
- `/report.example` route
- Qualquer ficheiro em `LOCKED_FILES.md`
- Lógica de providers (Apify/OpenAI/DataForSEO)
- `routeTree.gen.ts`
- Schema Supabase / migrations
- `report-mock-data.ts` (já modificado neste sprint apenas para campo permalink)

Copy não-técnica (substituições aplicadas no hero / executive summary / AI reading / market signals)
- “engagement_pct”, “benchmark_value_pct”, “profile_value_pct”, “position below” → “envolvimento médio”, “referência de mercado”, “diferença face ao benchmark”, “abaixo / acima da referência”
- “snapshot”, “payload”, “normalized” → não aparecem
- “DataForSEO”, “Apify”, “OpenAI” aparecem só na metodologia, com explicação curta

Mobile (375px)
- Hero compacto: avatar 56px, `@username` text-2xl, bio 2 linhas
- CTAs em coluna, full-width, 44px de altura mínima
- Executive summary: grid 2 colunas com 4–5 KPIs (5º ocupa linha inteira)
- Section frames com `px-5` e gap vertical generoso
- Charts/heatmap: já têm scroll interno; vou garantir `min-w-0` em todos os wrappers para impedir overflow
- Sem `whitespace-nowrap` em headings

Validação
- `bunx tsc --noEmit`
- Inspecção visual via `browser--navigate_to_sandbox` em 1366×768, 768×1024 e 375×812
- Confirmar:
  - PDF visível e dominante no hero e no bloco final
  - AI reading aparece uma vez, com framing premium
  - Market signals visível e compreensível (mesmo em estado vazio)
  - Top posts com imagens reais ou gradiente fallback
  - Sem overflow horizontal em 375px
  - KPIs primários acessíveis em < 1 scroll em mobile
  - Sem nomes técnicos crus em copy visível
  - `/report.example` permanece exactamente como está

Riscos visuais residuais
- O `ReportPage` locked tem espaçamento próprio (`py-8 md:py-12 space-y-10`) que vou perder ao usar componentes individuais — terei de reproduzir o ritmo no `ReportShell` para não ficar mais apertado.
- `ReportFooter` locked pode duplicar info que o novo CTA bloco já dá; vou avaliar se o omito da nova ordem.
- O design vai ficar visualmente distinto do `/report/example` — desejado, pois `/report/example` é referência editorial original e não deve mudar.

Ficheiros que serão criados
- `src/components/report-redesign/report-hero.tsx`
- `src/components/report-redesign/report-executive-summary.tsx`
- `src/components/report-redesign/report-section-frame.tsx`
- `src/components/report-redesign/report-ai-reading.tsx`
- `src/components/report-redesign/report-methodology.tsx`
- `src/components/report-redesign/report-tier-teaser.tsx`
- `src/components/report-redesign/report-shell.tsx`

Ficheiros que serão editados
- `src/routes/analyze.$username.tsx`
- `src/components/report-share/report-final-block.tsx`
- `src/components/report-market-signals/report-market-signals.tsx`

Checklist de entrega
☐ Novo `ReportShell` com nova hierarquia ativo em `/analyze/$username`.
☐ Hero premium com avatar, badges de cobertura e CTAs visíveis acima do fold em desktop e mobile.
☐ Executive summary com 4–5 KPIs grandes.
☐ AI reading premium com copy humana; resumo técnico recolhido em details.
☐ Market signals visível, compreensível, com estado vazio elegante.
☐ Bloco final com PDF dominante e partilha clara.
☐ Sem overflow horizontal em 375px.
☐ `/report.example` inalterado.
☐ Tipagem limpa (`bunx tsc --noEmit`).