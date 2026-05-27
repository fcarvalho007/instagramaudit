## Audit summary

### Current modal
- Component: `src/components/product/unlock-modal.tsx` (4 steps + welcome-back + success). Step 1 currently asks for: `first_name`, `last_name`, `email`, `gdpr_consent`, `marketing_consent`.
- Form schema: `src/lib/unlock-flow.ts` (`unlockFormSchema`). `first_name`/`last_name` are optional in Zod; the modal enforces non-empty in `goNext()`.
- Submit endpoint: `POST /api/public/report-unlock` → `src/routes/api/public/report-unlock.ts` → `processReportUnlock()` in `src/lib/unlock.server.ts`.
- The frontend already concatenates `${first_name} ${last_name}` into a single `name` field on the POST payload. The server schema (`reportUnlockSchema`) only knows `name` (full string), not `first_name`/`last_name` separately.

### Storage
- `leads` table stores a single `name text` column (full name). No `first_name`, `last_name`, `full_name`, `phone`, or `phone_normalized` columns.
- `report_requests.metadata` stores qualification fields but not name/phone.
- `product_events.metadata` stores event-specific flags only (no PII beyond what's already there).

### Name usage downstream
- Email senders (`src/lib/email/lead-magnet-sequence.server.ts`, `send-welcome-beta.server.ts`, `send-report-summary.server.ts`, templates in `src/lib/email/templates/*`) accept a `firstName` parameter.
- **Bug discovered:** `unlock.server.ts` lines 476–497 passes `data.name` (the FULL "Ana Marques" string) as `firstName` to `sendLeadMagnetSequence`. Templates render greetings as "Olá Ana Marques," instead of "Olá Ana,". Will be fixed by sending the parsed first_name explicitly.
- Brevo sync (`src/lib/brevo/sync.server.ts`): currently maps 11 operational attributes (handle, reports count, source, consent flags…). **Does NOT currently send FIRSTNAME, LASTNAME, or PHONE attributes.**
- Admin views (`src/components/admin/v2/beta-leads/lead-card.tsx`, `lead-detail-sheet.tsx`, `leads-table.tsx`, `commercial-followup-dialog.tsx`) read `lead.name` and derive `firstName` by splitting on whitespace. They will keep working unchanged because `name` will still hold the cleaned full name.

### Phone
- `phone` does not exist in any table. Safest path: add nullable `phone text` (and `phone_normalized text` reserved for later) to `public.leads` via additive migration. No required constraint, no default, no destructive change.

### Locked files
- `src/components/ui/{button,badge,card,input,switch}.tsx` are locked. Modal can reuse them as-is — no change needed.

---

## Plan

### 1. New pure helper `parseFullName`
**New file:** `src/lib/names/parse-full-name.ts`

```
parseFullName(input: string | null | undefined): {
  full_name: string;        // trimmed + collapsed spaces, original casing
  first_name: string;       // first word (never empty if input had any non-space char)
  last_name: string | null; // everything after the first word, or null
}
```
Rules: trim, collapse repeated whitespace (`/\s+/g → " "`), Unicode-aware (allows accents, hyphens, apostrophes). One-word inputs → `last_name: null`. Empty/whitespace-only → throws (validation layer prevents this).

**New tests:** `src/lib/names/__tests__/parse-full-name.test.ts` covering "Ana Marques", "Ana Rita Marques Silva", "  João  Pedro  ", "Élia", "Mary-Jane O'Connor", single emoji name, empty string.

### 2. Form schema rewrite — `src/lib/unlock-flow.ts`
- Remove `first_name` / `last_name` fields.
- Add `full_name: z.string().trim().min(2).max(120).regex(/\S/)` — enforces ≥2 chars after trim, allows accents/hyphens, NOT requiring two words.
- Add `phone: z.string().trim().max(40).optional()` — basic length cap. Optional at this stage to reduce friction (see decision note below).
- Keep `email`, `gdpr_consent`, `marketing_consent`, qualification fields, `pricing_preference`.

### 3. Modal restructure — `src/components/product/unlock-modal.tsx`
- **Step 1:** single `full_name` field. PT label "Primeiro e último nome", placeholder "Ana Marques". `autoFocus`, `autoComplete="name"`. Validation message: "Indica o teu nome (mínimo 2 caracteres)".
  - Step badge "~1 MIN" stays.
  - The operator/Leiria footer line stays on Step 1.
- **Step 2 (NEW intermediate):** email + phone + GDPR + marketing consent.
  - Email field (same component as today), with the existing returning-lead lookup logic moved from Step 1 → Step 2 "continue".
  - Phone field: PT label "Telemóvel", placeholder "912 345 678", helper "Usado apenas em casos excepcionais, como validação da conta ou problemas de acesso ao relatório." (EN equivalent). `type="tel"`, `autoComplete="tel"`, `inputMode="tel"`. **Optional** (rationale: phone is for exceptional account/report-access cases, not core lead capture; making it mandatory would measurably hurt conversion at the magnet step).
  - GDPR consent (required) and Marketing consent (optional) moved here from Step 1, copy unchanged.
- **Steps 3/4/5 (qualification + success):** renumbered from current 2/3/4/5. All existing logic, copy, scoring, returning-lead skip, partial banner, success state preserved exactly.
- **Progress bar:** `TOTAL_STEPS` becomes `5` so the segments still reflect "where am I". Step header keys move accordingly.
- **Returning-lead lookup (`/api/public/unlock-check`)** now fires from Step 2's "Continuar" (when email is captured), not Step 1. Welcome-back state still goes back to Step 1 on "Voltar" (same as today).
- **Submit payload** sent to `/api/public/report-unlock`:
  ```
  {
    full_name, first_name, last_name,   // parsed via parseFullName
    name: full_name,                    // back-compat alias
    email, phone,
    instagram_username, analysis_snapshot_id,
    profile_ownership, goal, user_type, goal_other_text, user_type_other_text,
    gdpr_consent, marketing_consent
  }
  ```

### 4. Server schema + persistence — `src/lib/unlock.server.ts`
- Extend `reportUnlockSchema` with optional `first_name`, `last_name`, `full_name`, `phone` (all trimmed; phone max 40). Keep `name` for back-compat. Server precedence: if `first_name`/`last_name`/`full_name` arrive, use them; otherwise fall back to splitting `name` via `parseFullName`.
- Persist `lead.name = full_name` (unchanged column).
- Persist `lead.phone` when provided (only on insert; on update, only fill if currently NULL — same conservative-merge pattern used for other fields).
- **Fix the email greeting bug:** pass `parsed.first_name` (not the full name) as `firstName` to `sendLeadMagnetSequence`. Confirms all templates render "Olá Ana,".
- `product_events` metadata: record `phone_provided: boolean` only. Never include the raw phone number in event metadata.

### 5. Database migration (additive, safe)
```sql
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS phone_normalized text;

CREATE INDEX IF NOT EXISTS leads_phone_normalized_idx
  ON public.leads (phone_normalized)
  WHERE phone_normalized IS NOT NULL;
```
No NOT NULL, no default, no FK, no GRANT change (existing grants on `leads` cover the new columns). `phone_normalized` is reserved for a later normalization helper — not populated by this prompt unless trivial.

We do **not** add `first_name`/`last_name`/`full_name` columns. The `leads.name` column continues to hold the cleaned full name. First/last are derived on read where needed — keeps the schema lean and avoids drift between three name columns. Documented in the unlock.server header comment.

### 6. Admin surfaces
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`: add a "Telemóvel" row inside the contact section, rendered ONLY when `lead.phone` is truthy. Use existing label style. Tap-to-call (`tel:`) link on mobile.
- `src/components/admin/v2/beta-leads/lead-card.tsx` and `leads-table.tsx`: NO new column (avoid cluttering when most rows have no phone). Phone only surfaces inside the detail sheet.
- Lead type (`EnrichedLead` and the kanban API): add `phone: string | null` to the select list of the admin leads endpoint (`/api/admin/leads-kanban`) so the detail sheet receives it.
- WhatsApp deep-link in detail sheet (line 630): prefer `lead.phone` when present for the `wa.me/<number>` URL instead of an empty target. Out of scope = changing the WhatsApp copy.

### 7. Brevo sync — **flag as manual config, do not silently send**
Audit confirms `src/lib/brevo/sync.server.ts` does NOT currently set FIRSTNAME, LASTNAME, or SMS attributes. Brevo accounts must have those attributes defined in the contact schema before the API accepts them. We will:
- Extend the attribute payload with `FIRSTNAME`, `LASTNAME`, and `SMS` (Brevo's standard attribute for phone) **gated by an env flag** `BREVO_NAME_PHONE_ATTRS_ENABLED` (default `false`).
- Surface in the prompt output a one-line manual task for the user: "Enable FIRSTNAME, LASTNAME, SMS attributes in Brevo, then set `BREVO_NAME_PHONE_ATTRS_ENABLED=true`."
- This prevents API failures on accounts without those attributes configured.

### 8. i18n updates
**`src/i18n/locales/{pt,en}/gate.json`** — add new keys, keep old ones:
- `unlock.step1.fullNameLabel` / `fullNamePlaceholder` / `fullNameRequired`
- `unlock.step1.titlePrefix/Em/Suffix` copy refresh: keep "Como te tratamos?" (still asks about the name)
- New `unlock.step2.*` block: title "Onde te enviamos o relatório?" / "Where do we send the report?", subtitle, `emailLabel`, `phoneLabel` ("Telemóvel" / "Mobile phone"), `phonePlaceholder`, `phoneHelper`, consent copy moved here
- Renumber `step2 → step3`, `step3 → step4`, `step4 → step5` for qualification eyebrows / subtitles
- Update `fieldLabels` (drop first_name/last_name, add `full_name` and `phone`)

### 9. Tests
- New: `src/lib/names/__tests__/parse-full-name.test.ts`
- Update: `src/i18n/__tests__/personal-no-feed-copy.test.ts` if it references the old keys (it doesn't, verified).
- Update: `src/lib/__tests__/unlock-schema.test.ts` to cover `full_name` (min 2, accents, single word), `phone` optional, payload accepts both legacy `name` and new `first_name`/`last_name`/`full_name`.
- Update: `src/lib/__tests__/unlock-flow.test.ts` and `unlock-observability.test.ts` for the parsed-name persistence + `phone_provided` event metadata.
- Add: assertion that `sendLeadMagnetSequence` is called with parsed `first_name`, not the full string.

### 10. Mobile QA
Visual pass at 360 / 390 / 414 px:
- Single-column fields on mobile.
- Phone helper text wraps cleanly, ≥12px.
- Consent block on Step 2 not cramped (uses existing rounded-xl muted container).
- Primary CTA remains in viewport without horizontal scroll.

### 11. Validation
- `bunx tsc --noEmit`
- `bunx vitest run` (full suite — touches schema, unlock, naming, observability)

---

## Out of scope
Pricing, Apify/OpenAI/DataForSEO, report generation, premium gates, payment logic. No real emails sent. No production data mutated besides the additive `leads.phone`/`phone_normalized` migration. Locked UI primitives untouched.

## Output to return after build
1. Audit summary (above) — refined with any discoveries.
2. Files changed.
3. Migration applied.
4. Final modal step structure (5 steps).
5. `parseFullName` behavior + examples.
6. Phone storage behavior (column added, optional, persisted on insert, conservatively filled on update, never in event metadata).
7. Admin surfaces updated (detail sheet row + kanban-API select).
8. Email personalization confirmation (greeting bug fixed, all templates render first-name only).
9. Brevo mapping status (flag-gated FIRSTNAME/LASTNAME/SMS; manual Brevo attribute config noted).
10. Test results.
