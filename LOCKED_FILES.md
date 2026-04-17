# LOCKED FILES — DO NOT MODIFY WITHOUT EXPLICIT PERMISSION

> **Note:** This project uses Tailwind CSS v4 with native `@theme inline`
> configuration in `src/styles.css`. There is no `tailwind.config.ts`.

These files are foundational and must not be changed unless the user
explicitly asks for a modification in a new prompt.

## Design Foundation (locked since Sprint 0, Prompt 1)
- /src/styles/tokens.css
- /src/styles.css (the @theme inline configuration section)
- /src/routes/__root.tsx (meta tags and base layout)
- /LOCKED_FILES.md itself

## Atomic Components (locked since Sprint 0, Prompt 2a)
- /src/components/ui/button.tsx
- /src/components/ui/badge.tsx

## Container & Input Components (locked since Sprint 0, Prompt 2b)
- /src/components/ui/card.tsx
- /src/components/ui/input.tsx
- /src/components/ui/switch.tsx

## Application Shell (locked since Sprint 0, Prompt 3)
- /src/components/layout/container.tsx
- /src/components/layout/header.tsx
- /src/components/layout/footer.tsx
- /src/components/layout/app-shell.tsx
- /src/components/layout/brand-mark.tsx

## Landing Components (locked since Sprint 1, Prompt 1.1)
- /src/components/landing/hero-section.tsx
- /src/components/landing/hero-aurora-background.tsx
- /src/components/landing/hero-action-bar.tsx

## Landing Components (Sprint 1, Prompt 1.2)
- /src/components/landing/use-in-view.ts
- /src/components/landing/social-proof-section.tsx
- /src/components/landing/how-it-works-step.tsx
- /src/components/landing/how-it-works-section.tsx

## Landing Components (Sprint 1, Prompt 1.3)
- /src/components/landing/mockup-metric-card.tsx
- /src/components/landing/mockup-benchmark-gauge.tsx
- /src/components/landing/mockup-dashboard.tsx
- /src/components/landing/product-preview-section.tsx

## Landing Micro-components (Sprint 1, Prompt 1.1B)
- /src/components/landing/blur-reveal-text.tsx
- /src/components/landing/animated-counter.tsx
- /src/components/landing/handwritten-note.tsx
- /src/components/landing/scroll-indicator.tsx

## Landing Micro-components (Sprint 1, Prompt 1.1C)
- /src/components/landing/instagram-glyph.tsx

## Legal / Compliance (Sprint 1, Legal MVP)
- /src/components/legal/legal-layout.tsx
- /src/routes/privacidade.tsx
- /src/routes/termos.tsx

## Report Components (Sprint 1, Prompt 1.10)
- /src/styles/tokens-light.css
- /src/components/report/report-theme-wrapper.tsx
- /src/components/report/report-mock-data.ts
- /src/components/report/report-page.tsx
- /src/components/report/report-section.tsx
- /src/components/report/report-header.tsx
- /src/components/report/report-kpi-card.tsx
- /src/components/report/report-key-metrics.tsx
- /src/components/report/report-temporal-chart.tsx
- /src/components/report/report-chart-tooltip.tsx
- /src/components/report/report-benchmark-gauge.tsx
- /src/components/report/report-format-breakdown.tsx
- /src/components/report/report-competitors.tsx
- /src/components/report/report-top-posts.tsx
- /src/components/report/report-posting-heatmap.tsx
- /src/components/report/report-best-days.tsx
- /src/components/report/report-hashtags-keywords.tsx
- /src/components/report/report-ai-insights.tsx
- /src/components/report/report-footer.tsx
- /src/routes/report.example.tsx

When working on future features, always:
1. Read this file first
2. Use design tokens from tokens.css — never hardcode colors, fonts,
   spacing, or radii
3. If you believe a locked file needs modification, STOP and ask for
   explicit permission before editing
