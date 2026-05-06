
# P05 Conversation Metrics — Final Audit

## PASS/FAIL Table

| Check | Status | Notes |
|-------|--------|-------|
| 1. Raw calculations | **PASS** | `avgComments` and `avgLikes` returned as raw floats (line 551-552). `totalLikes`/`totalComments` are sums. `postsWithComments` counts `comments >= 1`. No rounding in classifier. |
| 2. Display formatting | **PASS** | `formatAvg()` at line 33-38: `0` returns `"0"`, `(0,0.1)` returns `"<0,1"`, `[0.1,10)` returns one decimal pt-PT, `>=10` returns rounded integer. Used consistently in P05 card (lines 602, 639), summary cards (explicit `avg === 0` guard + same logic), and grid-v2 (same guard). |
| 3. Methodology footer | **PASS** | Line 727-731: `{n} posts analisados · {n} post(s) com comentários · {n} comentário(s) público(s) · {n} comentários recolhidos · sem DMs nem comentários ocultos`. Correctly pluralizes. Only shows `comentários recolhidos` when `sampleComments !== totalComments`. |
| 4. Data source | **PASS** | `classifyAudienceResponse(posts)` iterates `posts` from `normalized_payload.posts`. Uses post-level `p.likes` and `p.comments`. `commentIntel` is only used for owner replies count and audience voice breakdown — never mixed into base averages. |
| 5. Regression check | **Needs tsc/vitest run** | Cannot run in read-only mode. |

## Sample Verification (12 posts, 87 likes, 1 comment, 1 post with comments)

- `avgLikes = 87 / 12 = 7.25` → `formatAvg(7.25)` → `"7,3"` (one decimal, < 10) --- **Correct**
- `avgComments = 1 / 12 = 0.0833...` → `formatAvg(0.0833)` → `"<0,1"` (> 0 and < 0.1) --- **Correct**
- Footer: `12 posts analisados · 1 post com comentários · 1 comentário público · sem DMs nem comentários ocultos` --- **Correct**

## Files Inspected

- `src/lib/report/block02-diagnostic.ts` (lines 499-605) — classifier logic
- `src/components/report-redesign/v2/report-diagnostic-card.tsx` (lines 33-38, 530-735) — formatAvg + P05 card + footer
- `src/components/report-redesign/v2/report-diagnostic-block.tsx` (lines 390-410) — prop wiring
- `src/components/report-redesign/v2/report-diagnostic-summary-cards.tsx` (lines 130-145) — summary card formatting
- `src/components/report-redesign/v2/report-diagnostic-grid-v2.tsx` (lines 400-420) — grid micro text

## Formulas in Use

- `avgComments = totalComments / postsWithData` (raw float, no rounding)
- `avgLikes = totalLikes / postsWithData` (raw float, no rounding)
- `commentsToLikesPct = round((totalComments / totalLikes) * 100, 1)`
- `postsWithComments = count(posts where comments >= 1)`

## Conclusion

All P05 logic and display are correct and consistent. The only remaining step is running `bunx tsc --noEmit` and `bunx vitest run` to confirm no regressions — this requires switching to default mode.

No code changes are needed.
