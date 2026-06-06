## Visual validation plan — `/admin/email-lab`, `/admin/automacoes`, `payment_confirmed`

Read-only browser walkthrough. No code edits, no email sends, no payment triggers.

### Steps

1. **Open `/admin/email-lab`** via `browser--view_preview`.
   - Screenshot the KPI header → confirm 6 tiles: Total / Operacionais / Manuais / Transaccionais / Planeados / Legados.
   - Confirm the legacy templates (`welcome_beta`, `report_summary`) are hidden by default and a "Mostrar legados" toggle is visible.
   - Confirm `personal_area_saved` is rendered under the **Planeado** group, not under Legados, and carries a "Planeado" badge.
   - Confirm `report_saved` is presented as the main auto-delivery email (eyebrow / description references "Email principal automático após unlock").
   - Confirm `report_ready` is grouped under manual delivery with a signed-URL note.
   - Toggle "Mostrar legados" ON and confirm `welcome_beta` + `report_summary` reappear with the absorbed-by-`report_saved` note. Toggle back OFF.

2. **Select the `payment_confirmed` template** in Email Lab.
   - Screenshot the rendered preview iframe (HTML + plaintext if visible).
   - Verify visually:
     - Dark navy header intact.
     - Lead sentence: "O relatório completo de @… está desbloqueado — com acesso vitalício às 6 secções."
     - Receipt card with Produto / Valor pago / (Método) / (Referência) / Total, all values coming from preview data (no `9,00 €` hardcode visible if preview uses a different amount).
     - Blue reassurance card with "Pagamento único, sem subscrição nem renovação automática. O relatório fica guardado na tua conta."
     - Signature reads "Obrigado pela confiança, / Frederico · AuditProfiles" (no "equipa AuditProfiles", no "Até já,").
     - No `{{placeholders}}`, `undefined`, `null`.
   - Switch to mobile viewport (375 wide) and re-screenshot → confirm receipt + info card + CTA stack cleanly.

3. **Open `/admin/automacoes`**.
   - Screenshot the flow.
   - Confirm a `98_planeado` stage exists, contains `personal_area_saved`, and is visually muted ("Planeado · sem trigger").
   - Confirm `99_legado` contains `welcome_beta` + `report_summary` with the "Absorvido por report_saved" note.
   - Confirm KPI strip includes a `planeados` count and "Operacionais" excludes both `98_planeado` and `99_legado`.

4. **Safety read-only check** (no shell): inspect the diff surface by listing recent changes against the locked areas only via the file viewer (no edits). Verify, by reading, that none of the following have been modified in this branch:
   - `src/lib/email/send-*.server.ts`
   - `src/routes/api/public/eupago-webhook.ts`
   - Any price constants / checkout module
   - `src/integrations/supabase/*` and migrations
   - Report generation modules

### Output format

For each of the 6 checks the user listed, emit one line: `PASS` / `FAIL` with the exact visual evidence (screenshot reference or quoted on-screen text). Include the 3–4 screenshots inline. End with a single-line overall verdict.

### Constraints

- No `apply_patch`, no `exec`, no migrations, no edge-function deploys.
- Only `browser--view_preview`, `set_viewport_size`, `observe`, `act`, `screenshot`, `zoom_image`, and `code--view` (read-only).
- If `/admin/*` requires auth and the preview is logged out, stop and ask the user to log in — do not attempt to authenticate.
