/**
 * Provider router (server-only).
 *
 * Single entry point for profile / posts / comments. Picks the primary
 * provider per OPERATION from the environment, and falls back to the other
 * provider ONCE when the failure is provider-side (billing, quota, rate
 * limit, upstream error, timeout, budget cap). Validation failures never
 * trigger a second paid call, and no operation ever tries more than two
 * providers.
 *
 * Defaults (post Provider Parity Test): ScrapeCreators primary everywhere,
 * Apify as fallback. Invertible with SOCIAL_PROVIDER_{PROFILE,POSTS,COMMENTS}.
 */

import { apifyProvider } from "./apify.server";
import { scrapeCreatorsProvider } from "./scrapecreators.server";
import type {
  FetchCommentsOptions,
  FetchPostsOptions,
  ProviderCommentBatch,
  ProviderCommentsResult,
  ProviderId,
  ProviderOperation,
  ProviderPostsResult,
  ProviderProfileResult,
  SocialDataProvider,
} from "./types";

const PROVIDERS: Record<ProviderId, SocialDataProvider> = {
  apify: apifyProvider,
  scrapecreators: scrapeCreatorsProvider,
};

const ENV_BY_OPERATION: Record<ProviderOperation, string> = {
  profile: "SOCIAL_PROVIDER_PROFILE",
  posts: "SOCIAL_PROVIDER_POSTS",
  comments: "SOCIAL_PROVIDER_COMMENTS",
};

function readProvider(name: string, fallback: ProviderId): ProviderId {
  const raw = (process.env[name] ?? "").trim().toLowerCase();
  return raw === "apify" || raw === "scrapecreators" ? raw : fallback;
}

export function isScrapeCreatorsConfigured(): boolean {
  return scrapeCreatorsProvider.isConfigured();
}

/**
 * Which provider should handle this operation right now. Falls back to the
 * other provider whenever the configured one has no credentials, so a
 * missing key can never break the analysis flow.
 */
export function selectProvider(operation: ProviderOperation): ProviderId {
  const configured = readProvider(
    ENV_BY_OPERATION[operation],
    "scrapecreators",
  );
  const other: ProviderId =
    configured === "apify" ? "scrapecreators" : "apify";
  if (!PROVIDERS[configured].isConfigured() && PROVIDERS[other].isConfigured()) {
    return other;
  }
  return configured;
}

export function isFallbackEnabled(): boolean {
  return (
    (process.env.SOCIAL_PROVIDER_FALLBACK ?? "true").toLowerCase() !== "false"
  );
}

/** The alternative provider for `primary`, or null when unusable. */
export function fallbackProviderFor(primary: ProviderId): ProviderId | null {
  if (!isFallbackEnabled()) return null;
  const other: ProviderId = primary === "apify" ? "scrapecreators" : "apify";
  return PROVIDERS[other].isConfigured() ? other : null;
}

const BUDGET_ERROR_NAMES = new Set([
  "BudgetExceededError",
  "MonthlyBudgetExceededError",
  "Window90dBudgetExceededError",
  "ProWindowBudgetExceededError",
]);

const PROVIDER_FAILURE_PATTERNS = [
  "platform-feature-disabled",
  "billing",
  "invoice",
  "payment",
  "quota",
  "insufficient",
  "credits exhausted",
  "out of credits",
  "no credits",
  "rate limit",
  "too many requests",
  "timeout",
  "timed out",
  "aborted",
  "budget_exceeded",
  "window_90d_budget_exceeded",
  "pro_window_budget_exceeded",
  "monthly cap",
  "soft cap",
  "hard cap",
];

/**
 * Provider-side failures worth retrying on the other provider. Validation
 * errors (bad handle, private profile) must NOT trigger a second paid call.
 */
export function isProviderSideFailure(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error && BUDGET_ERROR_NAMES.has(error.name)) return true;

  const code = (error as { code?: unknown }).code;
  if (
    typeof code === "string" &&
    PROVIDER_FAILURE_PATTERNS.some((p) => code.toLowerCase().includes(p))
  ) {
    return true;
  }

  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") {
    if (status === 402 || status === 403 || status === 429) return true;
    if (status >= 500) return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return PROVIDER_FAILURE_PATTERNS.some((p) => message.includes(p));
}

interface AttemptOutcome<T> {
  result: T;
  provider: ProviderId;
  fellBack: boolean;
}

/** Run `fn` on the primary provider, with at most ONE fallback attempt. */
async function withFallback<T>(
  operation: ProviderOperation,
  fn: (provider: SocialDataProvider) => Promise<T>,
): Promise<AttemptOutcome<T>> {
  const primary = selectProvider(operation);
  try {
    return {
      result: await fn(PROVIDERS[primary]),
      provider: primary,
      fellBack: false,
    };
  } catch (err) {
    const alternative = fallbackProviderFor(primary);
    if (!alternative || !isProviderSideFailure(err)) throw err;
    console.warn(
      `[providers] ${primary} ${operation} failed, falling back to ${alternative}:`,
      err instanceof Error ? err.message : String(err),
    );
    return {
      result: await fn(PROVIDERS[alternative]),
      provider: alternative,
      fellBack: true,
    };
  }
}

export async function fetchProfile(
  handle: string,
): Promise<ProviderProfileResult> {
  const { result } = await withFallback("profile", (p) =>
    p.fetchProfile(handle),
  );
  return result;
}

export async function fetchPosts(
  handle: string,
  options: FetchPostsOptions,
): Promise<ProviderPostsResult> {
  const { result } = await withFallback("posts", (p) =>
    p.fetchPosts(handle, options),
  );
  return result;
}

/**
 * Comments are fetched per post, so the fallback is partial: only the posts
 * the primary provider could not serve go to the alternative, and comments
 * already collected are never duplicated.
 */
export async function fetchComments(
  postUrls: string[],
  options: FetchCommentsOptions,
): Promise<ProviderCommentsResult> {
  if (postUrls.length === 0) {
    return {
      ...(await PROVIDERS[selectProvider("comments")].fetchComments(
        [],
        options,
      )),
    };
  }

  const primaryId = selectProvider("comments");
  let primaryResult: ProviderCommentsResult | null = null;
  let pending: string[] = postUrls;

  try {
    primaryResult = await PROVIDERS[primaryId].fetchComments(postUrls, options);
    pending = primaryResult.failedPostUrls;
  } catch (err) {
    if (!isProviderSideFailure(err)) throw err;
    console.warn(
      `[providers] ${primaryId} comments failed entirely:`,
      err instanceof Error ? err.message : String(err),
    );
  }

  const alternative = fallbackProviderFor(primaryId);
  if (pending.length === 0 || !alternative) {
    if (primaryResult) return primaryResult;
    throw new Error("Comment fetch failed and no fallback provider available");
  }

  const fallbackResult = await PROVIDERS[alternative].fetchComments(
    pending,
    options,
  );

  if (!primaryResult) return fallbackResult;
  return mergeCommentResults(primaryResult, fallbackResult);
}

/** Merge two comment results, de-duplicating by comment id. */
export function mergeCommentResults(
  a: ProviderCommentsResult,
  b: ProviderCommentsResult,
): ProviderCommentsResult {
  const byPost = new Map<string, ProviderCommentBatch>();
  const seenIds = new Set<string>();

  for (const batch of [...a.batches, ...b.batches]) {
    const existing = byPost.get(batch.postUrl) ?? {
      postUrl: batch.postUrl,
      comments: [],
    };
    for (const comment of batch.comments) {
      if (comment.id && seenIds.has(comment.id)) continue;
      if (comment.id) seenIds.add(comment.id);
      existing.comments.push(comment);
    }
    byPost.set(batch.postUrl, existing);
  }

  const servedUrls = new Set(byPost.keys());
  const sum = (x: number | null, y: number | null) =>
    x === null && y === null ? null : (x ?? 0) + (y ?? 0);

  return {
    provider: a.provider,
    runId: a.runId ?? b.runId,
    endpoint: a.endpoint,
    billedResults: a.billedResults + b.billedResults,
    creditsConsumed: sum(a.creditsConsumed, b.creditsConsumed),
    creditsRemaining: b.creditsRemaining ?? a.creditsRemaining,
    cached: a.cached && b.cached,
    actualCostUsd: sum(a.actualCostUsd, b.actualCostUsd),
    monetaryCostUsd: sum(a.monetaryCostUsd, b.monetaryCostUsd),
    batches: Array.from(byPost.values()),
    failedPostUrls: [...a.failedPostUrls, ...b.failedPostUrls].filter(
      (u) => !servedUrls.has(u),
    ),
    groupedByPost: a.groupedByPost && b.groupedByPost,
  };
}

export { apifyProvider, scrapeCreatorsProvider };
