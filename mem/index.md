# Project Memory

## Core
Instagram Benchmark Analyzer. Dark-first, with Iconosquare-pure light theme for /report.
Surface 4-tier dark: base #0A0E1A → secondary #141C2E → elevated #243044 → overlay #2A3850. Light report: #FAFBFD.
Todo card elevado deve ter border border-border-subtle (hairline 0.10 alpha).
Fraunces display (H1 report only), Inter sans, JetBrains Mono mono. Cyan accent #06B6D4 (dark) · #2563D9 (light).
2-font rule: Fraunces + Inter; JetBrains Mono SÓ para números crus. Eyebrows/labels/badges = .text-eyebrow / .text-eyebrow-sm (Inter uppercase), nunca font-mono.
Paleta: gold é ilha — nunca coexiste com cyan no mesmo card. CTA dentro de card gold usa Button variant="premium".
Design tokens in src/styles/tokens.css and src/styles/tokens-light.css — never hardcode colors/fonts in components.
Admin typography scale: min 12px interactive, 11px only eyebrows/badges. Classes in admin-tokens.css.
LOCKED_FILES.md tracks protected foundation files.

## Memories
- [Design tokens](mem://design/tokens) — Full token system: surfaces, accents, signals, typography, spacing, shadows, transitions
- [Report light tokens](mem://design/report-light-tokens) — Iconosquare-pure: surfaces, single blue accent, insight box variants, chart series, unified white-card style
- [Admin typography](mem://design/admin-typography) — Admin cockpit typography scale, density rules, utility classes
- [Locked files](mem://constraints/locked-files) — Foundation files that must not be modified without permission
- [Cost source of truth](mem://features/cost-source-of-truth) — provider_call_logs é fonte única; cost_daily só reconciliação Apify e saldo DFS
- [Free↔Pro card mirror](mem://features/free-pro-card-mirror) — teasers bloqueados espelham títulos/sub-blocos dos cards pagos; sidebar alinhada
- [Hero homepage rules](mem://design/hero-homepage) — Homepage `/` hero é dark; caixa do @ é branca com texto navy; trust list só mostra "freeReports"
