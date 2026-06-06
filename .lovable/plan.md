## 1 · Auditoria — ficheiros inspecionados

- `src/lib/report/report-variant.ts` — define `ReportVariant` (`public_mvp` | `internal_lab` | `pro_preview`), `VariantFeatures`, `FEATURE_LABELS`, `MODULE_READINESS` e o `VARIANT_FEATURES` por variante (fonte de verdade da visibilidade).
- `src/components/report-redesign/v2/block-config.ts` — definição estática dos 6 blocos (id, número, eyebrow, pergunta humana, subtítulo, ícone, `featureKey`).
- `src/components/report-redesign/v2/report-shell-v2.tsx` — orquestrador único do relatório (usado por `analyze`, `reports`, `admin.report-lab`, `admin_.report-preview.*`). Renderiza condicionalmente cada bloco com base em `features.blockXxx !== "hidden"` e `premiumUnlocked`.
- `src/components/report-redesign/v2/report-overview-block.tsx` — Bloco 01 (Visão geral + Engagement + Frequência + Formato + Best vs Worst), com modos `all` / `free` / `locked`.
- `src/components/report-redesign/v2/report-diagnostic-block.tsx` — Bloco 02 atual (Diagnóstico editorial / "O que explica estes resultados?").
- `src/components/report-redesign/v2/report-block-nav.tsx` — sidebar + tabs mobile; constrói itens a partir de `BLOCKS`, com regra de "accessible" vs "locked" por variante (`buildSidebarItems`).
- `src/routes/analyze.$username.tsx` — call site público (`variant="public_mvp"`, `lockBoundary="engagement"`, `premiumUnlocked={false}`).
- `src/routes/reports.$snapshotId.tsx` — relatório histórico público (`variant="public_mvp"`).
- `src/routes/admin.report-lab.tsx` — Report Lab admin (variante controlada por search param, com Module Visibility Matrix).
- `src/routes/admin_.report-preview.$username.tsx` / `admin_.report-preview.snapshot.$snapshotId.tsx` — preview fullscreen sem chrome admin; aceita `variant` por search param.
- `src/lib/admin/simple-gate.ts` + `src/routes/admin.tsx` — gate admin partilhada.

## 2 · Estrutura atual

| # | Bloco (id) | `featureKey` | public_mvp | pro_preview | internal_lab |
|---|---|---|---|---|---|
| 01 | Visão geral (`overview`) | `blockOverview` | full | full | full |
| 02 | Diagnóstico editorial (`diagnostico`) | `blockDiagnosis` | full (gated por `premiumUnlocked`) | full | full |
| 03 | Desempenho — "Quando e como reage o público?" (`performance`) | `blockPerformance` | lightweight (oculto no corpo) | full | full |
| 04 | Conteúdo (`conteudo`) | `blockContent` | hidden | full | full |
| 05 | Procura (`procura`) | `blockSearch` | hidden | full | full |
| 06 | Comparação (`benchmark`) | `blockBenchmark` | hidden | full | full |

Observações:
- A "Frequência editorial" e o "Mix de formatos" pedidos para o Pro estão hoje **dentro** do Bloco 01 (`report-overview-block.tsx`), juntamente com "Publicações-chave" (PostComparisonBlock).
- "Contexto estratégico" e "Prioridades de acção" são partes do Bloco 02 (`report-diagnostic-priorities.tsx` + insight callouts) — não são blocos próprios.
- "Quando e como reage o público?" (heatmap, melhores dias, evolução temporal) vive todo no Bloco 03 (`performance`).
- Sidebar mostra hoje os 6 blocos como "free/included/premium" baseado puramente na variante.
- Lock visual ("desbloquear") é controlado por `lockBoundary="engagement"` + `premiumUnlocked` apenas em `/analyze/$username`.

## 3 · Estrutura alvo

Mapeamento 1-para-1 do pedido para os blocos existentes — sem inventar novos componentes, sem mexer em dados:

| # cliente | Etiqueta cliente | Implementação | Acesso FREE | Acesso PRO | Acesso LAB |
|---|---|---|---|---|---|
| 01 | Visão geral | Bloco 01 — modo `free` (Identity Card + Methodology line) | ✅ | ✅ (modo `all`) | ✅ |
| 02 | Engagement | `EngagementCardRefined` (parte locked do Bloco 01) | ✅ | ✅ | ✅ |
| 03 | Frequência editorial | `FrequencyCard` (parte locked do Bloco 01) | 🔒 teaser | ✅ | ✅ |
| 04 | Mix de formatos | `FormatCard` (parte locked do Bloco 01) | 🔒 teaser | ✅ | ✅ |
| 05 | Publicações-chave | `PostComparisonBlock` (parte locked do Bloco 01) | 🔒 teaser | ✅ | ✅ |
| 06 | Contexto estratégico | Bloco 02 — `ReportDiagnosticBlock` (sem `procura` / sem `comment intelligence`) | ❌ | ✅ | ✅ |
| 07 | Prioridades de acção | `ReportDiagnosticPriorities` (cauda do Bloco 02) | ❌ | ✅ | ✅ |
| LAB | "Quando e como reage o público?" | Bloco 03 inteiro | ❌ | ❌ | ✅ |
| LAB | Conteúdo (top links, hashtags estendidas, mentions) | Bloco 04 | ❌ | ❌ | ✅ |
| LAB | Procura | Bloco 05 | ❌ | ❌ | ✅ |
| LAB | Comparação avançada | Bloco 06 | ❌ | ❌ | ✅ |
| LAB | Comment intelligence detalhada | `commentIntelligence` | ❌ | ❌ | ✅ |

Resultado: o `pro_preview` deixa de mostrar Performance/Content/Search/Benchmark. O `internal_lab` continua a mostrar tudo.

## 4 · Sidebar proposta

Reaproveitar `buildSidebarItems` em `report-block-nav.tsx` — sem mudar a UI, apenas a lista de itens visíveis:

- **public_mvp**: `Visão geral` (acessível) + `Engagement`, `Frequência editorial`, `Mix de formatos`, `Publicações-chave`, `Contexto estratégico`, `Prioridades de acção` como locked com badge "PRO".
- **pro_preview**: os 7 itens acima, todos acessíveis. Performance/Conteúdo/Procura/Comparação **não aparecem** na sidebar Pro.
- **internal_lab**: os 7 do Pro + uma secção visual separada `LAB` com `Performance`, `Conteúdo`, `Procura`, `Comparação` (badge "LAB").

Para suportar isto sem duplicar componentes, o `block-config.ts` ganha um campo `tier: "free" | "pro" | "lab"` por bloco e os blocos atualmente fundidos no Bloco 01 (`engagement`, `frequencia`, `formatos`, `publicacoes-chave`) e no Bloco 02 (`contexto`, `prioridades`) passam a ser declarados como itens lógicos de navegação (apontam para âncoras `id=` já existentes ou novas no DOM). Isto não muda o que é renderizado, só os links da sidebar.

## 5 · Estratégia de blur/locked no FREE

- **Engagement** permanece totalmente legível (já é o teaser principal do free).
- **Frequência / Mix de formatos / Publicações-chave**: renderizar um cartão `LockedTeaser` reutilizável (variação do já existente `PerformanceLockedTeaser` em `report-shell-v2.tsx`) — título + 1 frase + CTA "Desbloquear PRO" via `PremiumCtaProvider`. Sem blur de dados reais (evita render desnecessário e custos de cálculo).
- Hoje o gate aplica-se a tudo a partir de Engagement; passa a aplicar-se só a partir de Frequência. Mantém-se o `lockBoundary="engagement"` mas o `ReportOverviewBlock` ganha um terceiro modo `"free_plus_engagement"` (ou um `lockBoundary="frequency"` novo) — opção a decidir no momento da implementação (ver §7).

## 6 · Sticky bar

Mantém-se o `StickyUnlockBar` atual (mobile, gated por `lockBoundary && !premiumUnlocked && !unlocked`). Só muda a copy default ("Desbloquear PRO: frequência, formatos, publicações-chave e prioridades de acção") via i18n. Sem mudanças funcionais.

## 7 · Rota de pré-visualização interna

A rota fullscreen já existe e tem gate admin (`readAdminEmail`):

- `/admin/report-preview/:handle?variant=internal_lab` — leaf `src/routes/admin_.report-preview.$username.tsx`. URL canónica para "lab full preview" de um perfil.
- `/admin/report-preview/snapshot/:snapshotId?variant=internal_lab` — para snapshots históricos.

Adicionar:
- Pill "INTERNAL · LAB FULL PREVIEW" no topo (já existe um `ExitPreviewPill`; adiciona-se um label de variante ao lado).
- Atalho rápido a partir de `/admin/report-lab` ("Abrir LAB completo em ecrã cheio") — já existe botão; só atualizar a copy.
- Não cria URL nova; reaproveita a existente. Se preferires `/admin-report-lab/full-preview/:handle`, faz-se com `createFileRoute("/admin-report-lab/full-preview/$handle")` que apenas redireciona internamente para `admin_.report-preview` com `variant=internal_lab` (não é estritamente necessário).

## 8 · Ficheiros prováveis de editar

Apresentação e configuração apenas — zero alterações em dados, scrapers, métricas, RLS, schemas, pagamentos, créditos ou entitlements:

1. `src/lib/report/report-variant.ts` — ajustar `VARIANT_FEATURES.pro_preview` para esconder `blockPerformance`, `blockContent`, `blockSearch`, `blockBenchmark` e `commentIntelligence`. Atualizar `MODULE_READINESS` notes.
2. `src/components/report-redesign/v2/block-config.ts` — opcional: adicionar campo `tier` e/ou novos itens lógicos para Engagement / Frequência / Formatos / Publicações-chave / Contexto / Prioridades (apenas metadados de navegação, com `featureKey` já existente).
3. `src/components/report-redesign/v2/report-shell-v2.tsx` — extender o `ReportOverviewBlock` call site para passar `lockBoundary` mais granular OU consumir a nova prop `mode="free_plus_engagement"`. Atualizar copy do `StickyUnlockBar`/teaser.
4. `src/components/report-redesign/v2/report-overview-block.tsx` — split em sub-secções discretas (Engagement, Frequency+Format, Best vs Worst) para suportar gate parcial e o novo modo.
5. `src/components/report-redesign/v2/report-block-nav.tsx` — `buildSidebarItems` lê o novo `tier` e/ou agrupa por `Incluído (FREE) / PRO / LAB`. Sem novos componentes visuais.
6. `src/components/report-redesign/v2/end-of-free-block.tsx` — verificar copy do CTA premium (texto apenas).
7. `src/routes/admin_.report-preview.$username.tsx` — pill de label "LAB" quando `variant=internal_lab`.
8. `src/routes/admin.report-lab.tsx` — atualizar VARIANT_OPTIONS descriptions; nada mais.
9. `src/i18n/locales/pt/report.json` + `en/report.json` — chaves novas (sidebar tiers, teaser copy, sticky bar copy). Sem mudança de chaves existentes.

Ficheiros que **não** vão ser tocados: tudo em `src/lib/report/snapshot-to-report-data.ts`, `score-utils`, `cadence-label`, `block01-sample`, `block02-diagnostic`, qualquer coisa em `src/routes/api/`, `supabase/migrations/**`, `src/lib/billing/**`, `src/lib/admin/variant-overrides.functions.ts`, `report-data-context`, scrapers, `report-temporal-chart`, `report-posting-heatmap`, `report-best-days`, `report-market-signals/**`, `report-benchmark-gauge`, `report-competitors`.

## 9 · Ordem de implementação segura

1. **Snapshot do estado actual**: garantir que `pro_preview` no Report Lab está visualmente OK antes de mudar.
2. **Variant config primeiro** (passo isolado, reversível): mudar `VARIANT_FEATURES.pro_preview` para `hidden` em performance/content/search/benchmark/commentIntelligence. Validar em `/admin/report-lab?variant=pro_preview` e em `/admin/report-preview/:handle?variant=pro_preview`. Lab continua intacto.
3. **Sidebar tiers**: introduzir `tier` no `block-config.ts` e atualizar `buildSidebarItems` para agrupar `Incluído / PRO / LAB`. Apenas UI da sidebar.
4. **Split do Bloco 01**: refatorar `ReportOverviewBlock` em sub-componentes Engagement / Frequency+Format / Best vs Worst — sem mudar UI inicial.
5. **Gate parcial no FREE**: trocar `mode="locked"` por renders teaser nas 3 subsecções pagas + manter `EngagementCardRefined` visível. Atualizar `lockBoundary` se necessário.
6. **Copy e i18n**: atualizar sticky bar, teaser, sidebar.
7. **Pill "LAB" no admin preview**.
8. **QA**: percorrer `/analyze/<handle>` (free), `/admin/report-lab?variant=pro_preview`, `/admin/report-preview/<handle>?variant=internal_lab`, e `/reports/<snapshot>`.

## 10 · Pode resolver-se via config central?

Sim. O sistema já tem fonte única de verdade em `VARIANT_FEATURES` + `BLOCKS`. As únicas extensões necessárias são:

- 1 campo novo (`tier`) por bloco em `block-config.ts`.
- Renomear/dividir o Bloco 01 em sub-blocos lógicos para a sidebar (sem partir o render).
- Pequena lógica em `buildSidebarItems` e em `ReportOverviewBlock` para honrar o novo gate parcial.

Tudo o resto (visibilidade por variante) já é dirigido pelo objecto `VARIANT_FEATURES`.

## 11 · Confirmações

- **Sem mudanças em cálculo de dados.** As funções `compute*` e adapters mantêm-se intactos.
- **Sem mudanças em payment / entitlement / créditos.** `premiumUnlocked={false}` continua hardcoded em `/analyze`; nenhum hook de billing é tocado. Toda a interacção paga continua a passar pelo `PremiumCtaProvider`/`PremiumInterestDialog` (waitlist) já existente.
- **Sem mudanças em scrapers, snapshots, DB ou edge.**

## 12 · Riscos e safeguards

- **Risco 1**: regressão visual no `pro_preview` ao esconder 4 blocos. **Mitigação**: validar no Report Lab antes de propagar; reversão = restaurar `VARIANT_FEATURES.pro_preview`.
- **Risco 2**: split do Bloco 01 partir o scroll-spy / âncoras (`#engagement`, `#frequencia`, …). **Mitigação**: manter os mesmos `id`s no DOM; `use-active-block.ts` continua a funcionar.
- **Risco 3**: testes em `__tests__/premium-cta-unification.test.ts` referem-se a `lockBoundary === "engagement"`. **Mitigação**: se alterarmos a fronteira, atualizar a expressão regular do teste.
- **Risco 4**: PDF export (`api/public/public-report-pdf.ts`) usa o mesmo shell — confirmar que o Pro PDF deixa de incluir os blocos lab. **Mitigação**: validar com snapshot de teste antes de aprovar.
- **Risco 5**: utilizadores em beta com links partilhados para `#performance` deixam de encontrar a secção. **Mitigação**: adicionar redirect suave (scroll para final do free) — opcional.

## 13 · Aprovação

Aguardo aprovação para passar a build mode e executar pela ordem proposta em §9. Posso também, se preferires, executar apenas o passo 2 (variant config) primeiro como entrega isolada e validar contigo antes de avançar para a refacção da sidebar e do Bloco 01.