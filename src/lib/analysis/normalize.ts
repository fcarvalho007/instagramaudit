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
