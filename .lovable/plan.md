
## Summary

Move the three operational cards (Execution Mode, Test Profiles, Cache Maintenance) from Visao Geral to Sistema. Replace them in Visao Geral with a slim status strip. Add a persistent execution-mode indicator in the admin layout header.

---

## Changes

### 1. Move cards to Sistema (`src/routes/admin.sistema.tsx`)

Import `ExecutionModeCard`, `TestProfilesCard`, `CacheMaintenanceCard` from their current location. Place them at the top of Sistema in a responsive 3-column grid before HealthSection.

Wrap the three cards in a section with header "Controlo operacional" and a `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` layout.

### 2. Redesign ExecutionModeCard for Sistema

Replace the current compact toggle with a larger, unmistakable segmented control:
- Two large pill buttons: `Cache-only` and `Fresh`
- Active state uses full background fill (green for cache-only, amber for fresh)
- Status badge inside the card
- Explanatory copy below the switcher
- Confirmation dialog copy updated per spec:
  - Title: "Ativar modo Fresh?"
  - Body: "Este modo pode chamar APIs pagas, incluindo Apify, OpenAI e DataForSEO. Usa apenas quando quiseres gerar uma nova análise real."

### 3. Replace Visao Geral cards with status strip (`src/routes/admin.visao-geral.tsx`)

Remove the three card imports and the `<div>` containing them. Add a new inline `ExecutionModeStrip` component — a single-line alert bar that:
- Queries `getExecutionMode()`
- Shows green strip for cache-only, amber strip for fresh
- Includes badge + description + "Abrir Sistema" link
- Uses admin tokens: `--admin-revenue-*` for green, `--admin-expense-*` for amber

### 4. Persistent indicator in admin layout (`src/routes/admin.tsx`)

Add a small execution-mode badge next to the DemoModeSwitch in the top-right header area. Uses the same `getExecutionMode()` query. Shows:
- Cache-only: green dot + "Cache-only · sem custos"
- Fresh: amber dot + "Fresh · APIs pagas ativas"

### 5. Refine Test Profiles Card labels

Update labels per spec:
- "Report" → "Report cache"
- "Caption semantic" → "Legendas IA"
- "Comment intel" → "Comentários"
- "Visual cover" → "Capas visuais"
- "Abrir report em cache" → "Abrir cache"
- Tooltip on disabled "Reanalisar fresh": "Ativa Fresh para gerar nova análise."

### 6. Refine Cache Maintenance Card

Update button label: "Forçar próxima análise fresh" → "Expirar cache"
Add helper text: "A expiração da cache não chama APIs automaticamente."

---

## Files changed

| File | Action |
|------|--------|
| `src/routes/admin.visao-geral.tsx` | Remove 3 card imports, add inline status strip |
| `src/routes/admin.sistema.tsx` | Add 3 card imports at top in grid section |
| `src/routes/admin.tsx` | Add persistent execution-mode badge in header |
| `src/components/admin/v2/visao-geral/execution-mode-card.tsx` | Redesign switcher (larger segmented control, updated copy) |
| `src/components/admin/v2/visao-geral/test-profiles-card.tsx` | Update labels per spec |
| `src/components/admin/v2/visao-geral/cache-maintenance-card.tsx` | Update button label + helper text |

## Not touched

P04, P05, P07 report cards, PDF pipeline, auth, global tokens, locked files, provider pipeline logic.
