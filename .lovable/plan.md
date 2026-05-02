
## Plan: Admin Cost Card for Comment Scraper

### What changes

**1. Server: New query + API endpoint**

File: `src/lib/admin/system-queries.server.ts`
- Add `COMMENT_SCRAPER_ENABLED` to `SECRET_NAMES` array (line ~146)
- Add new interface `CommentScraperMetrics` with fields: `total_cost_usd`, `run_count`, `comments_returned`, `avg_cost_per_run`, `avg_cost_per_1k_comments`, `last_run_status`, `last_run_at`, `enabled`, `max_charge_usd`, `max_posts`, `max_comments_per_post`
- Add new function `fetchCommentScraperMetrics(sinceIso: string)` that queries `provider_call_logs` filtered by `actor = 'apify/instagram-comment-scraper'`

File: `src/routes/api/admin/sistema.comment-scraper.ts` (new)
- GET endpoint returning `CommentScraperMetrics` for the last 30 days
- Protected by `requireAdminSession()`

**2. UI: New section in CostsDetailSection**

File: `src/components/admin/v2/sistema/comment-scraper-card.tsx` (new)
- Standalone component `CommentScraperCard` that:
  - Fetches from `/api/admin/sistema/comment-scraper`
  - Shows status indicator (green/amber/slate/rose based on enabled + last run)
  - Displays KPI grid: total cost, runs, comments, avg cost/run, avg cost/1K comments
  - Shows guardrails: max charge ($3.00), max posts (12), max comments/post (50)
  - Shows feature flag status (enabled/disabled)
  - Empty state: "Sem execuções registadas. A análise de comentários ainda não foi usada neste período."
  - Source note: "Os dados apresentados vêm dos logs de provider; não incluem estimativas externas."

File: `src/components/admin/v2/sistema/costs-detail-section.tsx`
- Import and render `<CommentScraperCard />` after the existing KPIs grid and before the provider calls table

### Files touched
| File | Action |
|------|--------|
| `src/lib/admin/system-queries.server.ts` | Edit: add secret name + new query function |
| `src/routes/api/admin/sistema.comment-scraper.ts` | Create: API endpoint |
| `src/components/admin/v2/sistema/comment-scraper-card.tsx` | Create: UI card |
| `src/components/admin/v2/sistema/costs-detail-section.tsx` | Edit: mount new card |

### Not changed
- Comment scraper pipeline
- Pricing/payments
- Locked files
- No new database tables
