# LOCKED FILES — DO NOT MODIFY WITHOUT EXPLICIT PERMISSION

> **Design Pivot (May 2026):** The project has moved from dark Tech Noir to
> a light-first Iconosquare-inspired analytics SaaS style. Token files and
> landing components were unlocked for this pivot and re-locked after.

> **Note:** This project uses Tailwind CSS v4 with native `@theme inline`
> configuration in `src/styles.css`. There is no `tailwind.config.ts`.

These files are foundational and must not be changed unless the user
explicitly asks for a modification in a new prompt.

## Design Foundation (locked since Sprint 0, Prompt 1)
- /src/styles/tokens.css (light-first palette since design pivot)
- /src/styles.css (the @theme inline configuration section — light-first)
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

> **Edição autorizada (2026-05-24):** `header.tsx` foi atualizado para
> integrar i18n (PT/EN), seletor de idioma e link de login/conta. Continua
> locked para futuras alterações.

> **Edição autorizada (2026-06-02, Option B2):** `app-shell.tsx` e
> `header.tsx` ganharam branch route-aware para `/` (homepage dark
> coerente). Novo `src/components/layout/dark-footer.tsx` para o footer
> dark da homepage. Restantes rotas (`/analyze`, `/app`, `/admin`,
> account, report) ficam intactas. Continuam locked para futuras
> alterações.

## Landing Components (locked since Sprint 1, Prompt 1.1)
- /src/components/landing/hero-section.tsx
- /src/components/landing/hero-aurora-background.tsx
- /src/components/landing/hero-action-bar.tsx

> **Edição autorizada (2026-06-02):** Redesign do hero — layout split,
> ilha dark scoped (`.hero-dark`), nova preview do relatório à direita.
> Ficheiros tocados: `hero-section.tsx`, `hero-aurora-background.tsx`,
> `hero-action-bar.tsx`, novo `hero-report-preview.tsx`, novo
> `src/styles/hero-dark.css`. Continuam locked para futuras alterações.

> **Reforço de lock (2026-06-02):** A homepage `/` é **dark** ("Editorial
> Tech Noir") — não converter para light. A caixa do `@` em
> `hero-action-bar.tsx` é **branca** com ícone e texto navy; a trust list
> mostra **apenas** "Oferta de 2 relatórios grátis" (a key
> `actionBar.trustInline.publicData` foi removida intencionalmente). Não
> reverter sem confirmação explícita. Ficheiros adicionalmente locked:
> `src/components/landing/hero-report-preview.tsx`, `src/styles/hero-dark.css`.

## Landing Components (Sprint 1, Prompt 1.2)
- /src/components/landing/use-in-view.ts

> **Edição autorizada (2026-06-02):** Homepage `/` passou a renderizar
> apenas `<HeroSection />` + `<LandingDarkIsland />` (novo, em
> `src/components/landing/dark/`). Os antigos `social-proof-section.tsx`,
> `how-it-works-section.tsx`, `how-it-works-step.tsx` e
> `product-preview-section.tsx` deixaram de ser usados em `/` mas continuam
> presentes no codebase (ainda não removidos). A nova ilha dark é a
> referência canónica pós-hero.

## Landing Components (Sprint 1, Prompt 1.3)
- /src/components/landing/mockup-metric-card.tsx
- /src/components/landing/mockup-benchmark-gauge.tsx
- /src/components/landing/mockup-dashboard.tsx

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

## Report Redesign — stable foundation (re-locked after R1/R2/R3)
> These are the canonical chrome of the new report shell. They survived the
> R1/R2/R3 redesign and the prompts 15–19 audit unchanged. Treat as locked.
> `report-editorial-patterns.tsx` is intentionally NOT locked yet — it is
> still recent and may need one more iteration after QA.
- /src/components/report-redesign/report-shell.tsx
- /src/components/report-redesign/report-hero.tsx
- /src/components/report-redesign/report-kpi-grid.tsx
- /src/components/report-redesign/report-framed-block.tsx
- /src/components/report-redesign/report-section-frame.tsx
- /src/components/report-redesign/report-ai-reading.tsx
- /src/components/report-redesign/report-methodology.tsx

## Knowledge Base Policy (Sprint Knowledge, R-policy)
- /KNOWLEDGE.md

## Report Variant System (MVP variant architecture)
- /src/lib/report/report-variant.ts

## Public MVP Lock (pre-beta freeze)
> These files control what the public sees at `/analyze/$username`.
> Do not modify without explicit permission.
- /src/lib/report/report-variant.ts (also listed above)
- /src/lib/report/effective-features.ts
- /src/routes/analyze.$username.tsx (variant="public_mvp" hardcoded)
- /src/server/admin/variant-overrides.functions.ts

When working on future features, always:
1. Read this file first
2. Use design tokens from tokens.css — never hardcode colors, fonts,
   spacing, or radii
3. If you believe a locked file needs modification, STOP and ask for
   explicit permission before editing
