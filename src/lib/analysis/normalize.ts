/**
 * Pure normalization layer.
 * Converts raw Apify rows into the stable PublicAnalysis* shapes.
 * No I/O, fully testable.
 */

import type { BenchmarkFormat } from "@/lib/benchmark/types";
import type {
  PublicAnalysisContentSummary,
  PublicAnalysisProfile,
} from "./types";

// Loose shape — Apify schemas evolve; we only read what we need.
type RawProfile = {
  username?: string;
  fullName?: string;
  full_name?: string;
  biography?: string;
  bio?: string;
  profilePicUrl?: string;
  profilePicUrlHD?: string;
  profile_pic_url?: string;
  followersCount?: number;
  followers?: number;
  followsCount?: number;
  following?: number;
  postsCount?: number;
  posts?: number;
  verified?: boolean;
  isVerified?: boolean;
};

type RawPost = {
  type?: string;
  productType?: string;
  __typename?: string;
  isVideo?: boolean;
  likesCount?: number;
  likes?: number;
  commentsCount?: number;
  comments?: number;
  timestamp?: string | number;
  takenAtTimestamp?: number;
};

function pickNumber(...values: Array<unknown>): number | null {
  for (const v of values) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function pickString(...values: Array<unknown>): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

export function normalizeProfile(raw: RawProfile): PublicAnalysisProfile | null {
  const username = pickString(raw.username);
  const followers = pickNumber(raw.followersCount, raw.followers);
  if (!username || followers === null) return null;

  const display =
    pickString(raw.fullName, raw.full_name) ??
    username.charAt(0).toUpperCase() + username.slice(1).replace(/[._-]/g, " ");

  return {
    username,
    display_name: display,
    avatar_url: pickString(
      raw.profilePicUrlHD,
      raw.profilePicUrl,
      raw.profile_pic_url,
    ),
    bio: pickString(raw.biography, raw.bio),
    followers_count: followers,
    following_count: pickNumber(raw.followsCount, raw.following),
    posts_count: pickNumber(raw.postsCount, raw.posts),
    is_verified: Boolean(raw.verified ?? raw.isVerified ?? false),
  };
}

function classifyFormat(post: RawPost): BenchmarkFormat {
  const type = (post.type ?? post.__typename ?? "").toString().toLowerCase();
  const productType = (post.productType ?? "").toString().toLowerCase();

  if (
    productType.includes("clips") ||
    type.includes("video") ||
    type.includes("reel") ||
    post.isVideo === true
  ) {
    return "Reels";
  }
  if (type.includes("sidecar") || type.includes("carousel")) {
    return "Carrosséis";
  }
  return "Imagens";
}

function postTimestampMs(post: RawPost): number | null {
  if (typeof post.timestamp === "number") return post.timestamp * 1000;
  if (typeof post.timestamp === "string") {
    const parsed = Date.parse(post.timestamp);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof post.takenAtTimestamp === "number") {
    return post.takenAtTimestamp * 1000;
  }
  return null;
}

export function computeContentSummary(
  rawPosts: RawPost[],
  followersCount: number,
): PublicAnalysisContentSummary {
  const posts = Array.isArray(rawPosts) ? rawPosts : [];
  const postsAnalyzed = posts.length;

  if (postsAnalyzed === 0) {
    return {
      posts_analyzed: 0,
      dominant_format: "Imagens",
      average_likes: 0,
      average_comments: 0,
      average_engagement_rate: 0,
      estimated_posts_per_week: 0,
    };
  }

  let totalLikes = 0;
  let totalComments = 0;
  const formatCounts: Record<BenchmarkFormat, number> = {
    Reels: 0,
    Carrosséis: 0,
    Imagens: 0,
  };
  const timestamps: number[] = [];

  for (const post of posts) {
    const likes = pickNumber(post.likesCount, post.likes) ?? 0;
    const comments = pickNumber(post.commentsCount, post.comments) ?? 0;
    totalLikes += likes;
    totalComments += comments;
    formatCounts[classifyFormat(post)] += 1;
    const ts = postTimestampMs(post);
    if (ts !== null) timestamps.push(ts);
  }

  const averageLikes = totalLikes / postsAnalyzed;
  const averageComments = totalComments / postsAnalyzed;
  const averageEngagementRate =
    followersCount > 0
      ? ((averageLikes + averageComments) / followersCount) * 100
      : 0;

  const dominantFormat = (Object.entries(formatCounts) as Array<
    [BenchmarkFormat, number]
  >).reduce<[BenchmarkFormat, number]>(
    (top, entry) => (entry[1] > top[1] ? entry : top),
    ["Imagens", -1],
  )[0];

  let estimatedPostsPerWeek = 0;
  if (timestamps.length >= 2) {
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    const days = (max - min) / (1000 * 60 * 60 * 24);
    if (days >= 7) {
      estimatedPostsPerWeek = postsAnalyzed / (days / 7);
    } else {
      // Window too short — extrapolate against a 4-week reference.
      estimatedPostsPerWeek = postsAnalyzed / 4;
    }
  } else {
    estimatedPostsPerWeek = postsAnalyzed / 4;
  }

  return {
    posts_analyzed: postsAnalyzed,
    dominant_format: dominantFormat,
    average_likes: Math.round(averageLikes),
    average_comments: Math.round(averageComments),
    average_engagement_rate: Number(averageEngagementRate.toFixed(2)),
    estimated_posts_per_week: Number(estimatedPostsPerWeek.toFixed(1)),
  };
}

// ============================================================================
// Step 1 of the Real Report Data Layer — post-level enrichment.
// Pure helper, no I/O. Produces small, frontend-friendly post objects and
// per-format aggregates that the future snapshotToReportData adapter will
// consume. The raw Apify shape is intentionally NOT persisted: only the
// fields below survive the normalization step.
// ============================================================================

/** Hard cap. Apify currently returns 12; this defends against future actor changes. */
const POSTS_LIMIT = 12;

/** Caption length cap to keep the persisted payload small. */
const CAPTION_MAX_LENGTH = 500;

/** Persisted post shape — keep keys snake_case to match `profile`/`content_summary`. */
export interface EnrichedPost {
  id: string;
  shortcode: string | null;
  permalink: string | null;
  format: BenchmarkFormat;
  caption: string | null;
  hashtags: string[];
  mentions: string[];
  taken_at: number | null; // unix seconds (matches Apify's takenAtTimestamp scale)
  taken_at_iso: string | null;
  weekday: number | null; // 0=Sunday … 6=Saturday (UTC)
  hour_local: number | null; // 0..23 (UTC — true local hour requires profile timezone)
  likes: number;
  comments: number;
  video_views: number | null;
  thumbnail_url: string | null;
  is_video: boolean;
  /** (likes + comments) / followers * 100, rounded to 2 decimals. 0 if no followers. */
  engagement_pct: number;
}

export interface FormatStat {
  count: number;
  share_pct: number;
  avg_engagement_pct: number;
}

export type FormatStats = Record<BenchmarkFormat, FormatStat>;

export interface EnrichedPosts {
  posts: EnrichedPost[];
  format_stats: FormatStats;
}

/**
 * Loose Apify post shape — schemas evolve. We accept multiple field name
 * variants for every metric we care about and silently ignore the rest.
 */
type RawPostExtended = RawPost & {
  id?: string | number;
  pk?: string | number;
  shortcode?: string;
  code?: string;
  url?: string;
  postUrl?: string;
  permalink?: string;
  caption?: string;
  text?: string;
  edge_media_to_caption?: { edges?: Array<{ node?: { text?: string } }> };
  videoViewCount?: number;
  videoPlayCount?: number;
  video_views?: number;
  views?: number;
  taken_at?: number;
  displayUrl?: string;
  display_url?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  thumbnail_url?: string;
};

const HASHTAG_RE = /#([\p{L}\p{N}_]+)/gu;
const MENTION_RE = /@([A-Za-z0-9._]+)/g;

function extractHashtags(caption: string | null): string[] {
  if (!caption) return [];
  const out = new Set<string>();
  for (const match of caption.matchAll(HASHTAG_RE)) {
    const tag = match[1]?.toLowerCase();
    if (tag) out.add(tag);
  }
  return Array.from(out);
}

function extractMentions(caption: string | null): string[] {
  if (!caption) return [];
  const out = new Set<string>();
  for (const match of caption.matchAll(MENTION_RE)) {
    const handle = match[1]?.toLowerCase();
    if (handle) out.add(handle);
  }
  return Array.from(out);
}

function pickCaption(raw: RawPostExtended): string | null {
  const direct = pickString(raw.caption, raw.text);
  if (direct) return truncate(direct);
  const edge = raw.edge_media_to_caption?.edges?.[0]?.node?.text;
  return typeof edge === "string" && edge.trim().length > 0
    ? truncate(edge.trim())
    : null;
}

function truncate(s: string): string {
  if (s.length <= CAPTION_MAX_LENGTH) return s;
  // Soft truncation at the last whitespace within the limit, then ellipsis.
  const slice = s.slice(0, CAPTION_MAX_LENGTH);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > 200 ? slice.slice(0, lastSpace) : slice).trimEnd() + "…";
}

function buildPermalink(
  raw: RawPostExtended,
  shortcode: string | null,
): string | null {
  const direct = pickString(raw.url, raw.postUrl, raw.permalink);
  if (direct) return direct;
  if (shortcode) return `https://www.instagram.com/p/${shortcode}/`;
  return null;
}

function pickThumbnail(raw: RawPostExtended): string | null {
  return pickString(
    raw.displayUrl,
    raw.display_url,
    raw.imageUrl,
    raw.thumbnailUrl,
    raw.thumbnail_url,
  );
}

function pickVideoViews(raw: RawPostExtended): number | null {
  return pickNumber(
    raw.videoViewCount,
    raw.videoPlayCount,
    raw.video_views,
    raw.views,
  );
}

function postIdOf(raw: RawPostExtended, shortcode: string | null): string {
  const direct =
    typeof raw.id === "string" || typeof raw.id === "number"
      ? String(raw.id)
      : null;
  if (direct) return direct;
  const pk =
    typeof raw.pk === "string" || typeof raw.pk === "number"
      ? String(raw.pk)
      : null;
  if (pk) return pk;
  if (shortcode) return shortcode;
  // Last-resort deterministic id so deduping/keys still work in the UI.
  return `post-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyFormatStats(): FormatStats {
  return {
    Reels: { count: 0, share_pct: 0, avg_engagement_pct: 0 },
    Carrosséis: { count: 0, share_pct: 0, avg_engagement_pct: 0 },
    Imagens: { count: 0, share_pct: 0, avg_engagement_pct: 0 },
  };
}

/**
 * Convert raw Apify posts into a stable, frontend-friendly shape and compute
 * per-format aggregates. Pure function — no I/O, no mutation of the input.
 *
 * Caps the result at POSTS_LIMIT to keep the persisted JSON small.
 */
export function enrichPosts(
  rawPosts: unknown,
  followersCount: number,
): EnrichedPosts {
  const list = Array.isArray(rawPosts)
    ? (rawPosts.slice(0, POSTS_LIMIT) as RawPostExtended[])
    : [];

  const posts: EnrichedPost[] = list.map((raw) => {
    const shortcode = pickString(raw.shortcode, raw.code);
    const caption = pickCaption(raw);
    const likes = pickNumber(raw.likesCount, raw.likes) ?? 0;
    const comments = pickNumber(raw.commentsCount, raw.comments) ?? 0;
    const tsMs = postTimestampMs(raw);
    const takenAt = tsMs !== null ? Math.floor(tsMs / 1000) : null;
    const takenIso = tsMs !== null ? new Date(tsMs).toISOString() : null;
    const date = tsMs !== null ? new Date(tsMs) : null;
    const format = classifyFormat(raw);
    const isVideo =
      format === "Reels" ||
      raw.isVideo === true ||
      String(raw.type ?? "")
        .toLowerCase()
        .includes("video");

    const engagementPct =
      followersCount > 0
        ? Number((((likes + comments) / followersCount) * 100).toFixed(2))
        : 0;

    return {
      id: postIdOf(raw, shortcode),
      shortcode,
      permalink: buildPermalink(raw, shortcode),
      format,
      caption,
      hashtags: extractHashtags(caption),
      mentions: extractMentions(caption),
      taken_at: takenAt,
      taken_at_iso: takenIso,
      weekday: date ? date.getUTCDay() : null,
      hour_local: date ? date.getUTCHours() : null,
      likes,
      comments,
      video_views: pickVideoViews(raw),
      thumbnail_url: pickThumbnail(raw),
      is_video: isVideo,
      engagement_pct: engagementPct,
    };
  });

  const stats = emptyFormatStats();
  if (posts.length === 0) return { posts, format_stats: stats };

  const sumByFormat: Record<BenchmarkFormat, number> = {
    Reels: 0,
    Carrosséis: 0,
    Imagens: 0,
  };
  for (const p of posts) {
    stats[p.format].count += 1;
    sumByFormat[p.format] += p.engagement_pct;
  }
  for (const fmt of Object.keys(stats) as BenchmarkFormat[]) {
    const c = stats[fmt].count;
    stats[fmt].share_pct =
      Math.round(((c / posts.length) * 100) * 10) / 10;
    stats[fmt].avg_engagement_pct =
      c > 0 ? Number((sumByFormat[fmt] / c).toFixed(2)) : 0;
  }

  return { posts, format_stats: stats };
}
