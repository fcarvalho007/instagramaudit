## Objetivo
Substituir o topo de `/analyze/$username` por uma única barra horizontal compacta (igual ao mockup), removendo o card "+ Novo" e o card separado de PERÍODO.

## Ficheiros a alterar
Nenhum está em `LOCKED_FILES.md`.

1. **`src/components/report-redesign/v2/report-hero-v2.tsx`**
   - Eliminar o painel expansível (estado `expanded`, ChevronDown, `ExpandedAvatar`, `ExpandedMetricLine`, `MobileMicroMetric`).
   - Renderizar uma única linha compacta: avatar pequeno (size-9/10) com badge de verificado, `@handle`, tier badge (`Micro · 10K–50K`), métricas em linha (`10,1K seg · 2,6K pub · 12 analisadas`).
   - Em mobile, métricas continuam visíveis (sem chevron); chips do período empilham por baixo (no shell).
   - **Remover o botão `+ Novo`** (apagar o `<Link to="/">` e o import de `Plus`/`Link`).
   - Manter apenas botões icon-only de PDF e Share, com a mesma lógica/handlers atuais.

2. **`src/components/report-redesign/v2/analysis-period-selector.tsx`**
   - Simplificar para variante inline: remover o card wrapper (`rounded-2xl border bg-white shadow-card`), remover o trigger mobile com Calendar/Chevron, remover o footnote longo.
   - Renderizar apenas: eyebrow `PERÍODO` + badge "Amostra grátis · N dias" + chips (chip ativo `12 pub.` + chips locked `30d/60d/90d/365d`).
   - Manter intacta a lógica de Popover premium, `handlePremiumAccessClick`, `trackPremiumWindowInterest` e labels i18n.
   - Em mobile, chips com scroll horizontal (já existente).

3. **`src/components/report-redesign/v2/report-shell-v2.tsx`**
   - Wrapper único `rounded-2xl border bg-white shadow-card` envolvendo numa flex-row: `<ReportHeroV2>` à esquerda + divider vertical + `<AnalysisPeriodSelector>` à direita (desktop). Em mobile, empilha em 2 linhas.
   - Reduzir padding vertical do bloco do hero (`pt-2 pb-2 sm:pt-3 sm:pb-3`) e do `pt-5 lg:pt-6` do main para `pt-3 lg:pt-4`, para a secção "Índice do perfil" subir.

## Fora de âmbito
Dados do report, scoring, lógica de período, premium gating, créditos, onboarding, providers, PDF, share, rotas, backend, pricing, `/report/example`.

## Validação
- `bunx tsc --noEmit`
- Visual desktop 1440×900 e mobile 390×844.
- Confirmar: sem hero grande, sem card de período separado, sem botão `+ Novo`, PDF/Share funcionam, chips locked abrem popover premium, "Índice do perfil" mais acima.
