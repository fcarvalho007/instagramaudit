/**
 * ScrapeCreators adapter (server-only).
 *
 * Endpoints used:
 *   GET /v1/instagram/profile?handle=<h>
 *   GET /v2/instagram/user/posts?handle=<h>[&next_max_id=<cursor>]
 *
 * The posts endpoint paginates by cursor, which is the reason this provider
 * exists: unlike the Apify actor in `details` mode, it can walk back a real
 * 30/90-day window instead of stopping at the 12 most recent publications.
 *
 * Every row returned here is translated into the Apify row shape consumed by
 * `normalizeProfile` / `normalizePost`. Fields ScrapeCreators does not expose
 * (collaborators, tagged users, location, music) are omitted so downstream
 * blocks flag them as not measurable instead of showing a fake zero.
 */

import type {
  FetchPostsOptions,
  ProviderPostRow,
  ProviderPostsResult,
  ProviderProfileResult,
  SocialDataProvider,
} from "./types";

const BASE_URL =
  process.env.SCRAPECREATORS_BASE_URL ?? "https://api.scrapecreators.com";

/** Credits consumed per request, used only for cost telemetry. */
const COST_PER_REQUEST_USD = (() => {
  const raw = process.env.SCRAPECREATORS_COST_PER_REQUEST_USD;
  const parsed = raw ? Number.parseFloat(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
})();

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

async function getJson(
  path: string,
  params: Record<string, string>,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  const key = apiKey();
  if (!key) {
    throw new ScrapeCreatorsError("SCRAPECREATORS_API_KEY em falta", null);
  }
  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

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
    return (await res.json()) as Record<string, unknown>;
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

/** ScrapeCreators media item → Apify post row. */
export function mapPost(raw: Record<string, unknown>): ProviderPostRow {
  const caption =
    str(asRecord(raw.caption)?.text) ??
    str(raw.caption) ??
    str(asRecord(asRecord(raw.edge_media_to_caption)?.edges) ? null : null) ??
    null;
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
    videoPlayCount:
      num(raw.play_count) ?? num(raw.ig_play_count) ?? num(raw.view_count),
    videoDuration: num(raw.video_duration),
    displayUrl:
      str(raw.display_url) ??
      str(raw.thumbnail_url) ??
      str(asRecord(asRecord(raw.image_versions2)?.candidates)?.[0]),
  };
}

export const scrapeCreatorsProvider: SocialDataProvider = {
  id: "scrapecreators",

  isConfigured() {
    return apiKey() !== null;
  },

  async fetchProfile(handle: string): Promise<ProviderProfileResult> {
    const payload = await getJson(
      "/v1/instagram/profile",
      { handle },
      30_000,
    );
    return {
      provider: "scrapecreators",
      runId: null,
      actualCostUsd: COST_PER_REQUEST_USD || null,
      billedResults: 1,
      row: mapProfile(payload),
    };
  },

  async fetchPosts(
    handle: string,
    options: FetchPostsOptions,
  ): Promise<ProviderPostsResult> {
    const deadline = Date.now() + options.timeoutMs;
    const rows: ProviderPostRow[] = [];
    let cursor: string | null = null;
    let pages = 0;
    let reachedCutoff = false;
    let exhausted = false;

    while (pages < MAX_PAGES && rows.length < options.maxPosts) {
      if (Date.now() >= deadline) break;
      const params: Record<string, string> = { handle };
      if (cursor) params.next_max_id = cursor;

      const payload: Record<string, unknown> = await getJson(
        "/v2/instagram/user/posts",
        params,
        Math.max(5_000, deadline - Date.now()),
      );
      pages += 1;

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

    return {
      provider: "scrapecreators",
      runId: null,
      actualCostUsd: COST_PER_REQUEST_USD
        ? COST_PER_REQUEST_USD * pages
        : null,
      billedResults: pages,
      rows,
      // Only truncated if we stopped for our own limits, not because the
      // window was genuinely covered or the feed ended.
      truncated: !reachedCutoff && !exhausted,
    };
  },
};
