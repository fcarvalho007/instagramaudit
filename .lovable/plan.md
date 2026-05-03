
# Data Audit — Zone D (Frequency + Content Type Cards)

## 1. Frequency Card Data

| # | Field | Exists? | Source | Notes |
|---|-------|---------|--------|-------|
| 1 | Total posts analysed | **Yes** | `keyMetrics.postsAnalyzed` (also `profile.postsAnalyzed`) | Derived from `content_summary.posts_analyzed` or `posts.length` |
| 2 | Days analysed | **Yes** | `coverage.windowDays` and `profile.windowDays` | Computed as `ceil((newest - oldest) / 86400000) + 1` from `posts[].taken_at_iso` |
| 3 | Posts per day | **Derivable** | `postsAnalyzed / windowDays` | Not stored as a field but trivial division |
| 4 | Posts per week | **Yes** | `keyMetrics.postingFrequencyWeekly` | Recalculated in adapter: `(postsAnalyzed / windowDays) * 7`, rounded to 1 decimal |
| 5 | Posting days as boolean array | **Derivable** | From `posts[].taken_at_iso` or from `postingHeatmap.matrix` | The heatmap matrix is 7x24 (Mon-Sun x 0-23h). Sum each row > 0 gives a boolean per weekday. Alternatively, iterate `posts[].taken_at_iso`, extract weekday, build `Set<number>` |
| 6 | Dates for each post | **Yes** | `posts[].taken_at_iso` (raw ISO) and `enriched.topPosts[].date` (formatted "DD Mmm") | Full ISO available in snapshot posts; `enriched.topPosts` only has top 5 |
| 7 | Frequency score | **Yes** | `computeFrequencia(postingFrequencyWeekly)` in `score-utils.ts` | Already calculated in ReportOverviewBlock |

### Deriving `postingDays` safely

Two approaches, both safe:

**Option A — From heatmap matrix (already computed):**
```
data.postingHeatmap.matrix.map(row => row.some(cell => cell > 0))
// Returns boolean[7] for Mon..Sun
```
Caveat: heatmap uses engagement-weighted averages, not raw counts — a day with posts but 0 engagement would still show > 0.

**Option B — From raw posts (more accurate):**
```
const activeDays = new Set<number>();
posts.forEach(p => {
  if (p.taken_at_iso) {
    const d = new Date(p.taken_at_iso);
    activeDays.add(d.getUTCDay()); // 0=Sun..6=Sat
  }
});
// Convert to ISO weekday boolean[7] Mon..Sun
```
This requires access to the raw `posts[]` array. The `enriched.topPosts` only has the top 5 — insufficient. The full posts array is consumed inside `snapshotToReportData` but is NOT exposed in `AdapterResult`.

**Recommendation:** Use Option A (heatmap matrix) since it's already in `AdapterResult.data.postingHeatmap`. No adapter changes needed.

---

## 2. Content Type Card Data

| # | Field | Exists? | Source | Notes |
|---|-------|---------|--------|-------|
| 1 | List of analysed posts | **Partial** | `enriched.topPosts` (top 5 only) | Full list not exposed in AdapterResult |
| 2 | Post format per post | **Yes** | `enriched.topPosts[].format` ("Reel" / "Carousel" / "Imagem") and `posts[].format` (raw) | Top posts have normalised labels |
| 3 | Distribution by format | **Yes** | `data.formatBreakdown[]` — array of `{ format, sharePct, engagement, benchmark, tint, status }` | Three canonical formats: Reels, Carousels, Imagens |
| 3a | Carousel % | **Yes** | `formatBreakdown.find(f => f.format === "Carousels").sharePct` | |
| 3b | Reel % | **Yes** | `formatBreakdown.find(f => f.format === "Reels").sharePct` | |
| 3c | Image % | **Yes** | `formatBreakdown.find(f => f.format === "Imagens").sharePct` | |
| 3d | Video (non-reel) | **Missing** | Adapter normalises all video to "Reels" | Instagram API merges IGTV/video into Reels; safe to treat as absent |
| 3e | Unknown/Other | **Missing** | Adapter forces every post into one of 3 buckets | No "unknown" bucket — fallback is always "Imagens" |
| 4 | Total post count | **Yes** | `keyMetrics.postsAnalyzed` | |
| 5 | Dominant format | **Yes** | `keyMetrics.dominantFormat` ("Reels" / "Carousels" / "Imagens") + `keyMetrics.dominantFormatShare` (%) | |
| 6 | Format stats object | **Yes** | `data.formatBreakdown` (3-element array) + raw `snapshot.format_stats` (not exposed) | |

### Additional data available per format
Each `formatBreakdown` entry also carries:
- `engagement` — average engagement rate for that format
- `benchmark` — market reference rate
- `status` — "abaixo" / "acima" / "ligeiramente-acima"
- `tint` — colour key ("primary" / "success" / "warning")

This is rich enough for a visual bar/donut and a verdict per format.

---

## 3. Summary

### Already exists — ready to use
- `postsAnalyzed`, `windowDays`, `postingFrequencyWeekly`
- `formatBreakdown` (full distribution with benchmarks)
- `dominantFormat`, `dominantFormatShare`
- `postingHeatmap.matrix` (for deriving active weekdays)
- `computeFrequencia` score

### Needs derivation (zero adapter changes)
- **Posts per day**: `postsAnalyzed / windowDays`
- **Active posting days**: `heatmap.matrix.map(row => row.some(v => v > 0))`
- **Format count** (absolute number per format): `Math.round(sharePct / 100 * postsAnalyzed)`

### Missing (cannot derive without adapter changes)
- **Video vs Reel distinction** — adapter normalises both to "Reels"; Instagram API treats them the same since 2022. Safe to ignore.
- **Unknown/Other format bucket** — all posts mapped to 3 canonical formats. Safe to omit.

### Safe fallback behaviour
| Scenario | Fallback |
|----------|----------|
| `windowDays === 0` | Show "período indeterminado", hide per-day stat |
| `postsAnalyzed === 0` | Show empty state: "Sem publicações analisadas" |
| `formatBreakdown` empty | Show single "Sem dados de formato" message |
| `postingHeatmap` empty matrix | Hide weekday activity dots |

---

## 4. Files involved

| File | Role |
|------|------|
| `src/lib/report/snapshot-to-report-data.ts` | Adapter — builds all fields. **No changes needed.** |
| `src/components/report/report-mock-data.ts` | Type source (`ReportData`). **Locked — no changes.** |
| `src/components/report-redesign/v2/report-overview-block.tsx` | Block 1 shell — will host Zone D cards |
| `src/components/report-redesign/v2/overview/score-utils.ts` | Already has `computeFrequencia` |
| New: `src/components/report-redesign/v2/overview/frequency-card.tsx` | To create |
| New: `src/components/report-redesign/v2/overview/format-card.tsx` | To create |

---

## 5. Risk level

**Low.** All data needed for both cards already exists in `AdapterResult`. No adapter changes, no migrations, no new API calls. Pure presentational work reading existing props.

---

## 6. Recommended implementation sequence

1. **Create `frequency-card.tsx`** — reads `keyMetrics` + `postingHeatmap` + `coverage.windowDays`, renders headline + stats + weekday dots + verdict
2. **Create `format-card.tsx`** — reads `formatBreakdown` + `keyMetrics.dominantFormat`, renders headline + horizontal bars/donut + verdict
3. **Wire both into `report-overview-block.tsx`** as Zone D (after Engagement card, before Top Posts)
4. **Visual QA** at 375px and 1280px
5. **Edge cases** — test with 0 posts, 1 post, missing heatmap
