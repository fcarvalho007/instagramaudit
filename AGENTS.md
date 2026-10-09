# AGENTS

- Empty provider results are classified via `src/lib/analysis/negative-cache.ts` (PROFILE_UNREADABLE when the router fell back) and every failed provider attempt is logged — so silent fallbacks and repeat paid calls stay visible.
