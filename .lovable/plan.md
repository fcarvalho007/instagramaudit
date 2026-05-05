
# Phase 2 — Visual Cover Analysis via OpenAI Vision

## Audit Summary

**Existing OpenAI integration found:**
- `src/lib/insights/openai-insights.server.ts` — direct `fetch` to `https://api.openai.com/v1/chat/completions` (no SDK, no Lovable AI Gateway)
- `src/lib/insights/cost.ts` — token cost calculator with pricing table
- `src/lib/security/openai-allowlist.ts` — kill-switch (`OPENAI_ENABLED`), testing-mode allowlist (`OPENAI_ALLOWLIST`), daily cap
- `src/lib/analysis/events.ts` — `recordProviderCall` for cost ledger
- `OPENAI_API_KEY` secret is configured and active

**Current model:** `gpt-5.4-mini` (default). For vision, we will use the same model since GPT-5.x supports image inputs natively.

**No Lovable AI Gateway or Gemini usage.** Confirmed.

---

## Architecture

```text
report-diagnostic-block.tsx
  └─ passes `analysis={visualCoverData}` to VisualCoverAnalysisCard
       ↑
  snapshotToReportData() reads `payload.visual_cover_analysis`
       ↑
  normalized_payload persisted in analysis_snapshots table
       ↑
  generateVisualCoverAnalysis() — new server module
       ↑
  OpenAI Chat Completions API (vision) — thumbnail URLs as image_url content
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/report/visual-cover-analysis.server.ts` | Server-only: builds prompt, calls OpenAI vision, returns `VisualCoverAnalysis` |
| `src/lib/report/visual-cover-prompt.ts` | System prompt + JSON schema for structured output |

## Files to Edit

| File | Change |
|------|--------|
| `src/lib/insights/cost.ts` | Add vision pricing entry (image tokens) |
| `src/lib/report/snapshot-to-report-data.ts` | Read `payload.visual_cover_analysis` and pass to report data |
| `src/components/report-redesign/v2/report-diagnostic-block.tsx` | Pass the parsed `visualCoverAnalysis` instead of hardcoded `null` |
| `src/routes/api/analyze-public-v1.ts` (or wherever enrichment runs) | Call `generateVisualCoverAnalysis` and persist result in `normalized_payload.visual_cover_analysis` |

## Files NOT Touched

All locked files, auth, admin, PDF, tokens, P01–P06 cards, edge functions, Lovable AI Gateway.

---

## Implementation Steps

### Step 1 — Vision prompt and JSON schema
Create `src/lib/report/visual-cover-prompt.ts`:
- System prompt: "Act as a senior visual strategist / art director for Instagram feeds..."
- Portuguese from Portugal, neutral consultant language, no "tu/teu/deves"
- JSON schema matching `VisualCoverAnalysis` type with `strict: true`
- Scoring weights: recognizability 25%, colorCoherence 20%, composition 25%, visualVariety 15%, textDensity 15%

### Step 2 — Server-side vision call
Create `src/lib/report/visual-cover-analysis.server.ts`:
- Same pattern as `openai-insights.server.ts`: gated by `isOpenAiAllowed`, daily cap, `OPENAI_API_KEY`
- Build messages array with thumbnail URLs as `image_url` content parts (up to 12 images)
- Use proxied URLs via `/api/public/ig-thumb` so OpenAI can fetch them
- Use `response_format: { type: "json_schema" }` for structured output
- Timeout 45s (vision is slower than text)
- `recordProviderCall` for cost tracking
- Return `VisualCoverAnalysis | null`

### Step 3 — Pricing for vision tokens
Update `src/lib/insights/cost.ts`:
- Add image token estimation (each thumbnail ~85 tokens at low detail, or ~765 at high detail — we'll use `detail: "low"` to save cost)

### Step 4 — Persistence and caching
In the enrichment flow (where `ai_insights_v2` is generated):
- After insights generation, call `generateVisualCoverAnalysis` if `payload.visual_cover_analysis` is absent
- Store result at `normalized_payload.visual_cover_analysis`
- Skip if already present (cache hit)

### Step 5 — Data flow to UI
- `snapshotToReportData.ts`: read `payload.visual_cover_analysis` and expose it in report data
- `report-diagnostic-block.tsx`: pass parsed data instead of `null`

### Step 6 — Fallback
If OpenAI fails or returns null:
- Card renders thumbnails grid only
- Shows "Análise visual indisponível"
- No crash, no broken report

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Proxied thumbnail URLs may expire before OpenAI fetches them | Use absolute URLs through `/api/public/ig-thumb`; if a thumbnail fails, OpenAI still analyzes the rest |
| Vision calls are more expensive than text | Use `detail: "low"` (~85 tokens/image); 12 images ≈ 1,020 image tokens. Total cost per call ~$0.01–0.03 |
| Vision calls are slower (10–20s) | 45s timeout; runs async in enrichment pipeline, not blocking report render |
| Daily cap may be reached faster | Vision costs are modest; existing $5/day cap should suffice |

## Cost Estimate

With `gpt-5.4-mini` at `detail: "low"`:
- ~1,000 image tokens + ~500 prompt tokens + ~800 output tokens
- ≈ $0.005 per analysis (well within daily cap)

---

## Confirmation

- **No Lovable AI Gateway** — direct OpenAI API only
- **No Gemini** — not introduced
- **No second AI provider** — same OpenAI integration
- **No API keys in frontend** — server-only `.server.ts` file
- **No changes to locked files**
