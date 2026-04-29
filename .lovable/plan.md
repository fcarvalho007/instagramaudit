# R6 — Product QA Audit: /analyze/$username

## Snapshot auditado
- ID: `683e4c21-60e0-4045-b43a-dfcd85fe9896` — frederico.m.carvalho
- 12 posts · `analysis_status: ready`
- `ai_insights_v1`: 5 insights (priority 95→72) com números reais, custo $0,0047 (gpt-5.4-mini)
- `ai_insights_v2`: 9 secções (hero, formats, heatmap, language, topPosts, benchmark, daysOfWeek, marketSignals, evolutionChart) com tonalidade adequada (negative/positive/neutral)
- `market_signals_free`: ready (keyword "ia" +67%)
- `editorial_patterns` no payload: ausente — derivado em runtime via `buildEditorialPatterns(payload)` no adapter (3 cards visíveis: tendência, comprimento, volume hashtags)
- `aiInsights` flag: presente; LEITURA IA renderizou no hero

QA visual feito a 1366×768 e 375×812. Estrutura confirmada por `extract` — todas as secções esperadas estão presentes na ordem correcta.

---

## 1. Product clarity — FORTE

Um marketer percebe imediatamente:
- **O quê** foi analisado: 12 publicações em 15 dias, com badges de cobertura (Dados públicos, IA editorial, Benchmark, Pesquisa).
- **O que importa**: o `AIInsightBox` no hero entrega o veredito macro em 1 frase ("0,11% vs 4,2% Nano").
- **Acima/abaixo do benchmark**: Reading IA + Gauge dão a leitura em duas camadas.
- **Que acções tomar**: 5 insights v1 com priority + body accionável (carrosséis, perguntas no fecho, IA como tema).

Pequena fricção: o **tier "Nano"** aparece sem explicação no hero — utilizador novo não sabe o que significa.

## 2. Information architecture — BOA, com 1 ajuste

Ordem renderizada (confirmada via DOM):

```
Hero → Insight hero → KPI grid → AI Reading (5 insights) → Market Signals
→ Editorial Patterns (3 cards) → Performance temporal → Benchmark + Formatos
→ Concorrentes → Top Posts → Heatmap + Best Days → Hashtags + Mentions
→ Methodology → Tier Teaser → TierComparisonBlock → Final Block → Beta Banner
```

- Sem duplicação de secções.
- **Editorial Patterns vem antes de Performance temporal** — bom (explica o porquê antes do gráfico).
- **`ReportTierTeaser` + `TierComparisonBlock` lado a lado** = duas camadas de upsell consecutivas. Provoca "duplo CTA Free vs Pro".
- **`ReportFinalBlock` + `BetaFeedbackBanner`** consecutivos no fim = três blocos de chamada à acção empilhados. Cansa.

## 3. Insight quality (v1 + v2) — MUITO FORTE

Avaliados os 5 insights v1 e as 9 secções v2:
- **Específicos**: sim — citam 0,11%, 4,2%, +67%, 28 gostos, 12 publicações.
- **Sem genéricos**: nenhum insight é "publica mais e melhor".
- **Accionáveis**: cada body tem verbo + alvo concreto ("incluir perguntas directas no fecho dos carrosséis").
- **Sem tokens técnicos**: nenhum `evidence` exposto na UI.
- **pt-PT natural**: "envolvimento", "ritmo", "directas", "carrosséis". Sem leaks pt-BR.

Único risco: o insight `ENGAGEMENT_GAP` reporta "-97,38 pp" — formato confuso (é -97,38% relativo, não pp absoluto). Numericamente correcto mas a unidade pode induzir em erro.

## 4. Editorial Patterns — SÓLIDO mas inconsistente em snapshots pequenos

Cards renderizados para este snapshot: **3 de 6** possíveis (Tendência, Comprimento de legenda, Volume de hashtags). Os outros 3 (Menções, Reels, Market fit) ficaram suprimidos por `available:false` — comportamento defensivo correcto.

Observações:
- Cards têm valor real ("ER 0,11% em 12 publicações"), não são placeholders.
- **Risco de leitura**: 3 cards parecem "subdimensionados" face à promessa "6 cruzamentos". Sem aviso de que mais cards aparecem com mais dados.
- Card "Tendência de engagement" mostra "Confiança — · amostra de 12" quando confidence é null — o "—" parece um erro.

## 5. Visual QA

**1366×768 (desktop)**:
- Hero limpo, banda azul-claro, CTAs alinhados.
- Header global do site (`InstaBench` navbar) **mantém-se em dark theme** sobre o report light → leve dissonância na barra de topo.
- **Flicker dark→light confirmado**: o skeleton (`AnalysisSkeleton`) renderiza em **dark** durante ~12s, depois a página comuta para light. O script `data-theme="light"` injectado no head só corre depois do skeleton.
- Beta banner usa CTA cinzento-900 sobre canvas — coerente mas paleta diferente do hero azul.

**375×812 (mobile)**:
- Sem overflow horizontal.
- `@frederico.m.carvalho` quebra em 2 linhas no h1 display — aceitável.
- CTAs Exportar PDF + Partilhar empilhados full-width — correcto.

**768×1024**: não testado mas componentes usam `sm:` breakpoints adequados; risco baixo.

## 6. Commercial readiness

| Caso | Estado |
|---|---|
| Free preview | OK — coverage badges + tier teaser sinalizam claramente o que é free. |
| Paid PDF | Botão "Exportar PDF" funcional, mas existem **2 CTAs PDF** (hero + Final Block "Pedir versão PDF") com copy diferente — sinal misto. |
| Subscription upsell | Presente via `TierComparisonBlock`. Forte. |
| Agency use | Razoável — relatório partilhável, mas sem branding white-label nem export por email. |
| Client presentation | Editorial e legível, mas o flicker dark→light e a navbar dark por cima quebram a "polidez de cliente". |

## 7. Gaps prioritizados

### Bloqueadores críticos
Nenhum. O report entrega valor real e estável.

### Médios (afectam percepção de qualidade)
1. **Skeleton dark sobre report light** — flicker desagradável de ~12s na primeira carga. O script `data-theme="light"` corre só no `head`, mas o skeleton importa o `ReportThemeWrapper` apenas depois de `state === "ready"`.
2. **Header `InstaBench` global em dark** sobre o report light — dissonância visual.
3. **Duplo CTA PDF** ("Exportar PDF" + "Pedir versão PDF") com copy diferente — inconsistência.
4. **Tier "Nano" sem tooltip** — utilizador novo não sabe o que é.
5. **TierTeaser + TierComparisonBlock + FinalBlock + BetaBanner** = 4 CTAs empilhados no fim. Sobrecarrega.
6. **Insight ENGAGEMENT_GAP** com unidade ambígua ("-97,38 pp" quando é variação relativa).

### Polimento minor
- Editorial Patterns: quando `confidence === null`, esconder o "Confiança —" em vez de mostrar dash.
- Editorial Patterns: header poderia indicar "3 de 6 padrões disponíveis nesta amostra" para quadrar a expectativa.
- Beta banner no fundo poderia ficar dentro do tier light theme (cinzento-900 destoa).

### O que já está forte
- Insights v1 e v2 muito acima da média (números, accionáveis, pt-PT impecável).
- Adapter resiliente (editorial_patterns derivado em runtime, sem precisar de re-snapshot).
- Cobertura de coverage badges é honesta.
- Mobile-first correctamente implementado.
- Defensivos: pending notice para snapshots <5min sem v1, cards omitidos quando dados insuficientes.

---

## Verdict

**SAFE WITH FIXES**

O report transforma dados em informação e em conhecimento accionável. Os blockers são todos cosméticos/UX — nenhum compromete a integridade dos números nem a credibilidade editorial.

---

## Próximo prompt prioritário (R7)

**R7 — Polish UX + coerência editorial do /analyze/$username**

Goal: eliminar fricções cosméticas que comprometem a percepção premium do report sem alterar pipeline, payload ou IA.

Tasks (uma única tarefa, não cumular features):
1. **Eliminar flicker dark→light**:
   - `AnalysisSkeleton` deve renderizar dentro do `ReportThemeWrapper` (light theme) para herdar a paleta correcta.
   - Confirmar que o script `data-theme="light"` corre antes do primeiro paint mesmo em SSR-off.
2. **Harmonizar header**: detectar rota `/analyze/$username` e aplicar variante light ao `InstaBench` navbar (ou esconder navbar global e mostrar barra mínima própria do report).
3. **Resolver duplo CTA PDF**: alinhar copy ("Exportar PDF" em ambos) ou diferenciar semanticamente (hero = "Exportar agora", final = "Receber por email").
4. **Reduzir empilhamento de CTAs no fim**: fundir `TierTeaser` no header do `TierComparisonBlock` ou colapsar `BetaBanner` numa faixa menor.
5. **Tooltip explicativo no tier "Nano"** no hero (popover discreto: "Tier baseado em followers e formato dominante").
6. **Editorial Patterns**: ocultar "Confiança —" quando null; adicionar contagem honesta "3 de 6 padrões disponíveis com esta amostra".
7. **Insight ENGAGEMENT_GAP**: corrigir unidade no template do insights generator para evitar "pp" quando é variação relativa.

Rules:
- Read-only sobre `/report/example`, snapshots, schema, providers.
- Sem chamadas Apify/DataForSEO/OpenAI/Supabase mutations.
- Validar: `bunx tsc --noEmit` + `bunx vitest run`.
- Mobile-first (375 + 768 + 1366).

Expected outcome: SAFE TO CONTINUE TO MONETIZAÇÃO.
