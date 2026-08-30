/**
 * ScrapeCreators adapter (server-only).
 *
 * Endpoints used:
 *   GET /v1/instagram/profile?handle=<h>
 *   GET /v2/instagram/user/posts?handle=<h>[&next_max_id=<cursor>]
 *   GET /v2/instagram/post/comments?url=<post url>&amount=<n>
 *
 * The posts endpoint paginates by cursor, which is the reason this provider
 * exists: unlike the Apify actor in `details` mode, it can walk back a real
 * 30/90-day window instead of stopping at the 12 most recent publications.
 *
 * Every row returned here is translated into the Apify row shape consumed by
 * `normalizeProfile` / `normalizePost`. Fields ScrapeCreators does not expose
 * are omitted so downstream blocks flag them as not measurable instead of
 * showing a fake zero.
 *
 * Cost model: ScrapeCreators bills CREDITS, not USD. While the promotional
 * credits are in use `monetaryCostUsd` is 0 and only `creditsConsumed` moves.
 * Set SCRAPECREATORS_COST_PER_CREDIT_USD once a real pack is purchased.
 */

import {
  emptyMeta,
  type FetchCommentsOptions,
  type FetchPostsOptions,
  type ProviderCommentBatch,
  type ProviderCommentRow,
  type ProviderCommentsResult,
  type ProviderPostRow,
  type ProviderPostsResult,
  type ProviderProfileResult,
  type SocialDataProvider,
} from "./types";

function baseUrl(): string {
  return process.env.SCRAPECREATORS_BASE_URL ?? "https://api.scrapecreators.com";
}

/** USD per credit. Zero (promotional credits) until explicitly configured. */
export function getCostPerCreditUsd(): number {
  const raw = process.env.SCRAPECREATORS_COST_PER_CREDIT_USD;
  const parsed = raw ? Number.parseFloat(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/** Acceptable provider-side cache age, in seconds. 0/absent → live data. */
function cacheMaxAgeSeconds(): number {
  const raw = process.env.SCRAPECREATORS_CACHE_MAX_AGE_SECONDS;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** Safety net so a broken cursor can never loop forever. */
const MAX_PAGES = 12;

export class ScrapeCreatorsError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "ScrapeCreatorsError";
  }
}

function apiKey(): string | null {
  const key = process.env.SCRAPECREATORS_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

export interface CallTelemetry {
  creditsCharged: number | null;
  creditsRemaining: number | null;
  cached: boolean;
}

interface CallResult {
  payload: Record<string, unknown>;
  telemetry: CallTelemetry;
}

function headerNumber(res: Response, ...names: string[]): number | null {
  for (const name of names) {
    const raw = res.headers?.get(name) ?? null;
    if (raw === null) continue;
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}


async function getJson(
  path: string,
  params: Record<string, string>,
  timeoutMs: number,
): Promise<CallResult> {
  const key = apiKey();
  if (!key) {
    throw new ScrapeCreatorsError("SCRAPECREATORS_API_KEY em falta", null);
  }
  const url = new URL(path, baseUrl());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const maxAge = cacheMaxAgeSeconds();
  if (maxAge > 0 && !url.searchParams.has("cache_max_age")) {
    url.searchParams.set("cache_max_age", String(maxAge));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      headers: { "x-api-key": key, accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new ScrapeCreatorsError(
        `ScrapeCreators ${res.status}: ${body.slice(0, 200)}`,
        res.status,
      );
    }
    const payload = (await res.json()) as Record<string, unknown>;
    const cached =
      payload.cached === true ||
      (res.headers?.get("x-cache") ?? "").toLowerCase() === "hit";
    const chargedHeader = headerNumber(
      res,
      "x-credits-charged",
      "x-credits-used",
    );
    const charged =
      num(payload.credits_charged) ??
      chargedHeader ??
      (cached ? 0 : null);
    return {
      payload,
      telemetry: {
        creditsCharged: charged,
        creditsRemaining:
          num(payload.credits_remaining) ??
          headerNumber(res, "x-credits-remaining", "x-credits-left"),
        cached,
      },
    };
  } catch (err) {
    if (err instanceof ScrapeCreatorsError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ScrapeCreatorsError(
        `ScrapeCreators timeout após ${timeoutMs}ms`,
        504,
      );
    }
    throw new ScrapeCreatorsError(
      `ScrapeCreators falhou: ${(err as Error).message}`,
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

/** Unwrap the several nesting shapes the API uses across endpoints. */
function unwrapUser(payload: Record<string, unknown>): Record<string, unknown> {
  return (
    asRecord(asRecord(payload.data)?.user) ??
    asRecord(payload.user) ??
    asRecord(payload.data) ??
    payload
  );
}

function countOf(value: unknown): number | null {
  const direct = num(value);
  if (direct !== null) return direct;
  const rec = asRecord(value);
  return rec ? num(rec.count) : null;
}

/** ScrapeCreators user → Apify `details` row. */
export function mapProfile(
  payload: Record<string, unknown>,
): Record<string, unknown> | null {
  const user = unwrapUser(payload);
  const username = str(user.username);
  const followers =
    countOf(user.edge_followed_by) ??
    num(user.follower_count) ??
    num(user.followers);
  if (!username || followers === null) return null;

  return {
    username,
    fullName: str(user.full_name) ?? str(user.fullName),
    biography: str(user.biography),
    followersCount: followers,
    followsCount:
      countOf(user.edge_follow) ??
      num(user.following_count) ??
      num(user.following),
    postsCount:
      countOf(user.edge_owner_to_timeline_media) ??
      num(user.media_count) ??
      num(user.posts_count),
    verified: Boolean(user.is_verified ?? user.verified ?? false),
    profilePicUrlHD: str(user.profile_pic_url_hd) ?? str(user.profile_pic_url),
    profilePicUrl: str(user.profile_pic_url),
    externalUrl: str(user.external_url),
    businessCategoryName: str(user.category) ?? str(user.category_name),
    isBusinessAccount: Boolean(
      user.is_business_account ?? user.is_professional_account ?? false,
    ),
    private: Boolean(user.is_private ?? false),
  };
}

function postArray(payload: Record<string, unknown>): unknown[] {
  const candidates = [
    payload.items,
    payload.posts,
    asRecord(payload.data)?.items,
    asRecord(payload.data)?.posts,
    asRecord(asRecord(payload.data)?.user)?.items,
  ];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
}

function cursorOf(payload: Record<string, unknown>): string | null {
  const data = asRecord(payload.data);
  return (
    str(payload.next_max_id) ??
    str(payload.cursor) ??
    (data ? (str(data.next_max_id) ?? str(data.cursor)) : null)
  );
}

function hasMore(payload: Record<string, unknown>): boolean {
  const data = asRecord(payload.data);
  const flag = payload.more_available ?? data?.more_available;
  return flag === undefined ? cursorOf(payload) !== null : Boolean(flag);
}

function usernameList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const rec = asRecord(item);
    const handle =
      str(item) ??
      (rec ? (str(rec.username) ?? str(asRecord(rec.user)?.username)) : null);
    if (handle) out.push(handle.replace(/^@/, ""));
  }
  return out;
}

/** ScrapeCreators media item → Apify post row. */
export function mapPost(raw: Record<string, unknown>): ProviderPostRow {
  const caption = str(asRecord(raw.caption)?.text) ?? str(raw.caption);
  const takenAt = num(raw.taken_at) ?? num(raw.taken_at_timestamp);
  const shortcode = str(raw.code) ?? str(raw.shortcode);
  const mediaType = num(raw.media_type);
  const productType = str(raw.product_type);
  const isVideo =
    Boolean(raw.is_video) || mediaType === 2 || productType === "clips";

  const type =
    mediaType === 8
      ? "Sidecar"
      : isVideo
        ? "Video"
        : (str(raw.__typename) ?? "Image");

  const carousel = Array.isArray(raw.carousel_media)
    ? raw.carousel_media.length
    : num(raw.carousel_media_count);

  const music = asRecord(asRecord(raw.clips_metadata)?.music_info) ??
    asRecord(raw.music_info);
  const songInfo = asRecord(music?.music_asset_info);

  return {
    id: str(raw.id) ?? str(raw.pk) ?? shortcode,
    shortcode,
    url: shortcode ? `https://www.instagram.com/p/${shortcode}/` : null,
    type,
    productType,
    isVideo,
    caption,
    timestamp: takenAt !== null ? new Date(takenAt * 1000).toISOString() : null,
    likesCount:
      countOf(raw.edge_liked_by) ??
      num(raw.like_count) ??
      num(raw.likes) ??
      null,
    commentsCount:
      countOf(raw.edge_media_to_comment) ??
      num(raw.comment_count) ??
      num(raw.comments) ??
      null,
    // Canonical plays signal. Never map an Apify-style `videoViewCount` here.
    videoPlayCount:
      num(raw.play_count) ?? num(raw.ig_play_count) ?? null,
    videoDuration: num(raw.video_duration),
    displayUrl:
      str(raw.display_url) ??
      str(raw.thumbnail_url) ??
      str(asRecord(asRecord(raw.image_versions2)?.candidates)?.[0]),
    isPinned:
      raw.is_pinned === true ||
      (Array.isArray(raw.timeline_pinned_user_ids) &&
        raw.timeline_pinned_user_ids.length > 0),
    isPaidPartnership: Boolean(
      raw.is_paid_partnership ?? raw.paid_partnership ?? false,
    ),
    carouselMediaCount: carousel,
    coauthorProducers: usernameList(raw.coauthor_producers),
    taggedUsers: usernameList(
      asRecord(raw.usertags)?.in ?? raw.usertags ?? raw.tagged_users,
    ),
    locationName: str(asRecord(raw.location)?.name),
    musicInfo: music
      ? {
          song_name:
            str(songInfo?.title) ?? str(music.song_name) ?? null,
          artist_name:
            str(songInfo?.display_artist) ?? str(music.artist_name) ?? null,
        }
      : null,
    // Experimental / internal only — never surfaced as a user-facing claim.
    genAiDetection:
      raw.is_gen_ai_content ?? asRecord(raw.gen_ai_detection_method) ?? null,
  };
}

/** ScrapeCreators comment item → provider-agnostic comment row. */
export function mapComment(raw: Record<string, unknown>): ProviderCommentRow {
  const createdAt = num(raw.created_at) ?? num(raw.created_at_utc);
  return {
    id: String(str(raw.pk) ?? str(raw.id) ?? ""),
    text: str(raw.text) ?? undefined,
    ownerUsername:
      str(asRecord(raw.user)?.username) ?? str(raw.username) ?? undefined,
    timestamp:
      createdAt !== null
        ? new Date(createdAt * 1000).toISOString()
        : (str(raw.timestamp) ?? undefined),
    likesCount:
      num(raw.comment_like_count) ?? num(raw.like_count) ?? undefined,
    repliesCount:
      num(raw.child_comment_count) ?? num(raw.reply_count) ?? undefined,
  };
}

function commentArray(payload: Record<string, unknown>): unknown[] {
  const candidates = [
    payload.comments,
    asRecord(payload.data)?.comments,
    payload.items,
  ];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
}

export const scrapeCreatorsProvider: SocialDataProvider = {
  id: "scrapecreators",

  isConfigured() {
    return apiKey() !== null;
  },

  async fetchProfile(handle: string): Promise<ProviderProfileResult> {
    const endpoint = "/v1/instagram/profile";
    const { payload, telemetry } = await getJson(endpoint, { handle }, 30_000);
    const credits = telemetry.creditsCharged ?? (telemetry.cached ? 0 : 1);
    return {
      ...emptyMeta("scrapecreators", endpoint),
      billedResults: 1,
      creditsConsumed: credits,
      creditsRemaining: telemetry.creditsRemaining,
      cached: telemetry.cached,
      actualCostUsd: credits * getCostPerCreditUsd(),
      monetaryCostUsd: credits * getCostPerCreditUsd(),
      row: mapProfile(payload),
    };
  },

  async fetchPosts(
    handle: string,
    options: FetchPostsOptions,
  ): Promise<ProviderPostsResult> {
    const endpoint = "/v2/instagram/user/posts";
    const deadline = Date.now() + options.timeoutMs;
    const rows: ProviderPostRow[] = [];
    let cursor: string | null = null;
    let pages = 0;
    let credits = 0;
    let creditsRemaining: number | null = null;
    let allCached = true;
    let reachedCutoff = false;
    let exhausted = false;

    while (pages < MAX_PAGES && rows.length < options.maxPosts) {
      if (Date.now() >= deadline) break;
      const params: Record<string, string> = { handle };
      if (cursor) params.next_max_id = cursor;

      const { payload, telemetry }: CallResult = await getJson(
        endpoint,
        params,
        Math.max(5_000, deadline - Date.now()),
      );
      pages += 1;
      credits += telemetry.creditsCharged ?? (telemetry.cached ? 0 : 1);
      if (telemetry.creditsRemaining !== null) {
        creditsRemaining = telemetry.creditsRemaining;
      }
      if (!telemetry.cached) allCached = false;

      const items = postArray(payload);
      if (items.length === 0) {
        exhausted = true;
        break;
      }

      for (const item of items) {
        const rec = asRecord(item);
        if (!rec) continue;
        const mapped = mapPost(rec);
        const ts = typeof mapped.timestamp === "string"
          ? Date.parse(mapped.timestamp)
          : Number.NaN;
        if (
          options.sinceMs !== undefined &&
          Number.isFinite(ts) &&
          ts < options.sinceMs
        ) {
          // Feed is reverse-chronological: the first post older than the
          // cutoff ends the window.
          reachedCutoff = true;
          break;
        }
        rows.push(mapped);
        if (rows.length >= options.maxPosts) break;
      }

      if (reachedCutoff) break;
      cursor = cursorOf(payload);
      if (!cursor || !hasMore(payload)) {
        exhausted = true;
        break;
      }
    }

    const cost = credits * getCostPerCreditUsd();
    return {
      ...emptyMeta("scrapecreators", endpoint),
      billedResults: pages,
      creditsConsumed: credits,
      creditsRemaining,
      cached: pages > 0 && allCached,
      actualCostUsd: cost,
      monetaryCostUsd: cost,
      rows,
      // Only truncated if we stopped for our own limits, not because the
      // window was genuinely covered or the feed ended.
      truncated: !reachedCutoff && !exhausted,
    };
  },

  async fetchComments(
    postUrls: string[],
    options: FetchCommentsOptions,
  ): Promise<ProviderCommentsResult> {
    const endpoint = "/v2/instagram/post/comments";
    const deadline = Date.now() + options.timeoutMs;
    const batches: ProviderCommentBatch[] = [];
    const failedPostUrls: string[] = [];
    let credits = 0;
    let creditsRemaining: number | null = null;
    let calls = 0;
    let allCached = true;

    for (const postUrl of postUrls) {
      if (Date.now() >= deadline) {
        failedPostUrls.push(postUrl);
        continue;
      }
      try {
        const { payload, telemetry } = await getJson(
          endpoint,
          { url: postUrl, amount: String(options.perPostLimit) },
          Math.max(5_000, deadline - Date.now()),
        );
        calls += 1;
        credits += telemetry.creditsCharged ?? (telemetry.cached ? 0 : 1);
        if (telemetry.creditsRemaining !== null) {
          creditsRemaining = telemetry.creditsRemaining;
        }
        if (!telemetry.cached) allCached = false;

        const comments = commentArray(payload)
          .map((item) => asRecord(item))
          .filter((rec): rec is Record<string, unknown> => rec !== null)
          .map(mapComment)
          .filter((c) => c.id.length > 0)
          .slice(0, options.perPostLimit);
        batches.push({ postUrl, comments });
      } catch (err) {
        console.warn(
          "[scrapecreators] comments failed for post:",
          err instanceof Error ? err.message : String(err),
        );
        failedPostUrls.push(postUrl);
      }
    }

    const cost = credits * getCostPerCreditUsd();
    return {
      ...emptyMeta("scrapecreators", endpoint),
      billedResults: calls,
      creditsConsumed: credits,
      creditsRemaining,
      cached: calls > 0 && allCached,
      actualCostUsd: cost,
      monetaryCostUsd: cost,
      batches,
      failedPostUrls,
      groupedByPost: true,
    };
  },
};
