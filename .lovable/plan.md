
# Comment Intelligence — Status

## Completed

1. **Comment scraper budget** — Fixed 10 comments/post, $0.25 hard cap, 120 max total
2. **Comment intelligence component** — TransparencyStrip, 6 unavailable reasons, signal chips, brand reply classification
3. **UI wiring** — snapshot adapter → enriched.commentIntelligence → diagnostic block Q05 → CommentIntelligenceSection/Unavailable
4. **Event-based cost attribution** — linkProviderCallsToEvent called in analyze-public-v1.ts, admin breakdown queries by analysis_event_id first
5. **Admin robustness** — SectionSkeleton/Error/Empty in cost breakdown, mobile-responsive grids (375px safe)

## Pending

1. **Production test** — Activate COMMENT_SCRAPER_ENABLED=true and run a real analysis to validate actual vs estimated costs
2. **Cost reconciliation** — Verify sync-apify-costs cron reconciles provider_call_logs correctly
