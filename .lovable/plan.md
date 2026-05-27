## Auditoria mobile — `/analyze/$username`

Inspecionei o relatório a 390 × 844 (iPhone 12/13). Confirmei que as correções da iteração anterior estão aplicadas (hashtags em 2 linhas, VS em fluxo, tamanhos ≥ 12 px). Identifiquei mais quatro problemas reais em mobile e dois pontos de hardening preventivo.

### Problemas confirmados na auditoria

#### 1. `ReportLockGate` — handle longo estoura a card

`@frederico.m.carvalho` é renderizado dentro de um `<h2>` com `text-[28px]/[32px]`. Como é um único token sem espaços, não quebra e empurra horizontalmente além da card de 358 px (`calc(100% - 32px)`), sobrepondo-se à borda.

Plano:
- Adicionar `break-words` + `[overflow-wrap:anywhere]` no `<h2>` (`report-lock-gate.tsx`, linha 108).
- Reduzir o tamanho mobile do título de `text-[28px]` para `text-[24px]` para handles longos respirarem.
- Adicionar `max-w-full block` ao `<em>` do handle para garantir contenção.

#### 2. Hero — botão "Compare competitor" estoura com badge "COMING SOON · July 2026"

`report-hero-v2.tsx` linha 118 tem `whitespace-nowrap` no botão e empilha `Compare competitor` + badge `COMING SOON · julho 2026`. Em 390 px o conjunto ultrapassa o contentor.

Plano:
- Remover `whitespace-nowrap` do botão.
- Permitir quebra: badge desce para a linha de baixo em mobile (`flex-wrap`), ou ocultar o sufixo "· July 2026" em `< sm` (manter só "COMING SOON" curto).
- Garantir `min-w-0` para o botão e `truncate` no label se necessário.

#### 3. Hashtag — validar o fix em runtime

A correção anterior está no código (2 linhas em mobile). Vou:
- Confirmar visualmente em 390 px após HMR.
- Garantir que `pl-12` em row-2 alinha com o rank pill (w-9 = 36 px + gap-3 = 12 px → `pl-12` = 48 px é exato ✓).
- Se a barra ficar mal alinhada, ajustar para `pl-[3rem]`.

#### 4. KPI vertical na overview — KPIs `LIKES · AVG`, `COMMENTS · AVG`, `RHYTHM · WEEK` empilhados ocupam altura excessiva

Em 390 px, os 3 KPIs ficam um por linha (correto), mas cada um tem `p-5+` e o conjunto ocupa quase um viewport inteiro. Sugiro grelha 2 colunas em mobile (`grid-cols-2`) para likes/comments e `RHYTHM` em linha cheia abaixo, ou manter 1 coluna mas reduzir padding vertical (`py-3`).

Decisão recomendada: manter 1 coluna (legibilidade) mas reduzir `py` para `py-3.5` no `KpiCard` interno do `report-kpi-grid-v2.tsx`. Necessário ler o ficheiro para confirmar shape exato antes de mexer.

### Hardening preventivo (sem alterar comportamento visual)

#### 5. Shell — garantir `overflow-x-clip` no contentor principal

`report-shell-v2.tsx` já tem `overflow-x-clip` no min-h-screen wrapper. Adicionar também no `<main>` interno para travar qualquer descendente que escape (defesa em profundidade).

#### 6. Auditoria sistemática de tokens em modo mobile

Fazer `rg "text-\[1[01]px\]|text-\[9px\]|min-w-\[(?:12|14|16|18|20)0px\]"` para confirmar que não ficaram resquícios > 350 px ou texto < 12 px em zonas de leitura. Resolver tudo o que aparecer (já cobri 10 ficheiros; pode haver mais em componentes raramente vistos).

### Ficheiros a editar

```
src/components/product/report-lock-gate.tsx      # break-words + size mobile
src/components/report-redesign/v2/report-hero-v2.tsx  # Compare button wrap
src/components/report-redesign/v2/report-kpi-grid-v2.tsx  # padding reduzido
src/components/report-redesign/v2/report-shell-v2.tsx     # overflow-x-clip extra
```

E quaisquer ficheiros adicionais que apareçam no varrimento do ponto 6.

### Fora de scope (não toco)

- Conteúdo gated/paywall — só ajustes visuais; sem lógica.
- Backend, traduções, tracking.
- Ficheiros em `LOCKED_FILES.md`.

### Validação

- Screenshots em 390 × 844 antes e depois de cada bloco.
- Testar também 360 × 800 (Android pequeno) e 414 × 896 (iPhone Plus).
- Confirmar zero scroll horizontal (`document.body.scrollWidth === window.innerWidth`).
- `bunx tsc --noEmit`.

### Checkpoint

- [ ] Handle longo no `ReportLockGate` quebra corretamente.
- [ ] Botão "Compare competitor" cabe em 360 px sem overflow.
- [ ] Hashtags renderizam em 2 linhas em mobile com barra alinhada.
- [ ] KPIs verticais respiram menos.
- [ ] Shell sem scroll horizontal em qualquer breakpoint < 640 px.
- [ ] Varrimento de tokens < 12 px concluído, sem regressões.
