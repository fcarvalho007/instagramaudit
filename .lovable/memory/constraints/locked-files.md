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
