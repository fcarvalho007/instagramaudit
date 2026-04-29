# Refinar UX do relatório público `/analyze/$username`

Objectivo: relatório premium, cinematográfico e claro para utilizadores não-técnicos. Remover repetição de cards, dar destaque correcto à leitura por IA, melhorar bloco final e mobile 375px. Sem tocar em `/report/example`, ficheiros locked, providers, OpenAI, Apify, DataForSEO, PDF backend ou schema.

## Diagnóstico atual

- `ReportPage` (locked) já renderiza `ReportAiInsights` com os mesmos `aiInsights` do snapshot. A página `/analyze/$username` adiciona depois `ReportEnrichedAiInsights` com o **mesmo conteúdo** + confidence/evidence/meta — duplicação visível.
- `ReportEnrichedBio` aparece **antes** do `ReportHeader` locked (que já mostra `@username` + avatar gradiente). Resultado: o utilizador vê dois headers de perfil antes de chegar a métricas.
- Coverage strip aparece entre a bio e o `ReportPage`, ocupando espaço acima do fold sem mostrar dados.
- Quase todos os companion blocks usam exactamente o mesmo wrapper (`rounded-2xl border border-border-subtle/40 bg-surface-secondary/40 p-6 md:p-8`). Visualmente é uma pilha de cards iguais.
- `ReportFinalBlock`: a tipografia funciona, mas falta uma legenda curta para utilizadores não-técnicos (o que é confiança, sinais, etc.) — actualmente está no `ReportEnrichedAiInsights`, escondido no fundo.
- Mobile 375px: bio + coverage + `ReportHeader` + `ScopeStrip` empilham antes das KPIs. Excesso de meta antes de dados reais.

## Alterações (apenas ficheiros não-locked)

### 1. `src/routes/analyze.$username.tsx` — reordenação editorial

Nova ordem (editorial, mobile-first):

```text
[ReportHeader locked dentro de ReportPage]   ← identidade + @username + avatar
[ReportEnrichedBio compacta]                 ← bio + link Instagram (sem avatar duplicado)
[CoverageStrip]                              ← cobertura: posts, janela, benchmark, concorrentes
[ReportAiInsights locked dentro de ReportPage] ← leitura estratégica em destaque
  └─ companion subtil: confiança + sinais + meta
[restante ReportPage: KPIs, temporal, benchmark, formatos, concorrentes, top posts, heatmap, hashtags]
[ReportEnrichedTopLinks]                     ← links reais para top posts
[ReportEnrichedMentions]
[ReportEnrichedCompetitorsCta] (se vazio)
[ReportMarketSignals]
[ReportEnrichedBenchmarkSource]              ← metodologia agrupada com sinais de mercado
[ScopeStrip + TierComparisonBlock]
[ReportFinalBlock]
```

Chave: o `ReportPage` locked **já contém** `ReportHeader` + `ReportAiInsights` + tudo o resto. Não podemos partir esse bloco. Solução: mover a Bio/Coverage para **depois** do `ReportPage` apenas quando duplicariam — alternativa preferida: manter Bio compacta **acima** do `ReportPage` mas removendo o avatar (o locked já mostra o gradiente), tornando-a uma faixa fina só com **eyebrow + bio + link**, sem card pesado. Coverage passa a tira tipográfica fina (sem caixa) imediatamente abaixo da Bio.

### 2. Eliminar duplicação de IA

- Remover `ReportEnrichedAiInsights` da posição actual (após `ReportPage`).
- Reconvertê-lo num **rodapé editorial subtil** (sem card grande) que segue o `ReportPage` e mostra apenas: linha tipográfica `Confiança média · X sinais citados · Modelo · Gerado em` + um `<details>` colapsável "Ver detalhe por insight" que expande a lista actual de confidence/evidence. Para utilizador não-técnico fica fechado por omissão.

Ficheiro a alterar: `src/components/report-enriched/report-enriched-ai-insights.tsx`.

### 3. Reduzir repetição de cards

Aplicar 3 tratamentos visuais distintos em vez de um único:

- **Tier 1 — destaque** (já existe no `ReportPage` locked): só para KPIs e leitura de IA.
- **Tier 2 — companion editorial**: `border border-border-subtle/30 bg-surface-secondary/30 p-5 md:p-6` (mais leve). Aplicar a `ReportEnrichedTopLinks`, `ReportEnrichedMentions`.
- **Tier 3 — nota tipográfica fina**: sem card, apenas separador superior + tipografia. Aplicar a `ReportEnrichedBio` (após reordenação), `ReportEnrichedBenchmarkSource`, `CoverageStrip` (já é assim).

### 4. AI Insights — subtitle help

Adicionar **uma linha** de microcopy directamente no companion subtil a explicar o que são "Confiança" e "Sinais" para não-técnicos. Texto pt-PT a adicionar em `report-enriched-copy.ts`:

- `helpLine: "Cada leitura indica o nível de certeza do modelo e os indicadores do relatório que sustentam a conclusão."`

### 5. `ReportFinalBlock` — clarificar hierarquia

- PDF continua como acção primária (já está).
- Adicionar abaixo do título uma micro-legenda pt-PT: `"O PDF inclui todas as secções deste relatório. O link público pode ser partilhado durante a fase beta."`
- Reposicionar feedback beta para uma única linha tipográfica de fim (já está, manter).
- Mobile: forçar `w-full` no botão PDF até `sm:` e nos botões de partilha. Actualmente `shrink-0 inline-flex` mas dentro de coluna — confirmar full-width até 640px.

### 6. Microcopy de ajuda (legenda)

Acrescentar uma faixa fina opcional após `CoverageStrip`, contendo glossário ultra-curto (3 itens) em `font-mono` 10px, escondida em mobile (`hidden md:flex`):

```text
ENGAJAMENTO   média de interações por publicação ÷ seguidores
BENCHMARK      mediana do dataset comparável (mesmo idioma e dimensão)
SINAIS         indicadores do snapshot que sustentam cada leitura de IA
```

Ficheiro novo: `src/components/report-enriched/report-enriched-glossary.tsx` + entrada em `report-enriched-copy.ts`.

### 7. Mobile 375px

- `ReportEnrichedBio`: passar a tier 3 (sem card, sem avatar duplicado) — ganha 1 viewport.
- `CoverageStrip`: já é fina; manter.
- `ScopeStrip`: mover para **depois** do `ReportPage` (junto ao `TierComparisonBlock`) — actualmente aparece antes do final block, manter aí.
- `ReportFinalBlock`: botões `w-full` em mobile.
- Verificar overflow horizontal no `@username` do `ReportHeader` locked: **não tocar** (locked). O fix vive na bio companion: garantir `min-w-0` e `truncate` apenas na bio companion.

## Ficheiros a editar (todos não-locked)

- `src/routes/analyze.$username.tsx` — reordenar, simplificar `CoverageStrip`.
- `src/components/report-enriched/report-enriched-bio.tsx` — converter para tier 3 (sem card, sem avatar).
- `src/components/report-enriched/report-enriched-ai-insights.tsx` — converter em rodapé subtil + `<details>` colapsável.
- `src/components/report-enriched/report-enriched-copy.ts` — adicionar `helpLine`, `glossary`.
- `src/components/report-enriched/report-enriched-glossary.tsx` — **novo** ficheiro.
- `src/components/report-share/report-final-block.tsx` — micro-legenda + `w-full` em mobile.
- `src/components/report-share/share-copy.ts` — adicionar `description` actualizada.

## Ficheiros explicitamente NÃO tocados

- Tudo em `LOCKED_FILES.md` (incluindo `report-page.tsx`, `report-ai-insights.tsx`, `report-header.tsx`, `report.example.tsx`).
- Lógica de providers (`src/lib/analysis/*`, edge functions, OpenAI prompt, Apify, DataForSEO).
- PDF backend.
- Admin.
- Schema Supabase.

## Validação

- `bunx tsc --noEmit`
- `bun run build`
- Inspeccionar `/analyze/frederico.m.carvalho` no preview a 1280px e 375px.
- Confirmar via DevTools que nenhuma chamada nova é feita (mesmas requests: `analyze-public-v1`, `analysis-snapshot/:user`).
- `git diff` deve mostrar zero alterações em ficheiros locked.

## Checkpoint

- ☐ Duplicação de IA eliminada (locked block + companion subtil colapsável).
- ☐ Hierarquia editorial: identidade → bio → cobertura → IA → métricas → enriquecimento → metodologia → tier → final.
- ☐ Três tratamentos visuais distintos (destaque / companion / nota fina).
- ☐ Microcopy de ajuda em pt-PT (glossário + legenda no final block).
- ☐ Final block com PDF primário, partilha secundária, feedback subtil; botões full-width em mobile.
- ☐ Mobile 375px: menos meta antes dos dados, sem overflow horizontal.
- ☐ Sem chamadas a providers adicionais.
- ☐ Zero edições em `LOCKED_FILES.md`, `/report.example`, providers, PDF, admin, schema.
