# Project Memory

## Core
Instagram Benchmark Analyzer. Dark-first, with Iconosquare-pure light theme for /report.
Surface-base #0A0E1A (dark) · #FAFBFD (light report).
Fraunces display (H1 report only), Inter sans, JetBrains Mono mono. Cyan accent #06B6D4 (dark) · #2563D9 (light).
Design tokens in src/styles/tokens.css and src/styles/tokens-light.css — never hardcode colors/fonts in components.
LOCKED_FILES.md tracks protected foundation files.
Benchmark sources (Socialinsider, Buffer, Hootsuite, Databox) nomeáveis sem link; nunca afirmar que analisaram o perfil; nunca inventar reach/saves/growth.

## Memories
- [Design tokens](mem://design/tokens) — Full token system: surfaces, accents, signals, typography, spacing, shadows, transitions
- [Report light tokens](mem://design/report-light-tokens) — Iconosquare-pure: surfaces, single blue accent, insight box variants, chart series, unified white-card style
- [Locked files](mem://constraints/locked-files) — Foundation files that must not be modified without permission
- [Cost source of truth](mem://features/cost-source-of-truth) — provider_call_logs é fonte única; cost_daily só reconciliação Apify e saldo DFS
- [Benchmark source policy](mem://features/benchmark-policy) — Fontes editoriais aprovadas, uso por bloco, regras anti-invenção, etiquetagem perfil/referência/interpretação. Canónico em KNOWLEDGE.md.
