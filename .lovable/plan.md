
## P05 Conversation Metrics — Audit Results

### 1. Data Source — PASS

`classifyAudienceResponse()` in `block02-diagnostic.ts` (lines 499-604) iterates `posts[]` and sums `p.likes` and `p.comments` (post-level totals). It correctly:
- Counts `totalLikes`, `totalComments`, `postsWithComments` from post-level data
- Computes `avgLikes = totalLikes / postsWithData`, `avgComments = totalComments / postsWithData`
- Never touches `commentIntel.sampleComments` for these totals

`commentIntel.sampleComments` is only read inside `DiagnosticAudienceHighlight` for the footer label — never mixed with post-level totals.

### 2. Formatting Rules — 2 FAILS

| Location | File | Handles `0`? | Handles `<0.1`? | 1 decimal <10? | Rounded >=10? |
|---|---|---|---|---|---|
| `formatAvg()` | `report-diagnostic-card.tsx:33` | PASS (`"0"`) | PASS (`"<0,1"`) | PASS | PASS |
| KPI cards (Z2) | `report-diagnostic-card.tsx:602,639` | PASS (uses `formatAvg`) | PASS | PASS | PASS |
| Summary cards | `report-diagnostic-summary-cards.tsx:120-128` | **FAIL** — `0` falls to `< 10` branch, renders `0,0` | PASS | PASS | PASS |
| Grid v2 micro | `report-diagnostic-grid-v2.tsx:440` | **FAIL** — `0` falls to `< 10` branch, renders `0,0` | PASS | PASS | PASS |

### 3. Methodology Footer — 1 FAIL

| Label | Source | Current copy | Expected copy | Status |
|---|---|---|---|---|
| Posts analisados | `sampleSize` | `{n} posts analisados` | `{n} posts analisados` | PASS |
| Posts com comentários | `postsWithComments` | `{n} post(s) com comentários` | `{n} post(s) com comentários` | PASS |
| Post-level comment total | `totalComments` | `{n} comentário(s) público(s)` | `{n} comentário(s) público(s)` | PASS |
| Scraped comments | `sampleComments` | `{n} comentários analisados` | `{n} comentários recolhidos` | **FAIL** — should say "recolhidos" not "analisados" |

### Fixes Required

**File 1: `src/components/report-redesign/v2/report-diagnostic-summary-cards.tsx`** (line ~120)
- Add `avg === 0` guard returning `"0 comentários médios por post"`

**File 2: `src/components/report-redesign/v2/report-diagnostic-grid-v2.tsx`** (line ~440)
- Add `r.avgComments === 0` guard returning `"~0 comentários ..."`

**File 3: `src/components/report-redesign/v2/report-diagnostic-card.tsx`** (line 730)
- Change `comentários analisados` → `comentários recolhidos`

All three are small, isolated fixes. No logic changes needed.
