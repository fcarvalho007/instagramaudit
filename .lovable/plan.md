## Admin Navigation Audit — InstaBench → CRM-style sidebar

Read-only audit. No code changes. Goal: replace the horizontal `AdminTabsNav` with a vertical fixed sidebar inspired by **CRM Webinar Imagens + Vídeo** (`src/components/crm/CRMSidebar.tsx`), keeping InstaBench language and information architecture.

---

### 1. Current InstaBench admin IA (as built)

Layout: `src/routes/admin.tsx` → `AdminAuthShell` → `<main max-w-1280>` → top toolbar (`ExecutionModeBadge`, `DemoModeSwitch`, "Terminar sessão") → **`AdminTabsNav`** (horizontal pill bar with 3 eyebrow groups) → `<Outlet/>` → `AdminCommandPalette` + `Toaster`.

Routes under `/admin`:

| Route file | URL | In current nav? | Group |
|---|---|---|---|
| `admin.index.tsx` | `/admin` | (entry / redirect) | — |
| `admin.visao-geral.tsx` | `/admin/visao-geral` | ✅ | Negócio |
| `admin.receita.tsx` | `/admin/receita` | ✅ | Negócio |
| `admin.clientes.tsx` | `/admin/clientes` | ✅ | Negócio |
| `admin.beta-leads.tsx` | `/admin/beta-leads` | ✅ ("Leads") | Pipeline |
| `admin.beta-requests.tsx` | `/admin/beta-requests` | ✅ ("Pedidos") | Pipeline |
| `admin.automacoes.tsx` | `/admin/automacoes` | ✅ | Pipeline |
| `admin.relatorios.tsx` | `/admin/relatorios` | ✅ | Produto |
| `admin.perfis.tsx` | `/admin/perfis` | ✅ | Produto |
| `admin.conhecimento.tsx` | `/admin/conhecimento` | ✅ | Produto |
| `admin.report-lab.tsx` | `/admin/report-lab` | ✅ | Produto |
| `admin.sistema.tsx` | `/admin/sistema` | ✅ | Produto |
| `admin.sistema.cockpit-legado.tsx` | `/admin/sistema/cockpit-legado` | ❌ (subpage) | Produto |
| `admin.email-lab.tsx` | `/admin/email-lab` | ❌ **(orphan)** | — |
| `admin.report-preview.$username.tsx` | `/admin/report-preview/...` | ❌ (deep-link only) | — |
| `admin.report-preview.snapshot.$snapshotId.tsx` | `/admin/report-preview/snapshot/...` | ❌ (deep-link only) | — |

Findings:
- **11 visible tabs** in three groups → horizontal scroll on mobile.
- `email-lab` exists but is unreachable from the nav.
- Visual style: light glassmorphism (`bg-white/45 backdrop-blur`), semantic admin tokens, NOT dark navy.

### 2. CRM Webinar reference (`src/components/crm/CRMSidebar.tsx`)

Fixed left aside, `w-240px`, `#0F172A` background, `border-right rgba(255,255,255,0.06)`. Sections:

1. **Logo block** (BarChart icon + brand name).
2. **Context selector** (custom `<select>` with color tab — "Webinar" → in InstaBench would map to e.g. environment/data scope).
3. **Nav** — 7 buttons: Dashboard, Pipeline, Tabela, Faturação, Automações, Comunicação, Lixo. Active = `rgba(37,99,235,0.20)` background + `#60A5FA` text/icon. Hover lightens.
4. **Spacer** then **Logout** (red on hover).

Mobile: hamburger `fixed top-3 left-3` opens an overlay drawer. No mini-collapsed state on desktop — always 240 px.

The component uses inline styles + raw hex (not tokens), is button-based (not `<Link>`), and depends on `useWebinarContext`. **Cannot be copied verbatim** — must be rewritten with TanStack `<Link>`, semantic tokens, and InstaBench domain.

### 3. Mapping table — current routes → new sidebar IA

Single flat list with section labels (CRM Webinar pattern), 9 visible items, two groups for clarity:

| Section | Sidebar label | Icon | Route | Action |
|---|---|---|---|---|
| **Negócio** | Visão geral | LayoutDashboard | `/admin/visao-geral` | Keep (rename — current = "Visão geral") |
| | Receita | Receipt | `/admin/receita` | Keep |
| | Clientes | Users | `/admin/clientes` | Keep |
| **Pipeline** | Leads | Columns | `/admin/beta-leads` | Keep |
| | Pedidos | Inbox | `/admin/beta-requests` | Keep |
| | Automações | Zap | `/admin/automacoes` | Keep |
| **Produto** | Relatórios | FileText | `/admin/relatorios` | Keep |
| | Perfis | AtSign | `/admin/perfis` | Keep |
| | Conhecimento | BookOpen | `/admin/conhecimento` | Keep |
| **Laboratório** | Report Lab | FlaskConical | `/admin/report-lab` | Keep |
| | Email Lab | MailCheck | `/admin/email-lab` | **Surface** (currently orphan) |
| **Sistema** | Sistema | Settings | `/admin/sistema` | Keep |

Hidden (deep-link only, not in sidebar):
- `/admin/report-preview/...` (admin previews opened from other tabs)
- `/admin/sistema/cockpit-legado` (sub-page, accessible from Sistema content)

Out of scope (no InstaBench equivalent → not added): "Tabela", "Faturação" (Stripe not enabled yet), "Comunicação", "Lixo".

Footer of sidebar (replaces top-right toolbar):
- `ExecutionModeBadge` (cache-only / fresh)
- `DemoModeSwitch`
- "Terminar sessão" button

### 4. Files that would change (when implementing — NOT now)

| File | Action |
|---|---|
| `src/components/admin/v2/admin-sidebar.tsx` | **New.** TanStack `<Link>`-based, semantic tokens, mobile drawer. |
| `src/routes/admin.tsx` | Refactor: `<div class="flex">` shell with `<AdminSidebar>` + `<main>`. Move `ExecutionModeBadge`, `DemoModeSwitch`, logout into sidebar footer. Drop `<AdminTabsNav/>`. |
| `src/components/admin/v2/admin-tabs-nav.tsx` | Delete (sole consumer is `admin.tsx`). |
| `src/styles/admin-tokens.css` | Add (or confirm) tokens for sidebar surface, active state, hover. No new hex in components. |
| Per-page `AdminPageHeader` / `max-w-1280` containers | Audit padding once sidebar is in place; likely keep, just shift main offset by sidebar width. |

### 5. Risks

1. **Memory conflict — dark navy sidebar.** `mem://index.md` Core says: *"No dark navy backgrounds. No cyan neon. Light-first, Iconosquare-inspired."* The CRM Webinar sidebar uses `#0F172A` (dark navy). InstaBench's admin tokens are light. **Decision needed:** (a) keep light surface for the sidebar (white/very-light gray, blue active state) — still gives the structural CRM feel without breaking the design system; (b) explicitly carve out an exception in memory and use dark navy ONLY in `/admin` (not public). Recommendation: **(a)**, since the user mentioned admin-only, but it is technically allowed.
2. **Token coverage.** CRM source uses raw hex (`#0F172A`, `#60A5FA`, `rgba(37,99,235,...)`). Need to add admin sidebar tokens (`--admin-sidebar-bg`, `--admin-sidebar-active-bg`, `--admin-sidebar-active-text`, `--admin-sidebar-hover-bg`) to avoid hardcoding.
3. **Layout reflow.** Many admin pages currently assume a centered `max-w-1280` container starting from the viewport edge. Adding a `240 px` left rail changes effective width on narrow desktops (1280–1440 px). Need to verify `Visão geral` cards, kanban (`/admin/beta-leads`) and Receita charts don't overflow.
4. **Mobile UX.** Current top tabs scroll horizontally; sidebar requires a hamburger + overlay drawer. New `useIsMobile` dep + first focusable accessibility (focus trap, ESC to close, aria-modal).
5. **Active state matching.** TanStack `<Link>` uses `activeProps` based on `data-status="active"`. For `/admin` index ("Visão geral"), need `activeOptions={{ exact: true }}` or it stays active for all child routes.
6. **Command palette + auth gate.** `AdminAuthShell`, `AdminCommandPalette`, `Toaster` must keep wrapping the new shell — easy regression to drop them.
7. **Route registry.** No new routes; `routeTree.gen.ts` is auto-regenerated. Just file edits.

### 6. Recommended implementation plan (small batches, ship one at a time)

**Batch 1 — Tokens + skeleton (no behavior change yet)**
- Add admin-sidebar tokens to `src/styles/admin-tokens.css`.
- Create `admin-sidebar.tsx` rendering only the static markup behind a feature flag (or unused), to validate visuals.

**Batch 2 — Wire sidebar into `admin.tsx`**
- Replace `AdminTabsNav` with `AdminSidebar`. Update layout to `flex` shell. Move toolbar items into sidebar footer.
- Keep `AdminAuthShell`, palette, toaster intact.
- Delete `admin-tabs-nav.tsx`.

**Batch 3 — Mobile drawer + a11y**
- Hamburger trigger, overlay, focus trap, ESC, body scroll lock. Test at 375 px.

**Batch 4 — Polish per page**
- Walk every route (12 pages) and adjust container padding/widths so charts and tables don't overflow with the new offset.
- Verify active state, including `/admin/sistema/cockpit-legado` highlights "Sistema".

**Batch 5 — Surface Email Lab**
- Add Email Lab item (was orphan) and double-check the page still renders (route already exists).

Each batch ends with `bunx tsc --noEmit` + `bunx vitest run` + manual check on `/admin/visao-geral`, `/admin/beta-leads`, mobile 375 px.

### 7. Open questions before implementing

1. **Sidebar surface — light or dark?** Memory says light-first, no navy. Confirm: (a) light sidebar (`#FFFFFF`/`#F1F4F9` with blue active, recommended) or (b) dark navy admin-only exception.
2. **Group labels in sidebar?** CRM Webinar has none — flat 7 items. InstaBench has 12 items, so keep the 4 eyebrow groups (Negócio / Pipeline / Produto / Laboratório / Sistema) for scannability?
3. **Collapsible?** CRM Webinar is fixed-width (no mini state). Want a `collapsible="icon"` (shadcn pattern) to free space on smaller screens, or keep it always 240 px?
