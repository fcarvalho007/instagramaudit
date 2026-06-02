# Auditoria — header / ações em `/analyze/$username`

Sem alterações de código. Inspeção apenas.

## 1. Quem renderiza a nav institucional ("Analisar / Como funciona / Exemplos / Preços")

- **Componente**: `Header` em `src/components/layout/header.tsx`
  - `navItems` definido em **linhas 39–44**:
    - `nav.analyze` → `/`
    - `nav.how_it_works` → `/#como-funciona`
    - `nav.examples` → `/#exemplos`
    - `nav.pricing` → `/precos`
  - Renderiza a pill `<nav aria-label={t("aria.primary_nav")}>` (linhas **70–90**) no desktop e a versão mobile no drawer (linhas **172–187**).
- **Labels i18n**: `src/i18n/locales/pt/header.json` (e `en/header.json`).

## 2. O header é partilhado globalmente?

Sim. `Header` é renderizado por `AppShell` (`src/components/layout/app-shell.tsx:26`), que envolve **todas as rotas públicas** via `src/routes/__root.tsx` (`shellComponent`/`component`). A única exceção atual é qualquer rota cujo pathname comece por `/admin` (`PUBLIC_CHROME_DISABLED_PREFIXES`, app-shell linha 11).

Logo, `Header` é o mesmo na landing (`/`) e em `/analyze/$username`.

## 3. `/analyze` pode ter comportamento próprio sem afetar a landing?

Sim, e o mecanismo **já existe**:

- `src/routes/analyze.$username.tsx` põe `document.body.setAttribute("data-report-view", "true")` (linhas **81** e **188–190**, com cleanup).
- `src/components/report-redesign/v2/report-shell-v2.tsx` (linhas **185–217**) liga um scroll listener que adiciona/remove `data-report-scrolled="true"` no `<body>` e atualiza um estado React `scrolled`.
- `src/styles/analyze-header-collapse.css` (importado em `analyze.$username.tsx:8`) contém a regra:
  ```css
  body[data-report-view="true"][data-report-scrolled="true"]
    header nav[aria-label] { display: none; }
  ```
  → esconde a pill institucional só em `/analyze` quando há scroll, **sem tocar no `Header`**.

A landing nunca recebe `data-report-view`, portanto fica intocada.

## 4. Onde estão PDF / Partilhar

Dois pontos, ambos consumindo `useReportShareActions` (`src/components/report-share/use-report-share-actions.ts`) via `actions: ReportPageActions` em `/analyze/$username.tsx`:

- **Hero topbar (sempre visível)** — `src/components/report-redesign/v2/report-hero-v2.tsx`, linhas **85–125**:
  - botão PDF (`actions.onExportPdf`, `pdfBusy`/`pdfDisabled`)
  - `ShareReportPopover` com `customTrigger` (botão Share icon-only)
- **Utility bar (sticky, aparece em scroll)** — `src/components/report-redesign/v2/report-utility-bar.tsx`, montada em `report-shell-v2.tsx:271–275` com `visible={scrolled}`. Mesma assinatura: PDF, Share via `customTrigger`, e "Adicionar concorrente".
- Existe ainda um terceiro consumidor independente: `src/components/report-share/report-final-block.tsx` (botão PDF + Share no fim do relatório).

## 5. De onde vem o "botão em branco" junto a PDF/Share

Inspecionando o hero v2 (linhas 84–125) e a utility bar (linhas 49–110), só existem 3 elementos `<button>`: **PDF**, **Share trigger** e **Adicionar concorrente** (este só na utility bar). Não há um quarto botão vazio no código atual.

Hipóteses prováveis para o "blank button" observado em runtime:

1. **Share trigger sem ícone**: se o `ShareReportPopover` `customTrigger` falhasse a propagar children (não falha — usa `asChild` correto agora), apareceria um quadrado vazio. Ver `share-popover.tsx` (`customTrigger` é passado a `Popover.Trigger asChild`).
2. **`actions.pdfDisabled === true` + ícone em estado `disabled opacity-50`** dá a sensação de "botão apagado/blank" mas é o PDF desativado (sem snapshot).
3. **CSS herdado** que esconde o ícone — improvável dado `aria-label` e `size-3.5` explícitos.
4. **Botão duplicado em mobile**: quando `width >= sm` o label "Partilhar"/"PDF" aparece, abaixo só o ícone — se o ícone falhasse a carregar (lucide tree-shake), veria-se um quadrado em branco.

Recomendação para o diagnóstico definitivo: inspecionar o DOM do elemento em runtime para identificar a classe/aria-label e confirmar qual dos três botões acima é. Sem reprodução visível no código fonte, não há um quarto botão fantasma a remover.

## 6. "Adicionar concorrente" já existe?

Sim, em **dois locais**, ambos como atalho de navegação (scroll para o bloco `benchmark`), **não** como ação que adiciona dados:

- `src/components/report-redesign/v2/report-utility-bar.tsx:52–63` — botão com `UserPlus` + label `t("hero.actions.add_competitor")`, `onClick={() => scrollToBlock("benchmark")}`.
- `src/components/report-enriched/report-enriched-competitors-cta.tsx` — CTA dentro do próprio bloco de competidores (copy em `report-enriched-copy.ts`).

i18n keys já presentes em `pt/report.json` e `en/report.json`: `hero.tier_label_prefix`, `hero.actions.add_competitor`, `hero.actions.pdf`, `hero.actions.share`.

## Conclusões

- **Header é global** (via `AppShell` em `__root.tsx`); não deve ser alterado para servir `/analyze`.
- **Comportamento route-specific já está implementado** sem tocar no `Header`, via dois atributos no `<body>` + um CSS sidecar (`src/styles/analyze-header-collapse.css`).
  - `data-report-view` → set em `analyze.$username.tsx`.
  - `data-report-scrolled` → toggled pelo `report-shell-v2.tsx`.
- **Utility bar sticky** com PDF / Partilhar / Adicionar concorrente já existe (`report-utility-bar.tsx`) e fade-in no scroll.

## Caminho mais seguro de implementação futura

1. **Manter** o padrão atual (atributos no `<body>` + CSS sidecar). Não editar `Header` nem `styles.css` (locked).
2. Qualquer nova divergência de chrome para `/analyze` deve usar o seletor `body[data-report-view="true"] …`, mantendo o `Header` neutro.
3. O scroll listener pertence ao **`report-shell-v2.tsx`** (não ao `Header`): o shell é o único componente que sabe que está num contexto de relatório e já tem o estado `scrolled` partilhado com a utility bar.
4. Para investigar o "blank button", reproduzir em preview e inspecionar o DOM (provavelmente é o Share trigger em estado disabled ou o PDF com `pdfDisabled=true`); só depois decidir se há código a tocar.

## Resposta direta às perguntas

- **Header partilhado globalmente?** Sim, via `AppShell` em `__root.tsx`. Exceção: `/admin/*`.
- **Caminho mais seguro?** Continuar com `data-report-view` + `data-report-scrolled` + CSS sidecar. Não tocar em `Header` nem em `styles.css`.
- **Scroll deve viver no header ou em `/analyze`?** Em `/analyze` (já vive em `report-shell-v2.tsx`). O `Header` deve permanecer agnóstico à rota.
- **Sem alterações de código realizadas.**
