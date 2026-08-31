# Report UX — ordem recomendada de intervenção (pós-inventário 6A.1)

Baseado no inventário read-only da Ronda 6A.1. Nada foi alterado. Este plano define apenas
a ordem de trabalho futura e as regras de preservação, para aprovação antes da Ronda 6B.

## Regras de preservação (válidas para todas as rondas seguintes)

- P0 (congelar conteúdo/cálculo): `report-block-nav.tsx`, `report-diagnostic-block.tsx`,
  `report-diagnostic-card.tsx`, `editorial-identity-card.tsx`, `report-post-comparison.tsx`,
  `report-comment-intelligence.tsx`, `caption-diagnostics-card.tsx`, `report-market-signals.tsx`.
  Só reposicionamento, container e spacing externo.
- P1 (ajuste leve): overview cards (`frequency-card`, `format-card`, `score-*`,
  `methodology-line`, `report-overview-cards`, `report-engagement-benchmark-chart`,
  `leitura-ia-box`, `report-kpi-grid-v2`).
- P2 (recomposição de apresentação/posição): `report-shell-v2.tsx`, `report-overview-block.tsx`,
  `report-hero-v2.tsx`, blocos 03–06 inline no shell.
- P3 (embalagem comercial, redesenhável): `premium-teaser-card`, `end-of-free-block`,
  `sticky-unlock-bar`, `sticky-free-cta-bar`, `deepen-analysis-cta`, `instant-audit-bar`,
  `premium-callout`, `premium-interest-dialog`, `report-final-block`, `end-feedback-strip`.
- LEGACY (não tocar, não apagar): `src/components/report/**`, `report-redesign/*.tsx` raiz,
  `report-page.tsx`, `report-end-cta.tsx`, `unlock-modal.tsx`, `report-lock-gate.tsx`.
- LAB (fora do redesign comercial): `admin-report-lab.*`, `admin_.report-preview.*`,
  variantes `internal_lab` / `pro_preview`.
- Toda a alteração deve ficar na camada de apresentação. Fórmulas, classifiers, benchmarks,
  amostras, normalização e prompts de IA ficam intactos.

## Ordem de intervenção proposta

1. **6B.0 — Rede de segurança (antes de qualquer pixel)**
   Testes de composição para os quatro P0 sem teste dedicado (block-nav, diagnostic-block,
   diagnostic-card, editorial-identity-card): renderização por estado A/B/C e presença dos
   blocos esperados. Objetivo: detetar regressão visual/estrutural durante o redesign.

2. **6B.1 — Sistema de enquadramento**
   Normalizar apenas containers, ritmo vertical, largura de coluna e cabeçalhos de secção
   (`report-block-section`, `report-card-section-header`, tokens). Zero alterações internas
   nos cards. Esta é a intervenção com maior ganho visual e menor risco.

3. **6B.2 — Hero + primeiro viewport**
   `report-hero-v2` e topo do Overview: hierarquia executiva em 10 segundos
   (identidade, índice, veredicto, uma métrica-âncora). Sem novos indicadores.

4. **6B.3 — Navegação**
   Sidebar desktop e tabs mobile: reduzir ruído de badges, tornar o estado A/B/C legível
   à primeira. Alterações confinadas às camadas de apresentação de `report-block-nav`.

5. **6B.4 — Embalagem comercial (P3)**
   Redesenho livre dos teasers, sticky bars e blocos de fim de gratuito, mantendo um único
   CTA por estado e o mesmo motor (`ConversionSheet` em A, `PremiumCtaProvider` em B).

6. **6B.5 — Consolidação de duplicações**
   Fonte única para metodologia e para limpeza de texto IA; unificar cartões de score/KPI
   no par `score-card`/`report-kpi-grid-v2`. Sem apagar legado, apenas deixar de o usar
   no percurso principal.

7. **6C — Mobile e QA final**
   375/390 px, sticky que não tapa conteúdo, mudança de estado após email, e comparação
   contra os screenshots baseline capturados nesta ronda.

## Pendências identificadas no inventário (não corrigidas)

- Mistura de idiomas no relatório com locale EN (títulos EN + corpo PT) — corrigir numa
  ronda de copy, não no redesign.
- Screenshots baseline B e C não foram capturados sem tocar em estado; existe baseline A
  (desktop e mobile) via `/reports/$snapshotId`. Capturar B/C exigirá sessão de lead e
  entitlement num ambiente de teste.
