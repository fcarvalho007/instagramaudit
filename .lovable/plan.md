## Objetivo
Tornar `/admin/report-preview/:username?variant=pro_preview` (e `?variant=internal_lab`, `?variant=public_mvp`) **fullscreen, sem sidebar nem chrome admin** — exactamente como o cliente Pro veria. Refinar também `/admin/report-lab` para deixar claro como ir do laboratório para a vista fullscreen.

## Mudanças

### 1. Sair do layout admin (mantendo URL)
Renomear, usando a convenção de underscore final do TanStack Router que mantém o URL mas escapa ao layout pai:
- `src/routes/admin.report-preview.$username.tsx` → `src/routes/admin_.report-preview.$username.tsx`
- `src/routes/admin.report-preview.snapshot.$snapshotId.tsx` → `src/routes/admin_.report-preview.snapshot.$snapshotId.tsx`

Actualizar:
- `createFileRoute("/admin/report-preview/...")` → `createFileRoute("/admin_/report-preview/...")` (o URL público continua `/admin/report-preview/...`).
- Os `<Link to="/admin/report-preview/...">` tipados em `profiles-panel.tsx`, `reports-panel.tsx`, `lead-detail-sheet.tsx`, `test-profiles-card.tsx` passam a `to="/admin_/report-preview/..."`.
- `admin.report-lab.tsx` continua a usar strings sem typed `to`, fica igual.

### 2. Render fullscreen, sem chrome admin
Em ambos os ficheiros renomeados:
- Remover `AdminPreviewChrome`, `AdminBanner`, `CoverageStrip`, `CoverageNotice`, `AdminFooterNotice`.
- Manter `AdminGate` (auth via `readAdminEmail`). Sem sessão → mostrar gate.
- Com sessão → renderizar apenas `<ReportThemeWrapper><ReportShellV2 ... premiumUnlocked={variant !== "public_mvp"} unlocked={variant !== "public_mvp"} /></ReportThemeWrapper>` em `min-h-screen bg-surface-base`.
- Adicionar **um único pill flutuante** `fixed top-3 right-3 z-50` ("← Sair da pré-visualização") que volta a `/admin/report-lab?profile={username}&variant={variant}`. Discreto, neutro, oculta-se em print/`@media print`. Sem isto o admin fica preso.
- Estados loading/missing/error mantêm-se como mensagens limpas centradas no ecrã (sem o banner amarelo nem coverage strips).

### 3. `/admin/report-lab` — refinar a moldura do preview embebido
- Acima do `ReportShellV2` embebido, adicionar uma faixa fina com:
  - Texto: "Pré-visualização condensada · `{variant}`. Para validar como o cliente Pro vê, abre em ecrã completo."
  - Botão primário "Abrir em ecrã completo" → mesmo URL que os links rápidos já geram.
- Manter intactos: selector de perfil, selector de variante, matriz de módulos, links rápidos, gestor de visibilidade.

## Resultado esperado
- `/admin/report-preview/frederico.m.carvalho?variant=pro_preview` → idêntico a `/analyze/frederico.m.carvalho` para um cliente Pro: todos os 6 blocos desbloqueados, sem sidebar AuditProfiles, sem banner "ADMIN", sem coverage strip. Só um pill discreto no canto.
- Mesma rota com `?variant=internal_lab` → também fullscreen, ainda com tudo desbloqueado, debugLabels visível (decidido pelo `features`).
- Mesma rota com `?variant=public_mvp` → fullscreen com o gate de leads/CTA do cliente público.
- `/admin/report-lab` continua a ser o cockpit do laboratório, agora com atalho directo para abrir cada variante em fullscreen.

## Ficheiros afectados
- Renomear: `src/routes/admin.report-preview.$username.tsx`, `src/routes/admin.report-preview.snapshot.$snapshotId.tsx`
- Editar (após renomear): conteúdo dos dois ficheiros acima
- Editar: `src/routes/admin.report-lab.tsx` (faixa de preview)
- Editar (links tipados): `src/components/admin/cockpit/panels/profiles-panel.tsx`, `src/components/admin/cockpit/panels/reports-panel.tsx`, `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`, `src/components/admin/v2/sistema/test-profiles-card.tsx`

## Fora de escopo
- Não toco em `/analyze/:username`, `/report.example`, nos cards do report em si, em dados, snapshots, RLS, auth Google, pagamentos.
- Não removo o `AdminGate` — a página continua a exigir admin autenticado, só não mostra chrome admin.