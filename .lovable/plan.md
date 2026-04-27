Plano · Vista pública de relatório real para o `/analyze/$username`

Conclusão da inspecção
- A funcionalidade pedida **já está implementada** no estado actual do projecto:
  - `src/routes/analyze.$username.tsx` chama `fetchPublicAnalysis` (que aciona `/api/analyze-public-v1`), em seguida lê `/api/public/analysis-snapshot/{username}`, corre `snapshotToReportData` e renderiza `ReportThemeWrapper + ReportPage` com os dados reais.
  - O `ReportPage` (locked) já aceita `data?` opcional via `ReportDataProvider`. Sem necessidade de tocar no ficheiro locked.
  - Existe já um `CoverageStrip` no topo com publicações, janela em dias, dataset de benchmark e estado de concorrentes.
  - Os componentes "premium-locked / dashboard dark" (`PublicAnalysisDashboard`, `PremiumLockedSection`, `ReportGateModal`) **já não são usados** por nenhuma rota — são código morto.
  - O `/admin/report-preview/snapshot/$snapshotId` continua intacto e usa o mesmo adaptador.
  - `/report/example` mantém-se isolado com o `report-mock-data.ts`.

Diferenças residuais face ao pedido
1. **AI insights vazios**: `ReportAiInsights` mostra um cartão com mensagem placeholder em vez de **esconder** a secção quando `aiInsights.length === 0` e `coverage.aiInsights === "empty"`. O pedido é explícito: "Hide AI insights if aiInsights is empty".
2. **Nota de origem dos dados**: o `CoverageStrip` actual não inclui a frase "relatório baseado em dados públicos do Instagram".
3. **Limpeza opcional**: `public-analysis-dashboard.tsx`, `premium-locked-section.tsx`, `report-gate-modal.tsx` são código morto; podem ficar como estão (não interferem) ou ser removidos.

Ficheiros a inspeccionar (referência rápida)
- `src/routes/analyze.$username.tsx` — rota actual (já correcta)
- `src/components/report/report-page.tsx` (locked, não tocar)
- `src/components/report/report-ai-insights.tsx` — alvo da única alteração
- `src/components/report/report-data-context.tsx`
- `src/lib/report/snapshot-to-report-data.ts`
- `src/lib/analysis/client.ts`
- `src/routes/api/analyze-public-v1.ts`
- `src/routes/api/public/analysis-snapshot.$username.ts`
- `src/routes/admin.report-preview.snapshot.$snapshotId.tsx` (validação de regressão)

Ficheiros a editar
- `src/routes/analyze.$username.tsx` — adicionar uma linha textual no `CoverageStrip` com a nota "Dados públicos do Instagram · amostra recolhida via Apify".
- `src/components/report/report-ai-insights.tsx` — quando `insights.length === 0`, devolver `null` (esconde a secção). Mantém o branch real intacto.

Ficheiros a NÃO editar
- `src/components/report/report-page.tsx` (locked)
- Qualquer ficheiro em `src/components/report/` listado em `LOCKED_FILES.md`
- `src/routes/report.example.tsx`
- `src/routes/api/analyze-public-v1.ts` (lógica Apify)
- `src/lib/apify/*`, kill-switch, allowlist, cache
- Schema Supabase
- PDF, email, billing, DataForSEO, payments, landing

Justificação para ignorar `report-page.tsx` apesar de locked
- Não precisa de ser editado: já recebe `data?` e usa `ReportDataProvider`. A vista pública já o renderiza directamente. Sem violação da regra de locked files.

Fluxo de dados (já existente, mantido)
```text
Browser /analyze/@handle
    │
    ▼
fetchPublicAnalysis(handle, competitors)
    │  POST /api/analyze-public-v1
    ▼
api/analyze-public-v1.ts
    │  Apify (com kill-switch, allowlist, cache)
    │  ↳ persiste em analysis_snapshots
    ▼
GET /api/public/analysis-snapshot/{handle}
    │  → { payload, meta, benchmark } (benchmark resolvido via benchmark_references)
    ▼
snapshotToReportData({ payload, meta, benchmark, isAdminPreview: false })
    │  → { data: ReportData, coverage }
    ▼
<ReportThemeWrapper>
  <CoverageStrip result/>     ← publicações · janela · benchmark · concorrentes · nota fonte
  <ReportPage data={result.data}/>
       ├─ Header, KPIs, Temporal, Benchmark, Formatos
       ├─ Competidores, Top posts, Heatmap, Best days, Hashtags
       ├─ AiInsights → null se vazio    ← única mudança real
       └─ Footer
</ReportThemeWrapper>
```

Cópia em pt-PT do micro-acrescento ao `CoverageStrip`
- Linha discreta abaixo dos chips: "Relatório baseado em dados públicos do Instagram." ou equivalente sóbrio. Sem promessas exageradas.

Avaliação de risco
- **Baixo**: a alteração ao `ReportAiInsights` é isolada e devolve `null` num único caminho — sem efeitos cruzados nos outros componentes do relatório.
- **Baixo**: a linha de nota no `CoverageStrip` é apenas markup adicional dentro da rota.
- **Nenhum risco** para `/admin/report-preview/snapshot/$snapshotId`: o admin preview também usa o mesmo `ReportPage` e o mesmo adaptador. Esconder AI insights vazios beneficia ambos.
- **Nenhum risco** para `/report/example`: o mock tem `aiInsights` populados, portanto a secção continua visível.
- **Nenhum risco** para o pipeline Apify, schema ou rotas de API.
- Código morto (`PublicAnalysisDashboard`, etc.) fica para um eventual ciclo de limpeza separado.

Checklist de validação
☐ `/analyze/@frederico.m.carvalho` carrega e mostra: skeleton → relatório real
☐ `CoverageStrip` exibe contagens reais e a nota de fonte
☐ Quando `aiInsights` está vazio, a secção deixa de ser renderizada
☐ Quando `aiInsights` tem itens (mock do `/report/example`), a secção continua a aparecer
☐ `/report/example` mantém-se idêntico
☐ `/admin/report-preview/snapshot/$snapshotId` continua a renderizar correctamente, com a secção de AI insights escondida nos snapshots reais e visível quando houver insights
☐ `/admin/report-preview/$username` (preview por handle) mantém comportamento
☐ `bunx tsc --noEmit` passa sem erros
☐ Sem novas dependências, sem mexer em LOCKED_FILES, sem alterações de schema

Resposta às perguntas explícitas do pedido
- **Pode ser feito sem tocar em `/report/example`?** Sim. As alterações ficam confinadas a `analyze.$username.tsx` e `report-ai-insights.tsx`. O `/report/example` continua a usar `report-mock-data.ts` sem qualquer modificação.