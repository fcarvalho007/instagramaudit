---
name: Locked files
description: Foundation files that must not be modified without explicit user permission
type: constraint
---
Project uses Tailwind CSS v4 with native @theme inline (no tailwind.config.ts).

Locked files:
- /src/styles/tokens.css
- /src/styles.css (the @theme inline configuration section)
- /src/routes/__root.tsx (meta tags and base layout)
- /LOCKED_FILES.md itself
- /src/components/ui/button.tsx (since Sprint 0, Prompt 2a)
- /src/components/ui/badge.tsx (since Sprint 0, Prompt 2a)
- /src/components/ui/card.tsx (since Sprint 0, Prompt 2b)
- /src/components/ui/input.tsx (since Sprint 0, Prompt 2b)
- /src/components/ui/switch.tsx (since Sprint 0, Prompt 2b)
- /src/components/layout/container.tsx (since Sprint 0, Prompt 3)
- /src/components/layout/header.tsx (since Sprint 0, Prompt 3)
- /src/components/layout/footer.tsx (since Sprint 0, Prompt 3)
- /src/components/layout/app-shell.tsx (since Sprint 0, Prompt 3)
- /src/components/layout/brand-mark.tsx (since Sprint 0, Prompt 3)
- /src/components/landing/hero-section.tsx (since Sprint 1, Prompt 1.1)
- /src/components/landing/hero-aurora-background.tsx (since Sprint 1, Prompt 1.1)
- /src/components/landing/hero-action-bar.tsx (since Sprint 1, Prompt 1.1)
