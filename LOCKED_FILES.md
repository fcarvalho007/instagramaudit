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

When working on future features, always:
1. Read this file first
2. Use design tokens from tokens.css — never hardcode colors, fonts,
   spacing, or radii
3. If you believe a locked file needs modification, STOP and ask for
   explicit permission before editing
