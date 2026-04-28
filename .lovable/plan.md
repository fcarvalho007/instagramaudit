# Plan — PDF export of the public InstaBench report (architecture)

## State of play (read-only audit)

The PDF pipeline already exists end-to-end and is **server-side**:

| Concern | File | Status |
|---|---|---|
| Renderer | `src/lib/pdf/render.ts` | ✔ `@react-pdf/renderer` v4, server-only, avatar prefetch with timeout/cap |
| Document | `src/lib/pdf/report-document.tsx` (442 lines) | ✔ Cover, Profile+KPIs, Benchmark, Competitors. ✘ Missing Top Posts, Market Signals, Recommendations |
| A4 styles | `src/lib/pdf/styles.ts`, `format.ts` | ✔ Tokens-mirrored palette + pt-PT formatters |
| Storage | `src/lib/pdf/storage.ts` | ✔ Bucket `report-pdfs` (private), deterministic path `reports/YYYY/MM/{report_request_id}.pdf` |
| Generate endpoint | `src/routes/api/generate-report-pdf.ts` | ✔ POST, idempotent, `force=true`, no provider re-fetch (snapshot-only) |
| Admin regenerate | `src/routes/api/admin/regenerate-pdf.ts` | ✔ Wraps generate with `force=true` |
| Email delivery | `src/routes/api/send-report-email.ts` | ✔ Reads PDF from storage |
| Lead-gated entry | `src/routes/api/request-full-report.ts` + orchestrator | ✔ Lead → snapshot link → background pipeline |
| Bucket migration | `supabase/migrations/20260417103703_*.sql` | ✔ Bucket created, public=false |

The frontend "Pedir versão PDF" button in `ReportShareActions` is currently disabled (Em breve) and **not wired**. There is no UX path from `/analyze/$username` to the existing pipeline.

## 1. Server-side vs client-side

**Server-side. Keep `@react-pdf/renderer` on the Worker SSR runtime as already implemented.**

Reasons:
- Pipeline is already built, tested, and emitting cleanly through nodejs_compat (see `render.ts` comment block).
- Client-side PDF would require shipping `@react-pdf/renderer` (~1MB+ gzipped) or html2canvas/jsPDF (poor type rendering, heavy CPU on mobile) to every visitor.
- Avatar prefetch + benchmark recompute (`loadBenchmarkReferences`) only work server-side without leaking the service role.
- Same code path serves email-attached PDF and on-demand download — single source of truth.

Do **not** screenshot the web layout (puppeteer/playwright). Worker SSR cannot run them, and "Browser PDF" of a scroll-first dashboard always breaks page boundaries.

## 2. Storage

**Reuse `report-pdfs` bucket (private)** with the existing path scheme:
`reports/{YYYY}/{MM}/{report_request_id}.pdf`

Access for the user is via short-lived signed URLs minted server-side
(`supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 10)` —
10 min). Never expose the bucket publicly. The bucket is already
service-role-only.

## 3. Cache policy by `snapshotId`

The current path keys by `report_request_id`, not snapshot. This is correct for the gated/email flow (one PDF per request row, audit-friendly). For the **public on-demand PDF** triggered from `/analyze/$username` we need a different keying because there is no `report_request` row yet.

Recommendation — introduce a parallel snapshot-keyed path **without changing the existing one**:

`reports/snapshots/{YYYY}/{MM}/{analysis_snapshot_id}.pdf`

- Idempotent: same snapshot → same path → upsert is safe.
- Cache hit check: `HEAD` on storage path. If exists and snapshot `expires_at` not crossed, return signed URL directly (no re-render).
- Invalidation: when a new snapshot is written for the same handle, the old PDF naturally falls out of reach (different snapshot ID); a daily cron can sweep snapshots whose `expires_at < now() - 7d`.
- No new DB table required. Optional later: a `pdf_artifacts` table to track render counts per snapshot for cost telemetry.

## 4. A4 structure

Page-by-page, A4 portrait, 36–48pt margins, fixed header/footer (already implemented for first three sections). New pages flagged ➕:

1. **Cover** — InstaBench mark, "Relatório de análise editorial", `@handle`, generated date, snapshot date, beta tag. *(exists)*
2. **Perfil & KPIs** — Avatar, display name, bio (NEW — wire from snapshot), followers / posts / avg engagement / dominant format, signal interpretation note. *(exists, add bio)*
3. **Benchmark & formatos** — Tier label, gauge value, format breakdown table (Reels/Carrossel/Imagem) with engagement vs benchmark. *(exists)*
4. **Concorrentes** — Comparative table (handle, followers, ER%, delta). *(exists)*
5. ➕ **Top posts** — 3–5 cards: thumbnail (best-effort prefetch with same timeout pattern as avatar), permalink as printed URL, format, ER%, likes, comments, short caption excerpt.
6. ➕ **Sinais de mercado** — DataForSEO-cached signals already in snapshot/cache (do **not** call DataForSEO during render). Branded SERP, related queries, share-of-voice gauge. Render only when signals exist; otherwise omit the page.
7. ➕ **Recomendações & próximos passos** — Editorial bullets derived from existing snapshot heuristics (no AI call): cadence, dominant-format reinforcement, format gap, posting heatmap insight. Closing CTA "Quero acesso Pro" as a printed URL.
8. **Metodologia & footer** — Benchmark source disclaimer (existing copy: *"Benchmark editorial baseado em referências públicas de mercado e dataset interno versionado..."*), snapshot timestamp, dataset version, link to `instagrambench.lovable.app`.

Page header + footer (`fixed`) already paginate correctly; reuse them on new pages.

## 5. Free PDF vs future Paid (Pro) PDF

| Section | Free PDF | Pro PDF (future) |
|---|---|---|
| Cover | ✔ | ✔ (no "beta" tag) |
| Perfil & KPIs | ✔ | ✔ |
| Benchmark | ✔ basic gauge | ✔ + percentile vs cohort |
| Top posts | top 3 | top 10 + caption analysis |
| Concorrentes | up to 2 | up to 5 + delta heatmap |
| Sinais de mercado | branded SERP only | + related queries, SoV chart |
| Recomendações | 4 editorial bullets | full strategic playbook (12+) |
| Heatmap & melhores horas | ✘ | ✔ |
| Hashtags & keywords | ✘ | ✔ |
| AI insights | ✘ | ✔ (Lovable AI Gateway) |
| Watermark | "Versão beta — InstaBench" footer | Clean footer + client name |

Free PDF must never call OpenAI / Lovable AI. Pro PDF can, but must be precomputed and persisted into the snapshot, not invoked at render time (see §7).

## 6. Cost logging

PDF generation cost ≈ Worker CPU + Storage egress; no provider call. Still worth logging for capacity planning.

Recommendation:
- Insert a row into `analysis_events` with a new `data_source = 'pdf'` value and `outcome = 'success' | 'render_failed' | 'cache_hit'` per generation.
  - `estimated_cost_usd` = small constant (≈ $0.0005 placeholder per PDF — Worker CPU-seconds estimate; revisit when CF billing data arrives).
  - `duration_ms` from server timing.
  - `analysis_snapshot_id` set so admin can join.
- Surface in `/admin` cockpit: "PDFs geradas (mês)", "Cache hits PDF", "Render failures PDF", "Custo estimado PDF".
- Do **not** create a new table — `analysis_events` is the canonical event log and already supports nullable `provider_call_log_id`. Future migration could add `pdf_render_logs` if granularity demands it.

## 7. Provider calls during PDF generation

**Strict rule: no DataForSEO, no OpenAI, no Apify call during PDF render.**

The PDF must be a pure function of:
- `analysis_snapshots.normalized_payload` (Apify-derived)
- `loadBenchmarkReferences()` (Supabase-cached benchmark dataset)
- Avatar bytes (best-effort 3s fetch, optional)
- Top-post thumbnails (best-effort 3s fetch each, optional, aggregate cap)

Reasons:
- Cost transparency: PDF must be free of unbounded provider spend.
- Latency: each provider call adds 1–10s and risks Worker subrequest limits (50/req).
- Determinism: re-rendering the same snapshot must yield identical content.

If market signals are needed but missing from the snapshot, the PDF omits that page rather than fetching. Background population of signals is the responsibility of the `analyze` pipeline, not the PDF route.

## 8. Files likely created or edited

### Created
- `src/routes/api/public-report-pdf.ts` — new POST endpoint, `{ snapshot_id }` body, returns `{ signed_url, cached: boolean, expires_at }`. Public route (rate-limited by IP-hash + snapshot binding). **Does NOT touch `report_requests`.**
- `src/lib/pdf/snapshot-cache.ts` — snapshot-keyed path builder + signed-URL helper.
- `src/lib/pdf/sections/top-posts-page.tsx` — new A4 page component.
- `src/lib/pdf/sections/market-signals-page.tsx` — new A4 page component.
- `src/lib/pdf/sections/recommendations-page.tsx` — new A4 page component.
- `src/lib/pdf/recommendations.ts` — pure function: snapshot → editorial bullets (no AI).
- `supabase/migrations/{ts}_pdf_event_source.sql` — extend `analysis_events.data_source` allowed values to include `'pdf'` (if any check exists; currently it's free text, so likely a no-op — verify before writing).

### Edited
- `src/lib/pdf/report-document.tsx` — register the three new pages, add bio to ProfileMetricsPage. **Currently NOT in `LOCKED_FILES.md`, safe to edit.**
- `src/lib/pdf/styles.ts` — add styles for new sections. **Not locked.**
- `src/lib/pdf/render.ts` — extend `RenderArgs` with optional `marketSignals` and `topPosts` (already partly in payload), best-effort thumbnail prefetch with the existing avatar pattern.
- `src/components/report-share/report-share-actions.tsx` — wire "Pedir versão PDF" to the new public endpoint, replace disabled state with loading → download.
- `src/components/report-share/share-copy.ts` — strings for "A gerar PDF…", "PDF pronto", "Falhou — tenta novamente".
- `src/lib/orchestration/run-report-pipeline.ts` — already calls `generate-report-pdf`; no change unless we share the snapshot-cache helper.

### Explicitly NOT touched (locked or out of scope)
- `LOCKED_FILES.md` and everything listed there (notably `/src/routes/report.example.tsx` and all `src/components/report/*`).
- `src/integrations/supabase/types.ts`, `client.ts`, `client.server.ts`.
- `src/routeTree.gen.ts`.
- `src/routes/api/generate-report-pdf.ts` (works for the gated email flow; leave it alone).
- `src/routes/api/send-report-email.ts`, `src/routes/api/request-full-report.ts`.

## 9. Risks

| Risk | Mitigation |
|---|---|
| **Font rendering** — `@react-pdf` ships only Helvetica/Times/Courier by default; project fonts are Fraunces/Inter/JetBrains Mono. | Existing `styles.ts` already handles this. For new sections, stick to the registered families. Do NOT introduce subscript/superscript Unicode (renders as boxes). |
| **Chart rendering** — Recharts is canvas/SVG-DOM, incompatible with react-pdf. | Avoid charts. Use `<View>` + bars composed from rectangles (existing benchmark gauge pattern). Top posts: text + thin row separators, no plots. |
| **Instagram CDN expiry** — `cdninstagram.com` URLs expire (~24h). Avatars and thumbnails will 404 in stale snapshots. | Best-effort fetch with 3s timeout + graceful initials/placeholder fallback (already implemented for avatar). Apply the same pattern to thumbnails. Never block render on image failure. |
| **Long PDF generation in Worker runtime** — CF Workers cap at 30s CPU + 50 subrequests. 5 thumbnail fetches + render is borderline. | Hard cap thumbnail fetches: 3 parallel, 3s each, total ≤6s. If a fetch slot exceeds budget, drop it. Measure render duration in `analysis_events.duration_ms` and alert if p95 > 15s. |
| **Cost transparency** — silent re-renders inflate cost without trace. | Always log to `analysis_events` with `data_source='pdf'` and `outcome` field. Never re-render when snapshot path exists in storage. Cron sweep of orphan snapshot PDFs > 30 days. |
| **Quota abuse from public endpoint** — anon visitor could spam PDF generation. | Rate-limit by IP-hash + snapshot_id (e.g. 3 PDFs / IP / hour, 1 PDF / snapshot / IP / day). Use existing `request_ip_hash` pattern from `analysis_events`. Cache hits do not count toward limit. |
| **Worker module bundling** — `@react-pdf/renderer` already works, but section additions could pull in node-only deps. | Keep all new section files pure presentational (`<Document>` primitives only). No `fs`, no `Buffer`, no native deps. |

## 10. First implementation prompt (after this plan is approved)

> **"Add Top Posts page to the existing PDF document."**
>
> Scope: edit `src/lib/pdf/report-document.tsx` and `src/lib/pdf/styles.ts` to add a new `TopPostsPage` after `CompetitorsPage`. Render up to 3 posts from `content_summary.top_posts` (verify field name from `PublicAnalysisContentSummary`). For each post: thumbnail (best-effort prefetch with same 3s/1.5MB pattern as avatar, parallel cap=3, fallback to a tinted placeholder rectangle), format badge, ER%, likes, comments, 140-char caption excerpt, and the permalink as visible printed text. Reuse `PageHeader`/`PageFooter`. No new endpoints, no provider calls, no schema changes. Verify with `bunx tsc --noEmit` and a one-shot local render against the existing test snapshot.
>
> Out of scope: public download endpoint, snapshot-keyed cache, market signals page, recommendations page, share-actions wiring. Those follow in subsequent prompts.

This first prompt extends the existing render path without touching API routes, locked files, or storage — lowest-risk way to validate the data shape and Worker render budget before exposing the public endpoint.

## Summary

The PDF stack already exists and is server-side, snapshot-pure, and admin-wired. The work is **not** "build PDF export"; it is:
1. **Extend** the document with 3 missing pages (Top Posts, Market Signals, Recommendations).
2. **Add** a snapshot-keyed public endpoint + signed URL flow so `/analyze/$username` can offer on-demand download without going through the email-gated `report_requests` flow.
3. **Wire** the existing "Pedir versão PDF" button.
4. **Log** each render in `analysis_events` for cost visibility.

No locked files modified. No provider calls during render. No migration required for v1 (snapshot-keyed path lives in the existing private bucket).
