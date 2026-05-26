
# Refinamento — `ReportMethodology` lê fontes da KB editável

Recomendação #1 da auditoria anterior: o que escreves em `/admin/conhecimento` (tabela `knowledge_sources`) deixa de ser invisível e passa a aparecer na lista "Fontes de referência" no rodapé do relatório.

Hoje essa lista é um array estático em `src/lib/knowledge/benchmark-context.ts` (Socialinsider/Buffer/Hootsuite/Databox). Já existem 5 fontes na DB (Socialinsider Mai 2026, Phlanx Q1 2026, Iconosquare 2026, InstaBench interno, Meta Business API) que **não chegam ao relatório**.

## Escopo (cirúrgico)

1. **Novo server function** `getReportMethodologySources` em `src/lib/knowledge/methodology.functions.ts`  
   - SELECT em `knowledge_sources` onde `url IS NOT NULL`, ordenado por `published_at DESC NULLS LAST`, limit 6.
   - Devolve `{ name, url, publishedYear, lastUpdatedLabel, shortDescription, type }`.
   - `lastUpdatedLabel` formatado em pt-PT a partir de `published_at` ("Mai 2026").
   - `shortDescription` vem de `notes` (truncado a 80 chars) — quando vazio, usa o `name` sem prefixo.

2. **`ReportMethodology` (componente)** passa a usar `useQuery`:
   - `queryKey: ["report", "methodology-sources"]`
   - `placeholderData`: lista estática actual (mantém SSR/render imediato sem flash).
   - `staleTime: 5 min`.
   - O resto do componente (grid de 4 ícones "Como este relatório foi feito") fica intacto — só a sub-lista "Fontes de referência" é dinâmica.

3. **`benchmark-context.ts`** mantém-se inalterado — continua a ser fonte de verdade para:
   - `INSTAGRAM_BENCHMARK_CONTEXT.engagement` (bandas do gráfico de benchmark, política editorial do prompt)
   - Fallback estático quando a query falha ou retorna vazio.

## Fora do escopo (próximos passos, não agora)

- Footnotes dinâmicas em FormatCard/FrequencyCard.
- Substituir bandas de benchmark do gráfico por `knowledge_benchmarks`.
- Cartão novo "O que diz o mercado".
- Levantar a proibição de citar fontes no prompt v2.

## Detalhe técnico

- O serverFn é público (sem `requireSupabaseAuth`) — usa `supabaseAdmin` para ler sources. A tabela `knowledge_sources` não tem RLS, mas o serverFn devolve apenas campos seguros (sem `created_by_email`, sem `id`).
- `useQuery` em vez de loader: o report é renderizado sob `_authenticated` e `/r/$token`, com loaders próprios; injectar no loader exigia tocar em ambos os shells e adapters — desnecessário para uma lista de ≤6 fontes.
- Fallback robusto: se o query falhar ou devolver `[]`, o `placeholderData` mantém a lista actual visível.

## Checkpoint

- ☐ `getReportMethodologySources` criado, devolve as 5 fontes actuais ordenadas por data
- ☐ `ReportMethodology` mostra Phlanx, Iconosquare e Socialinsider (em vez de Buffer/Hootsuite estáticos)
- ☐ Fontes sem `url` (InstaBench interno, Meta Business) **não** aparecem (filtro `url IS NOT NULL`)
- ☐ Sem flash de loading — SSR/primeiro paint mantém a lista estática
- ☐ Build sem erros, testes a verde
