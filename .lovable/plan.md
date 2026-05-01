
# Refine Block 02 · Q06 "Resposta do público"

## Root cause

Two issues create the contradictory state:

1. **`classifyAudienceResponse`** (line 495): `typeof p.likes === "number" ? p.likes : 0` coerces `null` to `0`, then `if (likes <= 0 && comments <= 0) continue` skips posts where fields are genuinely missing AND posts where values are legitimately 0. When all posts have `null` likes/comments, `counted` stays 0 and the function returns `available: false` — correct. But when some have real values of 0 alongside others with `null`, it conflates the two.

2. **`DiagnosticAudienceHighlight`** (line 516): when avgLikes=0 and avgComments=0, it renders "Sem dados de gostos/comentários" — but the parent card already renders with label "Audiência silenciosa" from the classifier. This creates the contradiction.

## Plan

### 1. Fix `classifyAudienceResponse` in `block02-diagnostic.ts`

- Distinguish `null`/`undefined` (missing) from `0` (valid zero).
- Track `postsWithEngagementData` — posts where at least one of `likes`/`comments` is a `number` (including 0).
- Track `postsWithComments` — posts where `comments >= 1`.
- Add `totalLikes`, `totalComments`, `postsWithComments`, `analysedPosts` to the result.
- Add `topConversationPost` — the post with the most comments (if any), with a caption excerpt.
- Add status `"concentrated"` when comments cluster in 1-2 posts.

Updated `AudienceResponseResult`:

```ts
export interface AudienceResponseResult {
  available: boolean;
  label: AudienceResponseLabel;
  status: "silent" | "moderate" | "active" | "concentrated" | "unavailable";
  commentsToLikesPct: number;
  avgComments: number;
  avgLikes: number;
  sampleSize: number;
  totals: {
    likes: number | null;
    comments: number | null;
    postsWithComments: number;
    analysedPosts: number;
  };
  topConversationPost: {
    index: number;
    comments: number;
    likes: number;
    captionExcerpt: string;
  } | null;
  explanation: string;
}
```

Classification logic:
- No posts with engagement fields → `available: false`, status `"unavailable"`
- Fields exist, comments clustered in 1-2 of 8+ posts → `"concentrated"`
- ratioPct >= 2 AND avgComments >= 10 → `"active"`
- ratioPct >= 0.8 OR avgComments >= 5 → `"moderate"`
- Otherwise → `"silent"`

### 2. Refactor `renderAudienceCard` in `report-diagnostic-block.tsx`

Replace the current card with a 3-area structure:

**A. Dados extraídos** (badge: "Dados extraídos")
- 4 compact stats: total likes, total comments, avg comments/post, posts with comments
- Only shown when `available: true`

**B. Cálculo** (badge: "Cálculo")  
- Response label (e.g. "Audiência silenciosa")
- Deterministic explanation from `result.explanation`

**C. Leitura IA** (badge: "Leitura IA")
- Only shown when AI editorial text exists
- Interpretation of why comments may be low + suggestions
- No AI prompt changes in this iteration — reuse existing `aiInsightsV2` if it has audience-related content

**Unavailable state**: neutral card with "Dados insuficientes" and explanation, no classification, no rose tone.

### 3. Update `DiagnosticAudienceHighlight` in `report-diagnostic-card.tsx`

Remove the contradictory empty state. The highlight now receives pre-validated data and always renders metrics (the parent handles unavailable state by not rendering the card).

### 4. No OpenAI prompt changes

The current AI pipeline is not modified. If `aiInsightsV2` contains audience-relevant text, it will be shown. A dedicated AI audience reading can be added in a future iteration.

## Files

| File | Action |
|------|--------|
| `src/lib/report/block02-diagnostic.ts` | Fix `classifyAudienceResponse`, expand `AudienceResponseResult` interface |
| `src/components/report-redesign/v2/report-diagnostic-block.tsx` | Refactor `renderAudienceCard` with 3-area layout |
| `src/components/report-redesign/v2/report-diagnostic-card.tsx` | Clean up `DiagnosticAudienceHighlight` |

## Not touched

- Providers, Supabase schema, admin, PDF, `/report/example`, locked files
- OpenAI prompt/orchestration
- Other diagnostic cards
