
## Move execution-mode components to sistema folder

3 files to move from `src/components/admin/v2/visao-geral/` to `src/components/admin/v2/sistema/`:
- `execution-mode-card.tsx`
- `test-profiles-card.tsx`
- `cache-maintenance-card.tsx`

1 import update in `src/routes/admin.sistema.tsx` (lines 31-33): change path from `visao-geral` to `sistema`.

No UI, logic, or style changes.
