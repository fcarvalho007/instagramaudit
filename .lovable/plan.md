
# Replace P07 with AI Visual Cover Analysis Card

## 1. Current P07 Audit

**Location:** `src/components/report-redesign/v2/report-diagnostic-block.tsx`, lines 445-501 (`renderObjectiveCard`).

**What it does:** Card Q07 "Que objetivo estratégico parece estar por trás?" — deterministic synthesis from content type, funnel, integration, and bio. Rendered in Group D ("Contexto estratégico") alongside Q06 (Integration).

**Safe to remove/replace:** Yes.
- It is rendered conditionally (returns null if `!r.available || !r.primary`).
- Group D contains Q06 + Q07. Removing Q07 leaves Q06 alone or Group D empty (both safe).
- No other component imports `renderObjectiveCard`.
- The `DiagnosticObjectiveSynthesis` sub-component in `report-diagnostic-card.tsx` becomes orphaned — can be removed.
- `inferProbableObjective` in `block02-diagnostic.ts` becomes unused — can stay for now.
- PDF pipeline (`report-document.tsx`) does not render individual P-cards; it uses the flat AI insights blocks. No impact.
- Report shell, CTA, priorities — no dependency on Q07 specifically.

## 2. Thumbnail Data Readiness

| Check | Status | Detail |
|---|---|---|
| `thumbnail_url` in post payload | **PASS** | `SnapshotPayload.posts[].thumbnail_url` present |
| Proxy route | **PASS** | `/api/public/ig-thumb?url=...` exists in `src/routes/api/public/ig-thumb.ts` |
| Mapped to enriched posts | **PASS** | `thumbnailUrl` mapped via proxy in `snapshot-to-report-data.ts` lines 422-423, 1213-1214, 1279-1280 |
| Already rendered in report | **PASS** | Used in `report-post-comparison.tsx` and `report-top-posts.tsx` |
| Available in `payload.posts` passed to Block 02 | **PASS** | `report-diagnostic-block.tsx` receives `payload` with full posts array |
| Thumbnails persist in cache | **PASS** | URLs stored in `analysis_snapshots.normalized_payload.posts[].thumbnail_url` |
| Post count per analysis | ~12 posts | Sufficient for the 4x3 grid |

## 3. AI Vision Capability Assessment

| Check | Status | Detail |
|---|---|---|
| OpenAI API key | **PASS** | `OPENAI_API_KEY` configured as secret |
| OpenAI insights pipeline | **PASS** | `src/lib/insights/openai-insights.server.ts` — full pipeline with allowlist, daily cap, cost logging, provider_call_logs |
| Lovable AI Gateway | **PASS** | `LOVABLE_API_KEY` available; Gemini models support vision (image URLs in messages) |
| Vision-capable model | **PASS** | `google/gemini-2.5-flash` and `google/gemini-2.5-pro` accept image inputs natively |
| Cost logging infrastructure | **PASS** | `provider_call_logs` table already tracks OpenAI calls |
| Cache for AI results | **PASS** | Results can be persisted in `analysis_snapshots.normalized_payload` alongside existing `ai_insights_v1`/`ai_insights_v2` |

**Preferred AI provider:** Lovable AI Gateway with `google/gemini-2.5-flash` (vision-capable, cost-effective, no extra API key needed). Falls back to OpenAI vision if needed.

## 4. Recommended Implementation Strategy

**Option C — Hybrid progressive** (recommended).

**Phase 1** (this prompt cycle):
- Remove Q07 `renderObjectiveCard` from Group D.
- Create `visual-cover-analysis-card.tsx` component.
- Build the full UI card with graceful fallback when AI data is absent:
  - Grid of 12 thumbnails (already available via proxy).
  - Placeholder state: "Análise visual indisponível — aguarda processamento IA."
  - All layout, scoring bars, diagnostic callout structure.
- Add a new Group E "Análise visual" in the diagnostic block with the new card.

**Phase 2** (next prompt cycle):
- Create server function or server route `src/routes/api/analyze-visual-covers.ts`.
- Sends 12 thumbnail URLs to Lovable AI Gateway (Gemini 2.5 Flash) with structured output (tool calling).
- Returns `VisualCoverAnalysis` JSON.
- Persist result in snapshot payload as `visual_cover_analysis`.
- Wire cached result into the card.
- Add cost logging to `provider_call_logs`.

**Rationale:** Phase 1 delivers the visible card immediately with real thumbnails. Phase 2 adds AI scoring without blocking the UI work. The card degrades gracefully when AI data is absent.

## 5. Proposed JSON Schema

```ts
type VisualCoverAnalysis = {
  analyzedCount: number;
  overallScore: number; // 0-100
  status: "strong" | "needs_improvement" | "critical";
  summary: string;
  subScores: {
    recognizability: number; // 0-100
    colorCoherence: number;
    composition: number;
    visualVariety: number;
    textDensity: number; // inverse: high text = low score
  };
  thumbnails: Array<{
    postId: string;
    thumbnailUrl: string;
    visualScore: number;
    status: "good" | "medium" | "weak";
    hasHumanPresence: boolean;
    hasReadableText: boolean;
    dominantColors: string[]; // hex values
    notes: string;
  }>;
  aggregate: {
    humanPresencePct: number;
    textInImagePct: number;
    dominantPalette: string[]; // top 5 hex
    repeatedTemplateCount: number;
    repeatedTemplateNote: string | null;
  };
  diagnostic: {
    main: string;
    works: string;     // FUNCIONA
    critical: string;  // PONTO CRÍTICO
    watch: string;     // A OBSERVAR
  };
};
```

**Scoring rules:**
- All sub-scores are AI-determined (Gemini vision analysis of the grid).
- `overallScore` = weighted average of sub-scores (recognizability 25%, colorCoherence 20%, composition 25%, visualVariety 15%, textDensity 15%).
- `status`: strong >= 70, needs_improvement >= 40, critical < 40.
- `hasHumanPresence` and `hasReadableText` are binary per-thumbnail AI classifications.
- `dominantColors` extracted per thumbnail by AI.
- Nothing is deterministic except the aggregation math.

## 6. Cost and Performance

- **Images per call:** 12 thumbnails sent as URLs (no base64 needed; Gemini accepts URLs).
- **Downscaling:** Thumbnails from IG are already ~640px. Proxy can add resize if needed.
- **Estimated cost:** ~$0.01-0.03 per analysis (Gemini 2.5 Flash vision pricing).
- **Cache:** Result stored in snapshot payload; never re-analyzed unless snapshot refreshes.
- **Retry/fallback:** If AI call fails, card shows "indisponível" state with thumbnail grid only.
- **Pro-only consideration:** Not needed at current cost level. Can gate later via `app_config`.

## 7. Files to Edit

### Phase 1 (UI card + P07 removal)

| File | Action |
|---|---|
| `src/components/report-redesign/v2/report-diagnostic-block.tsx` | Remove `renderObjectiveCard` from Group D. Add Group E with new visual cover card. Remove unused imports. |
| `src/components/report-redesign/v2/visual-cover-analysis-card.tsx` | **NEW** — Full card component with thumbnail grid, score panel, "what AI sees" row, methodology, diagnostic callout. |
| `src/components/report-redesign/v2/report-diagnostic-card.tsx` | Remove `DiagnosticObjectiveSynthesis` export (orphaned). |

### Phase 2 (AI pipeline — separate prompt)

| File | Action |
|---|---|
| `src/routes/api/analyze-visual-covers.ts` | **NEW** — Server route calling Lovable AI Gateway. |
| `src/lib/report/snapshot-to-report-data.ts` | Map `visual_cover_analysis` from payload to enriched data. |
| `src/lib/report/visual-cover-types.ts` | **NEW** — TypeScript types for `VisualCoverAnalysis`. |
| `src/routes/api/analyze-public-v1.ts` | Trigger visual analysis after main analysis (optional, can be lazy). |

### Files NOT touched
- Block 1 components, P03 Hashtags, P04 Captions, P05 Conversation
- PDF pipeline (`report-document.tsx`)
- Global tokens (`tokens.css`, `tokens-light.css`)
- Locked files per `LOCKED_FILES.md`
- Auth/admin (no new Edge Function needed — server route suffices)

## 8. Risks and Mitigation

| Risk | Mitigation |
|---|---|
| Thumbnail URLs expired in cache | Proxy route already handles this; fallback gradient exists |
| AI vision call fails | Card renders thumbnail grid with "indisponível" state |
| Cost spike from heavy usage | Existing `OPENAI_DAILY_CAP_USD` pattern can be replicated for Lovable AI |
| Gemini refuses IG content | Fallback to OpenAI vision; unlikely with thumbnail-level content |
| Large payload bloat | `VisualCoverAnalysis` JSON is ~2-4KB; negligible |

## 9. Implementation Phasing

**Split into 2 prompts:**

1. **Prompt 1:** Build the full UI card with real thumbnails, placeholder AI state, remove P07. Testable immediately.
2. **Prompt 2:** Add Lovable AI Gateway server route, structured output extraction, cache integration, cost logging. Card becomes fully functional.

This avoids a single massive change and allows visual QA before wiring AI.
