# AGENTS

- Empty provider results are classified via `src/lib/analysis/negative-cache.ts` (PROFILE_UNREADABLE when the router fell back) and every failed provider attempt is logged — so silent fallbacks and repeat paid calls stay visible.

- Restricted profiles (`PROFILE_RESTRICTED`) get a best-effort partial card (name + public counters) read from the public Instagram page via `restricted-profile.functions.ts`; it only answers for handles with a recent restricted event, never reads posts, and degrades silently to the plain error screen — so it cannot be used as an open proxy.
