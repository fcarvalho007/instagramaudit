Plano para ligar dados reais de benchmark ao adaptador do relatório

Estado observado
- O adapter `snapshotToReportData` é puro e devolve `engagementBenchmark: 0`, `engagementDeltaPct: 0` e `formatBreakdown[].benchmark: 0`, com `status: "abaixo"` fixo.
- Já existe um motor de benchmark completo em `src/lib/benchmark/`:
  - `loadBenchmarkReferences()` lê de `benchmark_references` (com cache 10min e fallback in-code).
  - `computeBenchmarkPositioning()` devolve tier, format, valor de benchmark, valor do perfil e delta.
  - `getReferenceFromData()` permite obter o benchmark para um par tier × format.
- O componente `report-format-breakdown.tsx` aceita 3 status: `abaixo`, `acima`, `ligeiramente-acima`. Não existe `alinhado` no componente — vou respeitar este conjunto.
- A rota admin `/admin/report-preview/snapshot/$snapshotId` chama `snapshotToReportData` no cliente, sem benchmarks.
- A rota admin `/admin/report-preview/$username` faz o mesmo.

Estratégia
1. Manter o adapter puro: aceitar um input opcional `benchmark` com tudo o que vem da BD, sem fazer I/O.
2. Calcular o benchmark do lado servidor:
   - novo helper em `src/lib/report/benchmark-input.server.ts` que carrega `loadBenchmarkReferences()` e devolve um objecto compatível com o adapter, incluindo:
     - `positioning`: resultado de `computeBenchmarkPositioning()` para o engagement médio do perfil
     - `perFormatReference`: valores de benchmark para Reels/Carousels/Imagens no tier do perfil
     - `tierLabel`, `datasetVersion`
3. Os endpoints `GET /api/admin/snapshot-by-id/$snapshotId` e `GET /api/admin/snapshot/$username` passam a devolver também `benchmark`.
4. As rotas admin de pré-visualização passam `benchmark` ao adapter.

Alterações detalhadas

1. `src/lib/report/snapshot-to-report-data.ts`
   - Acrescentar tipo:
     ```
     ReportBenchmarkInput {
       positioning: BenchmarkPositioning;
       perFormatReference: { Reels: number|null; Carousels: number|null; Imagens: number|null };
       tierLabel: string;
       datasetVersion: string;
     }
     ```
   - Aceitar `input.benchmark?: ReportBenchmarkInput`.
   - `buildKeyMetrics` passa a receber `benchmark`:
     - `engagementBenchmark = positioning.benchmarkValue` quando disponível, senão 0.
     - `engagementDeltaPct = positioning.differencePercent` arredondado a 1 dp, senão 0.
   - `buildFormatBreakdown` recebe `benchmark`:
     - `benchmark[format] = perFormatReference[format] ?? 0`.
     - `status` calculado por delta vs benchmark do formato com a mesma regra ±10% do motor:
       - delta > +10% → `acima`
       - 0 < delta ≤ +10% → `ligeiramente-acima`
       - delta ≤ 0 → `abaixo`
     - Quando não há benchmark do formato, manter `benchmark: 0` e `status: "abaixo"` (placeholder).
   - `coverage.benchmark`:
     - `real` se `positioning.status === "available"` E pelo menos um formato com benchmark > 0.
     - `partial` se houver benchmark do tier mas faltam formatos.
     - `placeholder` quando não há nada.
   - Adapter continua puro: zero I/O.

2. Novo `src/lib/report/benchmark-input.server.ts`
   - `buildReportBenchmarkInput(payload)`: carrega `loadBenchmarkReferences()`, classifica formato dominante via `normaliseFormatLabel` partilhado, calcula `computeBenchmarkPositioning`, retorna a estrutura `ReportBenchmarkInput`.
   - Server-only (usa o loader cached).

3. `src/routes/api/admin/snapshot-by-id.$snapshotId.ts`
   - Importa o helper server-side e devolve `benchmark` no JSON.
   - Sem chamadas Apify.

4. `src/routes/api/admin/snapshot.$username.ts`
   - Mesmo update, para manter paridade na rota username.

5. `src/routes/admin.report-preview.snapshot.$snapshotId.tsx`
   - Estende o tipo `SnapshotResponse` com `benchmark?: ReportBenchmarkInput`.
   - Passa `benchmark` ao chamar `snapshotToReportData`.

6. `src/routes/admin.report-preview.$username.tsx`
   - Mesma alteração para paridade.

Sem alterações
- `/report/example`: intacto. `report-mock-data` permanece com os seus números.
- `/analyze/$username`: UI inalterada.
- Public landing: inalterada.
- PDF/email: inalterados (já usam `loadBenchmarkReferences` independentemente).
- Sem migrações: `benchmark_references` já existe e está populado via fallback in-code se a tabela vier vazia.

Validação
- A pré-visualização do snapshot existente abre.
- `engagementBenchmark` deixa de ser 0 quando há tier com referência.
- `formatBreakdown[].benchmark` populado por formato.
- `coverage.benchmark` actualiza para `real` ou `partial` em vez de `placeholder`.
- `bunx tsc --noEmit` e `bun run build` verdes.
- Sem chamadas Apify.

Ficheiros previstos
- Editar: `src/lib/report/snapshot-to-report-data.ts`
- Criar: `src/lib/report/benchmark-input.server.ts`
- Editar: `src/routes/api/admin/snapshot-by-id.$snapshotId.ts`
- Editar: `src/routes/api/admin/snapshot.$username.ts`
- Editar: `src/routes/admin.report-preview.snapshot.$snapshotId.tsx`
- Editar: `src/routes/admin.report-preview.$username.tsx`

Checkpoint
☐ Adapter puro com input benchmark opcional
☐ Helper server-side carrega `loadBenchmarkReferences`
☐ Endpoints admin devolvem `benchmark`
☐ Pré-visualizações passam `benchmark` ao adapter
☐ Coverage actualizado
☐ Sem Apify, sem migrações
☐ tsc + build ok