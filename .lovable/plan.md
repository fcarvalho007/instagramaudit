
# QA Audit — Report Lab Shareable URLs & Remembered Selection

## Results

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | `?profile=frederico.m.carvalho&variant=public_mvp` loads correctly | **PASS** | `resolved` reads `search.profile` first; variant from `search.variant`. |
| 2 | `?profile=martimsilvai&variant=internal_lab` loads correctly | **PASS** | Same path. Preset detected via `TEST_PROFILES.includes()`. |
| 3 | Invalid/missing `variant` falls back to `internal_lab` | **PASS** | Zod schema uses `fallback(z.enum(...), "internal_lab").default("internal_lab")`. |
| 4 | localStorage used only when query params absent | **PASS** | Line 150: `search.profile \|\| saved?.profile \|\| TEST_PROFILES[0]` — saved is only reached when `search.profile` is falsy (empty string = default). |
| 5 | Changing variant updates URL without full reload | **PASS** | `navigate({ search: ..., replace: true })` in the useEffect. |
| 6 | Selecting preset profile updates URL + loads snapshot | **PASS** | `setProfile()` + `setCustomProfile("")` changes `activeProfile`, which triggers both effects. |
| 7 | Custom profile input triggers URL/snapshot on every keystroke | **FAIL** | See below. |
| 8 | "Copy current lab URL" includes active profile and variant | **PASS** | Lines 330-336 build URL from `activeProfile` and `variant`. |
| 9 | Public route unchanged | **PASS** | No edits to any public route file. |
| 10 | No provider calls made | **PASS** | Only `adminFetch` to `/api/admin/snapshot/...` (cached data). |

## Critical Issue: Check #7

**`customProfile` updates `activeProfile` on every keystroke.**

The chain:

1. `onChange` on the `<input>` calls `setCustomProfile(e.target.value)` (line 260).
2. `activeProfile = customProfile.trim() || profile` (line 163) — recalculated every render.
3. **Effect 1** (line 166-180): depends on `activeProfile` → calls `navigate()` + `writeLabPrefs()` on every character.
4. **Effect 2** (line 218-220): depends on `activeProfile` → calls `loadSnapshot()` on every character.

**Impact:** Typing "test" fires 4 navigate calls, 4 localStorage writes, and 4 API fetches. This is wasteful, creates flickering, and can show transient "missing snapshot" errors for partial usernames.

## Recommended Fix

Debounce the custom profile input — only commit to `activeProfile` on blur, Enter key, or after a 500ms idle delay. Two clean approaches:

**Option A — Commit on blur/Enter (simplest, recommended):**
- Keep `customProfile` as a local "draft" state for the input.
- Add a separate `committedCustomProfile` state.
- Set `committedCustomProfile` on `onBlur` and `onKeyDown` (Enter).
- Derive `activeProfile` from `committedCustomProfile.trim() || profile`.
- This completely eliminates mid-typing side effects.

**Option B — Debounce timer:**
- Add a `useEffect` with a 500ms `setTimeout` on `customProfile` that sets a debounced value.
- Use the debounced value for `activeProfile`.
- Simpler code but still fires after pauses during typing.

**Recommendation:** Option A. It matches the original plan spec ("update only on blur, submit, or explicit action") and is zero-surprise for the admin.

## Files to Touch (for fix)

Only `src/routes/admin.report-lab.tsx` — add ~8 lines for committed state + blur/Enter handlers.

## Files NOT to Touch

Everything else. No report components, no variant config, no providers, no cost logic, no PDF.
