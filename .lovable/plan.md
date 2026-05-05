
# P05 Conversation — Full Audit Report

## Files Inspected

| File | Role |
|------|------|
| `src/lib/report/block02-diagnostic.ts` (L499-604) | `classifyAudienceResponse()` — computes avgLikes, avgComments, totals, topConversationPost |
| `src/components/report-redesign/v2/report-diagnostic-card.tsx` (L520-716) | `DiagnosticAudienceHighlight` — renders P05 KPIs, subcopy, methodology footer |
| `src/components/report-redesign/v2/report-diagnostic-block.tsx` (L319-383) | `renderAudienceCard()` — wires data into the card |
| `src/components/report-redesign/v2/report-comment-intelligence.tsx` (L141-177) | `TransparencyStrip` — separate comment intel sample display |
| `src/lib/analysis/types.ts` (L135-189) | `CommentIntelligence` interface |
| `src/lib/report/snapshot-to-report-data.ts` (L71-84) | `SnapshotPost` interface |

---

## 1. Data Source Trace

| Field | Source file | Source field | Transformation |
|-------|-----------|-------------|----------------|
| `avgLikes` | `block02-diagnostic.ts:552,593` | `sum(post.likes) / postsWithData` | `Math.round()` |
| `avgComments` | `block02-diagnostic.ts:551,593` | `sum(post.comments) / postsWithData` | `Math.round()` |
| `totals.likes` | `block02-diagnostic.ts:597` | `totalLikes` (raw sum) | None |
| `totals.comments` | `block02-diagnostic.ts:598` | `totalComments` (raw sum) | None |
| `totals.postsWithComments` | `block02-diagnostic.ts:599` | `count(comments >= 1)` | None |
| `commentIntel.*` | `result.enriched.commentIntelligence` | Separate Apify comment scraper pipeline | Aggregated in `comment-intelligence.ts` |
| `topConversationPost` | `block02-diagnostic.ts:583-586` | Post with highest comments count | caption sliced to 90 chars |

All fields come from `normalized_payload.posts` in `analysis_snapshots`. Comment intelligence comes from a separate enrichment pipeline and is independent from the post-level comments count.

---

## 2. Manual Verification (frederico.m.carvalho, 12 posts)

| Metric | Raw value | Formula | Result |
|--------|-----------|---------|--------|
| Posts analysed | 12 | `posts.length` | 12 |
| Total likes | 87 | `sum(post.likes)` | 87 |
| Avg likes/post | 7.25 | `87 / 12` | `Math.round(7.25)` = **7** |
| Total comments | 1 | `sum(post.comments)` | 1 |
| Avg comments/post | 0.0833 | `1 / 12` | `Math.round(0.0833)` = **0** |
| Posts with comments | 1 | `count(comments >= 1)` | 1 |

---

## 3. PASS/FAIL Table

| Check | Status | Detail |
|-------|--------|--------|
| avgLikes correct | **PASS** | 87/12 = 7.25, rounds to 7 |
| avgComments correct | **FAIL — Rounding** | 1/12 = 0.083, `Math.round()` produces **0**, hiding real activity |
| totalLikes correct | **PASS** | 87 |
| totalComments correct | **PASS** | 1 |
| postsWithComments correct | **PASS** | 1 |
| topConversationPost correct | **PASS** | Post index 1 (6 likes, 1 comment) |
| Methodology footer label | **FAIL — Copy** | Shows `{sampleComments} comentários públicos` where `sampleComments` is from CommentIntelligence (number of scraped comments), NOT from the post-level totals. When commentIntel is unavailable, shows "comentários públicos visíveis" which is fine. When available, if `sampleComments = 12`, it reads "12 comentários públicos" — which could be confused with post count. |
| "1 de 12 posts com comentários" subcopy | **PASS** | Correctly sourced from `postsWithComments` and `sampleSize` |
| Cache staleness | **PASS** | Data comes from latest `analysis_snapshots` row; no secondary cache involved for P05 base metrics |

---

## 4. Root Causes

### Issue A — Rounding avgComments to 0 (BUG)

**File:** `src/lib/report/block02-diagnostic.ts`, line 593
**Code:** `avgComments: Math.round(avgComments)`

`Math.round(0.083)` = 0. The UI shows "0" in the KPI card, making it look like there are zero comments when there is actually 1 comment across 12 posts.

**Current formula:** `Math.round(totalComments / postsWithData)`
**Recommended formula:** Smart rounding:
- If raw value === 0 → `"0"`
- If raw value > 0 and < 0.1 → `"<0,1"`
- If raw value >= 0.1 and < 10 → one decimal (`0,1`)
- If raw value >= 10 → whole number

This rounding should happen at the **display layer** (report-diagnostic-card.tsx), not in the classifier. The classifier should return the unrounded float so the UI can format it correctly.

### Issue B — "12 comentários públicos" footer (COPY)

**File:** `src/components/report-redesign/v2/report-diagnostic-card.tsx`, line 712
**Code:** `` `${sampleComments} comentários públicos` ``

`sampleComments` comes from `commentIntel.sampleComments` — the total comments scraped by the comment intelligence pipeline. When this value coincidentally equals the number of posts (12), the footer reads "12 comentários públicos", which is ambiguous.

**Recommended fix:** Make the footer explicit:
```
Análise sobre {sampleSize} publicações · {sampleComments} comentários recolhidos · sem DMs nem comentários ocultos
```
Or, when commentIntel is unavailable, just show:
```
Análise sobre {sampleSize} publicações · comentários do feed · sem DMs nem comentários ocultos
```

---

## 5. Proposed Changes

### Change 1 — Return raw float in classifier

**File:** `src/lib/report/block02-diagnostic.ts`, line 593
- Change `avgComments: Math.round(avgComments)` → `avgComments: avgComments` (raw float)
- Similarly for `avgLikes`: `avgLikes: avgLikes` (raw float)

### Change 2 — Smart formatting helper

**File:** `src/components/report-redesign/v2/report-diagnostic-card.tsx`
- Add a `formatAvg(value: number): string` utility that applies the rounding rules above
- Use it at lines 586, 623 where `.toLocaleString("pt-PT")` is called

### Change 3 — Fix methodology footer copy

**File:** `src/components/report-redesign/v2/report-diagnostic-card.tsx`, line 712
- Replace `${sampleComments} comentários públicos` with `${sampleComments} comentários recolhidos`

---

## 6. Summary

| Category | Verdict |
|----------|---------|
| Data issue | No — raw data is correct (1 comment across 12 posts) |
| Rounding issue | **Yes** — `Math.round()` kills sub-1 averages |
| Copy issue | **Yes** — footer label "comentários públicos" is ambiguous |
| Cache issue | No — data flows directly from snapshot |
| UI issue | No — UI faithfully renders what it receives |

No code changes in this pass. Awaiting approval to implement.
