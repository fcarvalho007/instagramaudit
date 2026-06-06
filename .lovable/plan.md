## Plan: Fix Add Competitor UX Limit in Paid/Pro Sidebar

### Problem
The paid sidebar shows "X de 2" competitors but the **Add Competitor button is never disabled** when the limit is reached. If a user enters a 3rd valid handle, the client silently truncates the list via `.slice(0, 2)`, may show a success toast, and updates the URL with the unchanged list — creating confusing UX.

### Changes

#### 1. `src/components/report-redesign/v2/report-block-nav.tsx`

**ExploreSection component:**

- Introduce a local constant `COMPETITOR_MAX = 2` at component scope (with a TODO comment for later centralisation).
- Replace all hard-coded `2` references in competitor logic with `COMPETITOR_MAX`.
- In `onAddCompetitor`: when `premiumUnlocked`, guard with `if (competitorCount >= COMPETITOR_MAX) return;` — do **not** open the `ConsumeCreditDialog` when at max.
- In `onConfirmConsume` (competitor branch): add an early guard `if (existingCompetitors.length >= COMPETITOR_MAX)` that sets an error message and returns — no fetch, no credit consumed.
- Remove/replace the silent truncation `const competitorList = [...existingCompetitors, newHandle].slice(0, 2);` with explicit `const competitorList = [...existingCompetitors, newHandle];` since the guard above prevents overflow.
- In the **expanded** competitor button (line ~886): pass `disabled={competitorCount >= COMPETITOR_MAX}` to the `<button>`, change styling to reflect disabled state (muted border, no hover, cursor-not-allowed), and render a subtle hint below the button when at max:  
  _"Limite de 2 concorrentes atingido. Remove um concorrente para adicionar outro."_
- In the **compact** competitor button (line ~789): apply the same disabled state + styling when at max.

#### 2. `src/components/report-redesign/v2/consume-credit-dialog.tsx`

**Defensive dialog-level guard:**

- Accept a new optional prop: `competitorMax?: number`.
- When `isCompetitor && existingCompetitors.length >= (competitorMax ?? 2)`, render a non-dismissible alert at the top of the dialog body:  
  _"Limite de 2 concorrentes atingido."_  
  Disable the confirm button, hide the input, and swap the CTA for a "Fechar" / "Close" ghost button.

This is a safety net in case the dialog is ever opened programmatically despite the sidebar guard.

#### 3. i18n strings

Add to both `src/i18n/locales/pt/report.json` and `src/i18n/locales/en/report.json` under `nav.explore`:

**PT:**
- `"competitor_limit_reached": "Limite de 2 concorrentes atingido."`
- `"competitor_limit_hint": "Remove um concorrente para adicionar outro."`
- `"competitor_limit_dialog_body": "Já atingiste o máximo de 2 concorrentes."`

**EN:**
- `"competitor_limit_reached": "2 competitor limit reached."`
- `"competitor_limit_hint": "Remove one competitor to add another."`
- `"competitor_limit_dialog_body": "You have already reached the maximum of 2 competitors."`

### What does NOT change
- Pricing, checkout, EuPago
- Entitlement / credit grant logic
- Backend credit reserve/confirm/release (`credits.server.ts`, `analyze-public-v1.ts`)
- Report generation, calculations, schema
- Apify scraping logic
- Free-user flow (still opens pricing modal)

### Validation checklist
1. Paid user with 0 competitors → button enabled, dialog opens, credit consumed on success.
2. Paid user with 1 competitor → same as above.
3. Paid user with 2 competitors → button disabled, no dialog opens, no credit consumed, no success toast.
4. Compact sidebar at 2/2 → same disabled state.
5. Free user → button still opens pricing/unlock modal.
6. Dialog defensive guard: if opened at max, shows limit message and blocks submission.
7. No `.slice(0, 2)` silent truncation remains in any success path.