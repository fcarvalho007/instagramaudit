# Fase I — Navegação e chrome do relatório (Editorial V2)

Auditoria feita antes do plano. Abaixo está o contrato funcional real encontrado
em produção e o que a Fase I vai reutilizar sem alterar comportamento.

## 1. Arquitectura de chrome encontrada em produção

- `report-shell-v2.tsx` compõe: hero (`report-hero-v2.tsx`), tabs mobile
  (`ReportBlockTopTabs`), sidebar desktop (`ReportBlockSidebar`), barra utilitária
  (`report-utility-bar.tsx`), `sticky-unlock-bar.tsx`, `back-to-top-button.tsx`,
  atalhos de teclado (`use-report-keyboard-shortcuts.ts` + `report-shortcut-dialog.tsx`).
- `report-block-nav.tsx` (1872 linhas) concentra sidebar, tabs mobile, secções
  comerciais e — dentro de `ExploreSection` — TODO o fluxo de período e concorrente.
- Registo de secções: `COMMERCIAL_SECTIONS` em `block-config.ts` (ids
  `overview`, `engagement`, `frequencia`, `publicacoes-chave`, `formatos`,
  `conversas`, `diagnostico-editorial`, `prioridades`) + `access-gating.ts`
  (`free` / `free_email` / `pro`).
- Secção activa: `use-active-block.ts` (IntersectionObserver + recompute).
- CTA Pro: `premium-cta-context.tsx` (`handlePremiumAccessClick`,
  `goToProCheckout`) e `pro-checkout-search.ts`. Preço vem de
  `PUBLIC_PRODUCTS.report_full_9.priceLabel`.
- Saldo: `getMyCreditBalance` (créditos de análise), só carregado quando
  `premiumUnlocked`. É um conceito distinto dos packs de relatório — não serão
  fundidos nem re-etiquetados.

## 2. Acções auditadas e respectivos donos

| Acção | Dono actual | Estado |
|---|---|---|
| Período (30d/90d) | `ExploreSection` → `ConsumeCreditDialog`, `getPeriodCacheState`, `fetchPublicAnalysis`, `proWindow90dEnabled` | reutilizar tal e qual |
| Concorrente | `ExploreSection` → mesmo diálogo, limite `COMPETITOR_MAX`, navegação `?vs=` | reutilizar tal e qual |
| Sem créditos | `onBuyCredits` → `/checkout/credits` com `source: report_no_credits_modal` | reutilizar |
| CTA Pro | `usePremiumCta()` | reutilizar |
| PDF | `actions.onExportPdf` (`pdfBusy`/`pdfDisabled`) | reutilizar |
| Partilhar | `ShareReportPopover` | reutilizar |
| Conta | rota `/app` já existente | link simples |
| Saldo de créditos | `getMyCreditBalance`, só em estado pago | reutilizar |
| Navegação de secções | `COMMERCIAL_SECTIONS` + `resolveSectionAccess` + `useActiveBlock` | reutilizar |
| Voltar ao topo / atalhos | `back-to-top-button.tsx`, `use-report-keyboard-shortcuts.ts` | reutilizar |

Não existe em produção: "Guardar relatório". Não será criado — fica omitido e
registado como elemento da referência HTML sem funcionalidade correspondente.

## 3. Extracção mínima necessária

`ExploreSection` tem a lógica de período/concorrente presa dentro do componente
visual de produção. Vai ser extraída para um hook puro
`use-report-explore-actions.ts` (mesmos handlers, mesmos eventos, mesma ordem),
e a `ExploreSection` de produção passa a consumi-lo sem alterar a sua UI.
Cobertura de regressão acompanha a extracção.

## 4. Chrome Editorial V2 a construir

Novos ficheiros em `src/components/report-editorial-v2/chrome/`:

- `editorial-report-header.tsx` — barra topo desktop: identidade, contexto de
  análise, controlos de período/concorrente (via hook extraído), acções.
- `desktop-section-nav.tsx` — tabs a partir do registo partilhado de secções.
- `editorial-actions-menu.tsx` — menu `…` só com acções reais e válidas.
- `report-progress.tsx` — linha de progresso calculada da geometria de scroll.
- `mobile-report-nav.tsx` — topo sticky, pill da secção actual, tab bar inferior.
- `mobile-section-sheet.tsx` — bottom sheet acessível com ShadCN `Sheet`.
- `chrome-sections.ts` — registo único derivado de `EDITORIAL_V2_DISPLAY_NUMBERS`
  + `COMMERCIAL_SECTIONS` + `resolveSectionAccess`; devolve apenas o conjunto
  realmente navegável para o estado de acesso actual.

Estado activo: um único `useActiveBlock` partilhado por tabs, pill e sheet.

## 5. Regras de dados

Todos os valores vêm do estado real: handle e score do relatório actual, período
da janela real do relatório, preço do catálogo, saldo do servidor. Nenhum número
da referência HTML entra no código. Se um valor real não existir, o elemento é
omitido.

O denominador do pill mobile é derivado do conjunto navegável real, não fixado
em sete.

## 6. Âncoras e parâmetro de desenho

As âncoras Editorial V2 já coincidem com produção, excepto a visão geral
(`visao-geral` em Editorial V2, `overview` em produção). O plano acrescenta um
mapa de compatibilidade para `#overview` continuar a funcionar; nenhuma âncora
pública muda.

`report_design=editorial_v2` é preservado nas navegações internas de
pré-visualização (mudança de período e de concorrente). Não é propagado para
checkout. Na partilha, o `ShareReportPopover` usa hoje `window.location.href`, o
que arrastaria o parâmetro de pré-visualização para um link público — em
Editorial V2 passa-se explicitamente o URL canónico do relatório, sem alterar o
componente de produção.

## 7. `/reports/:snapshotId`

Nesta rota histórica não são mostrados controlos de nova análise (período,
concorrente, refresh). Mantêm-se leitura, navegação, PDF, partilha, conta e CTA
Pro conforme o comportamento actual da rota.

## 8. Testes e QA

- Testes de regressão da extracção da `ExploreSection`.
- Testes de chrome Editorial V2 por estado: anónimo, lead Free, Pro (fixtures),
  sem créditos, snapshot histórico.
- Verificação de que o desenho de produção fica inalterado e de que nenhuma
  secção de laboratório aparece na navegação pública.
- Typecheck e suites de relatório/gating/créditos afectadas.
- QA manual real em `/analyze/<perfil real>?report_design=editorial_v2` e num
  snapshot real, a 1440, 1180, 900 e 375px.
- O bloqueador `Editorial V2 real Pro QA pending` mantém-se aberto; os estados
  Pro só serão cobertos por fixtures, nunca reportados como QA real.

## 9. Fora de âmbito

Metodologia, fontes, rodapé, desenho do PDF, Admin Preview, Report Lab e o
desenho público por omissão não são tocados. Nenhuma lógica de dados,
entitlements, créditos ou pagamentos é alterada.
