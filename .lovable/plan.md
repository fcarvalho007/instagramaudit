## Problema observado

Em `/analyze/$username` o relatório público (`variant="public_mvp"`, `lockBoundary="engagement"`, `premiumUnlocked=false`) está a:

1. Renderizar o **Bloco 1 · Visão geral duas vezes**: uma vez "limpo" no topo e outra vez dentro do `ReportLockGate` (em `mode="locked"`, desfocado).
2. Renderizar o **Bloco 2 · Diagnóstico editorial** (e ainda os blocos 3–6) dentro do `ReportLockGate` como conteúdo desfocado — quando a decisão de produto é não dar acesso visual ao Bloco 2 no relatório gratuito.
3. **Esconder o feedback do Bloco 1** (os emojis) sempre que `gated = true` — ou seja, sempre no fluxo público actual.

A sidebar e as tabs já estão corretas: marcam só o "Overview" como acessível ("1 de 6") e os outros 5 como `locked` / premium. O bug está apenas no corpo do relatório em `report-shell-v2.tsx`.

## Correção

Ficheiro único: `src/components/report-redesign/v2/report-shell-v2.tsx`.

1. **Remover a duplicação do Bloco 1**: eliminar o `ReportOverviewBlock` em `mode="locked"` que está dentro do ramo `gated ? (...)`. O Bloco 1 já é renderizado uma única vez acima, com `mode="free"` quando `lockBoundary === "engagement" && !unlocked` e completo caso contrário.

2. **Remover Diagnóstico Editorial (e restantes blocos premium) do render gratuito**: dentro do `gated ? (...)`, deixar de envolver `ReportDiagnosticBlock`, `ReportTemporalChart`/heatmap (Performance), Conteúdo, Procura e Benchmark no `ReportLockGate`. No fluxo público, esses blocos não devem aparecer no corpo — nem desfocados. A presença deles passa a ser comunicada apenas pela sidebar/tabs ("5 por desbloquear") e pelo `ReportEndOfFreeBlock` no fim.

3. **Repor o pedido de avaliação no fim do Bloco 1**: alterar a condição actual `features.blockOverview !== "hidden" && !gated` para `features.blockOverview !== "hidden"`. Assim o `BlockFeedback` (emojis) volta a aparecer no fim do Bloco 1 também no fluxo público gratuito.

4. **Substituir o gate por uma única chamada ao Lead Magnet** mantendo o ancorador `#lead-magnet-card`: onde antes existia o `ReportLockGate` com 5 blocos por baixo, passa a existir uma simples `<section id="lead-magnet-card">` com o `ReportEndOfFreeBlock` (já existente) — que mostra "Fim da leitura pública / Há mais por trás deste perfil" e o CTA Premium. Antes da captura de lead, o CTA mantém o copy actual; após `unlocked=true`, evolui para "Desbloquear relatório completo" (i18n já previsto no plano anterior, mantém-se inalterado se já existir; caso contrário fica para outra iteração — não bloqueia esta correção).

5. **Não tocar** em:
   - `block-config.ts`, `report-block-nav.tsx` (sidebar e tabs já estão corretas)
   - `report-overview-block.tsx`, `report-diagnostic-block.tsx`
   - `report-lock-gate.tsx`, `report-end-of-free-block.tsx`
   - Variantes não-public (`internal_lab`, `pro_preview`) — só o ramo `gated` é alterado
   - Backend, providers, scoring, pricing, emails, lead-magnet steps

## Resultado esperado

Fluxo público (`/analyze/$username`):

```
Hero
└─ Bloco 1 · Visão geral (única vez, completo)
   └─ Feedback (emojis)
   └─ Fim da leitura pública (#lead-magnet-card → CTA)
Methodology
```

Sidebar: "1 de 6 secções acessíveis", 5 marcadas como "Premium · por desbloquear".

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (se existirem testes a tocar em `report-shell-v2`)
- Inspecionar `/analyze/frederico.m.carvalho` no preview: confirmar que o Bloco 1 aparece **uma só vez**, que os emojis aparecem no fim do Bloco 1, e que não existe Bloco 2 desfocado no DOM.

## Checkpoint

- ☐ Bloco 1 renderizado uma única vez
- ☐ Bloco 2 (Diagnóstico Editorial) ausente do corpo no fluxo público
- ☐ Pedido de avaliação (emojis) visível no fim do Bloco 1
- ☐ Sidebar mantém "1 de 6 secções acessíveis"
- ☐ CTA Lead Magnet continua acessível via `#lead-magnet-card`
- ☐ `tsc --noEmit` verde
