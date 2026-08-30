/**
 * Provider layer entry point (server-only).
 *
 * Everything goes through the router: it owns provider selection per
 * operation and the bidirectional single-attempt fallback.
 */

export {
  apifyProvider,
  fallbackProviderFor,
  fetchComments,
  fetchPosts,
  fetchProfile,
  isFallbackEnabled,
  isProviderSideFailure,
  isScrapeCreatorsConfigured,
  mergeCommentResults,
  scrapeCreatorsProvider,
  selectProvider,
} from "./router.server";

export type { ProviderOperation } from "./types";
