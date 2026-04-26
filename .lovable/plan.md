# Auditoria e refinamento da pré-visualização real (admin)

## O que está mal hoje

Após inspeção do snapshot real (`311067c4-…` · `frederico.m.carvalho` · 12 posts · 9 458 seguidores · ER médio 0,15 %) e dos componentes do relatório:

1. **KPI "Envolvimento médio"** (`report-key-metrics.tsx`)
   - O chip de tendência está fixo a `direction: "down"` + `trendVariant: "danger"`. Mesmo que `engagementDeltaPct` seja positivo (acima do benchmark), aparece sempre vermelho com seta para baixo.
   - Quando não há benchmark (`engagementDeltaPct === 0` e `engagementBenchmark === 0`) mostra "0% vs benchmark" como se houvesse leitura.
2. **Gauge de benchmark** (`report-benchmark-gauge.tsx`)
   - Badge fixo "Abaixo do benchmark" e parágrafo hardcoded "55% abaixo do benchmark de contas Micro com Reels…", independentemente dos valores reais.
   - Continua a renderizar mesmo quando não existe benchmark — mostra um marcador a 0 % e linha "Δ 0%".
3. **Copy de janela** (chart temporal e top-posts)
   - Adapter define `windowLabel = "amostra recente"` para amostras pequenas, o que dá frases agramaticais: "Evolução temporal · amostra recente" e "Ordenadas pelo envolvimento percentual nos amostra recente".
   - Falta a frase pedida: *"Análise baseada nas últimas N publicações recolhidas"* e *"Janela observada: X dias"*.
4. **Sem faixa de cobertura no topo** — o aviso de limitações está só no fim da página, depois de o admin já ter rolado tudo.
5. **Visualizações no chart temporal** — a série "Visualizações" aparece sempre, mas no snapshot real só Reels têm `video_views` (a maioria fica a 0); convém dizer-lo explicitamente.
6. **Cobertura de benchmark no notice** — o texto actual ("Benchmarks por escalão e por formato sem dados") só dispara em `placeholder`. Falta uma linha positiva quando `benchmark === "real"` para dar confiança ("Benchmarks reais ligados — dataset vX").

`/report/example` renderiza com `meta.isAdminPreview === false` e mantém o mock — todas as alterações ficam atrás de `isAdminPreview` ou de campos opcionais novos com fallback para o valor mock actual.

## O que vai mudar

### A. Adapter `snapshotToReportData`

- Calcular `windowLabel` / `windowShortLabel` mais legíveis:
  - Se `windowDays > 0`: `windowLabel = "janela de ${windowDays} dias"`, `windowShortLabel = "${windowDays} dias"`.
  - Caso contrário: `windowLabel = "amostra recolhida"`.
- Adicionar a `meta` três campos opcionais novos (todos com defaults compatíveis com o mock):
  - `sampleCaption` — *"Análise baseada nas últimas N publicações recolhidas."*
  - `temporalLabel` — *"Evolução temporal · janela de X dias"* ou *"Evolução temporal · amostra de N publicações"*.
  - `topPostsSubtitle` — *"Ordenadas por envolvimento. Janela observada: X dias."*
- Adicionar `meta.benchmarkStatus: "real" | "partial" | "placeholder"` (mesma lógica já calculada para `coverage.benchmark`).
- Adicionar `meta.viewsAvailable: boolean` — `true` se pelo menos um post tem `video_views > 0`.
- Adicionar `meta.benchmarkDatasetVersion?: string` (vem de `benchmark.datasetVersion`).
- Manter tudo opcional → o mock continua a renderizar exactamente como antes.

### B. `report-key-metrics.tsx`

- Derivar `direction` e `trendVariant` de `engagementDeltaPct`:
  - `delta > 0` → `direction: "up"` + `trendVariant: "success"`.
  - `delta < 0` → `direction: "down"` + `trendVariant: "danger"`.
  - `delta === 0` e `engagementBenchmark === 0` (sem benchmark) → ocultar o chip de tendência ou mostrar "Sem benchmark disponível" em tom neutro.
- Continuar a usar mock quando `meta.isAdminPreview` é falso (mock tem delta negativo → mantém o visual actual).

### C. `report-benchmark-gauge.tsx`

- Calcular badge dinamicamente:
  - `delta > 10` → "Acima do benchmark" (success), `delta` entre 0 e 10 → "Ligeiramente acima" (success), `delta ≤ 0` → "Abaixo do benchmark" (warning).
  - Sem benchmark (`engagementBenchmark === 0` e `meta.isAdminPreview`) → ocultar a secção inteira (return `null`) e deixar o `CoverageNotice` explicar.
- Substituir o parágrafo fixo "55% abaixo…" por uma frase composta com base nos valores reais (`Math.abs(delta)` + escalão + formato dominante). Manter a frase mock quando `meta.isAdminPreview` é falso (passa a ser o fallback default).

### D. `report-temporal-chart.tsx`

- Usar `meta.temporalLabel` quando disponível para a label da secção (em vez de `Evolução temporal · ${windowLabel}`).
- Quando `meta.viewsAvailable === false`, ocultar o chip "Visualizações" e a área correspondente, e acrescentar um pequeno rodapé: *"Visualizações disponíveis apenas para Reels — não há dados neste snapshot."*.

### E. `report-top-posts.tsx`

- Usar `meta.topPostsSubtitle` quando disponível; senão manter a frase actual.

### F. `report-competitors.tsx`

- Já oculta correctamente quando `competitors.length === 0 && isAdminPreview`. Sem alterações.

### G. `report-ai-insights.tsx`

- Já tem empty-state admin. Sem alterações.

### H. Página `admin.report-preview.snapshot.$snapshotId.tsx`

- **Adicionar uma faixa compacta no topo** (logo abaixo do `AdminBanner`, antes do `<ReportPage />`), só visível em estado `ready`, com 5 chips:
  - `Posts: N`
  - `Janela: X dias` (ou "amostra recolhida")
  - `Benchmarks: Real | Parcial | Indisponível`
  - `Concorrentes: Presentes (n) | Em falta`
  - `Insights de IA: Gerados | Por gerar`
  Cada chip usa as cores do design system (`signal-success`, `signal-warning`, `content-tertiary`) e tipografia mono — coerente com a estética editorial.
- Atualizar o `CoverageNotice` no fundo:
  - Quando `coverage.benchmark === "real"` → mostrar linha positiva: *"Benchmarks reais ligados (dataset vX) — leitura comparável com o escalão."*
  - Quando `coverage.benchmark === "partial"` → indicar quais formatos ficaram sem referência.
  - Manter as restantes linhas de janela/competitors/AI/imagens.

### I. `/report/example`

- **Não tocar.** Toda a lógica nova depende de campos opcionais em `meta` que o mock não preenche; nesses casos os componentes caem no fallback actual. Verificação: confirmar visualmente que a página renderiza idêntica.

## Detalhe técnico

- Tipos: estender `ReportData["meta"]` em `report-mock-data.ts` (campos novos opcionais) e tipar como `Partial<…>` no adapter.
- Não há novos imports de pacotes.
- Não se mexe no `ReportPage` shell.
- Não se chama Apify, não se cria migração, não se altera storage nem PDF/email.
- Locked files (`/LOCKED_FILES.md`) — confirmar que nenhum dos ficheiros listados acima está marcado como locked antes de editar.

## Validação

1. Abrir `/admin/report-preview/snapshot/311067c4-7de3-44e0-b0ee-d20c3a2d5004` e confirmar:
   - Faixa de cobertura no topo a mostrar "Posts: 12 · Janela: ~N dias · Benchmarks: Real/Parcial · Concorrentes: Em falta · IA: Por gerar".
   - KPI "Envolvimento médio" com cor coerente com o sinal real do delta (sem hardcoded danger).
   - Gauge com badge dinâmico ou oculto se não houver benchmark.
   - Chart temporal sem chip de "Visualizações" se todos os posts tiverem `video_views = 0`, com nota explicativa.
   - Sem promessas de "30 dias" no real.
2. Abrir `/report/example` e confirmar pixel-paridade com o estado anterior.
3. `bunx tsc --noEmit`.
4. `bun run build`.

## Ficheiros previstos

- `src/components/report/report-mock-data.ts` (estender `meta` com campos opcionais)
- `src/lib/report/snapshot-to-report-data.ts` (preencher novo `meta`)
- `src/components/report/report-key-metrics.tsx`
- `src/components/report/report-benchmark-gauge.tsx`
- `src/components/report/report-temporal-chart.tsx`
- `src/components/report/report-top-posts.tsx`
- `src/routes/admin.report-preview.snapshot.$snapshotId.tsx` (faixa de cobertura no topo + ajustes ao `CoverageNotice`)
- `src/routes/admin.report-preview.$username.tsx` (espelhar a faixa, para coerência)

## Checkpoint

- ☐ Adapter expõe `meta.benchmarkStatus`, `viewsAvailable`, `sampleCaption`, `temporalLabel`, `topPostsSubtitle`.
- ☐ KPI delta deixa de ser sempre vermelho.
- ☐ Gauge de benchmark é dinâmico ou oculto quando não há benchmark.
- ☐ Chart temporal oculta "Visualizações" e explica quando dados não existem.
- ☐ Faixa compacta de cobertura no topo da pré-visualização.
- ☐ `CoverageNotice` mostra linha positiva quando benchmark é real.
- ☐ `/report/example` inalterado.
- ☐ Sem chamadas Apify, sem migrações.
- ☐ `bunx tsc --noEmit` e `bun run build` verdes.
