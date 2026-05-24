## Estado atual dos lotes i18n

Já feito:
- Infra (Lote A): `i18n/index.ts`, `formatCompactNumber`, `formatLocaleDate`, `LanguageSwitcher`, hidratação síncrona.
- Lote B (Landing): hero, action bar, mockups, how-it-works, social proof, scroll indicator.
- Lote C (Auth): login, signup, reset.
- Lote D (Analyze + Gateways): `analyze.json`, `gate.json`, `errors.json`, `analysis-skeleton`, `analysis-error-state`, `report-lock-gate`, `unlock-modal`.
- Lote E parcial (Report Shell + Bloco 1): `report-hero-v2`, `report-block-nav`, `report-block-section`, `report-shell-v2`, `report-kpi-grid-v2`, `block-config`, `editorial-identity-card`, `frequency-card`, `format-card`.
- App shell: `header`, `footer`, `language-switcher`.

Por concluir (Lotes F + G):

### Lote F — Componentes de overview e diagnóstico ainda em PT hardcoded

Migrar para `useTranslation("report")` e adicionar chaves nos JSON:
- `report-overview-block.tsx`, `report-overview-cards.tsx`, `report-overview-engagement.tsx`, `report-overview-attention-row.tsx`
- `report-diagnostic-block.tsx`, `report-diagnostic-card.tsx`, `report-diagnostic-cta.tsx`, `report-diagnostic-grid-v2.tsx`, `report-diagnostic-group.tsx`, `report-diagnostic-priorities.tsx`, `report-diagnostic-summary-cards.tsx`, `report-diagnostic-verdict.tsx`
- `report-positioning-banner.tsx`, `report-benchmark-evidence.tsx`, `report-engagement-benchmark-chart.tsx`
- `insight-callout.tsx`, `premium-callout.tsx`, `premium-interest-dialog.tsx`
- `cache-status-badge.tsx`, `source-badge.tsx`, `report-source-label.tsx`
- `overview/diagnostic-summary.tsx`, `overview/score-card.tsx`, `overview/score-grid.tsx`, `overview/competitor-modal.tsx`, `overview/comparison-header.tsx`, `overview/insight-callout.tsx`

### Lote G — Análise enriquecida e secções premium (visíveis em variantes não public_mvp)

- `report-themes-feature.tsx`, `report-comment-intelligence.tsx`, `report-post-comparison.tsx`
- `caption-diagnostics-card.tsx`, `hashtag-diagnostics-card.tsx`, `visual-cover-analysis-card.tsx`
- Componentes auxiliares em `src/components/report/*` (top-links, format-breakdown, hashtags-keywords, market-signals, competitors, benchmark-gauge, temporal-chart, audience-response) — adicionar chaves apenas para strings visíveis ao público.

### Política
- Sem alterar lógica de negócio nem dados; só copy.
- Reutilizar namespaces existentes (`report`, `common`, `errors`); só criar nova chave se necessário.
- Manter PT-PT como default; EN como espelho.
- Verificar JSON válido em cada commit (script `python3 -c "import json; json.load(...)"`).
- Substituir números/datas hardcoded por `formatCompactNumber`/`formatLocaleDate` quando aparecerem em copy.

### Entregáveis
- PR único por lote (F, depois G) com diff focado em texto + hook.
- Smoke test manual: alternar EN ↔ PT no preview do relatório e confirmar que não restam frases em PT no modo EN.
