
# Admin UI Polish: Glassmorphism Tabs + Sistema Section Redesign

Two distinct improvements based on the screenshot and your feedback.

---

## 1. Glassmorphism Admin Tab Navigation

Replace the current plain underlined text tabs with frosted-glass pill buttons.

**Design:**
- Each tab: `backdrop-blur-md`, semi-transparent white background (`bg-white/60`), subtle border (`border-white/30`), soft shadow
- Active tab: solid white with stronger shadow + accent left border
- Hover: lift effect via brighter bg
- Rounded pill shape (`rounded-xl`)
- Sticky nav bar with its own glassmorphism background

**File:** `src/components/admin/v2/admin-tabs-nav.tsx`

---

## 2. Sistema "Controlo Operacional" Section Redesign

The current section feels flat and hard to parse. Problems visible in the screenshot:
- No white card container -- content floats directly on the cream canvas
- The "Modo de Execução" and "Perfis de Teste" cards lack visual hierarchy
- Status dots are tiny and hard to read
- "Expirar cache" section blends into the background
- Action buttons ("Abrir", "Fresh", "Expirar") are tiny text links, not obvious as interactive

**Redesign approach:**

### a) Wrap in a white card container
All three sub-cards (execution mode, test profiles, cache maintenance) go inside one unified white card with the shadow token `shadow-admin-card`. This creates the same visual treatment as other admin sections.

### b) Execution Mode Card improvements
- Larger, more distinct segmented control with rounded pills
- Active state uses a filled pill (not just tinted bg)
- Status badge below stays but gets a slightly larger font

### c) Test Profiles Card improvements
- Status items use labelled chips (coloured pill with text) instead of tiny dots
- "Abrir" and "Fresh" become small outlined buttons with icons, not bare text links
- Add a subtle divider between the two cards

### d) Cache Maintenance improvements
- Input + button get a more prominent treatment inside the card
- "Expirar" button styled as a small outlined destructive button (amber border)
- Result message gets a toast-like inline alert style

### e) Visual separator
A thin `border-t` divider between the Execution Mode row and the Cache Maintenance row.

---

## Files to change

1. `src/styles/admin-tokens.css` -- add glassmorphism utility tokens (blur, bg opacity, border)
2. `src/components/admin/v2/admin-tabs-nav.tsx` -- glassmorphism pill tabs
3. `src/routes/admin.sistema.tsx` -- wrap Controlo Operacional in white card
4. `src/components/admin/v2/sistema/execution-mode-card.tsx` -- improved segmented control
5. `src/components/admin/v2/sistema/test-profiles-card.tsx` -- chips + button actions
6. `src/components/admin/v2/sistema/cache-maintenance-card.tsx` -- input/button styling

## Not touched
- No locked files modified
- No public report cards, PDF, auth, global tokens, P04/P05/P07 UI
