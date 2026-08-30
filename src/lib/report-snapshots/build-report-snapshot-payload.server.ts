/**
 * Builds an immutable, lightweight historical payload from an
 * `analysis_snapshots.normalized_payload`.
 *
 * Whitelist-based: explicitly copies fields, never spreads source. Strips any
 * `data:` base64 URLs to avoid bloating historical storage.
 *
 * Pure function — no DB writes, no provider calls, no side effects.
 */
import {
  ALGORITHM_VERSION_V1,
  REPORT_PAYLOAD_SCHEMA_VERSION,
  ReportPayloadV1Schema,
  type ReportPayloadV1,
} from "./schema";

const MAX_POSTS = 30;
const MAX_CAPTION_CHARS = 1000;
const MAX_HASHTAGS = 30;
const MAX_MENTIONS = 30;

type Json = unknown;
type Obj = Record<string, Json>;

function isObject(value: Json): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asObject(value: Json): Obj {
  return isObject(value) ? value : {};
}

function asArray(value: Json): Json[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: Json): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: Json): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: Json): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asStringArray(value: Json, max: number): string[] {
  return asArray(value)
    .filter((v): v is string => typeof v === "string")
    .slice(0, max);
}

/**
 * Returns the URL if it's a safe HTTPS / relative URL. Strips and warns when
 * the URL is a `data:` base64 blob — these are forbidden in historical
 * payloads to prevent storage bloat.
 */
function sanitizeUrl(value: Json, fieldPath: string): string | null {
  const str = asString(value);
  if (!str) return null;
  if (str.startsWith("data:")) {
    console.warn(
      `[build-report-snapshot-payload] dropped base64 data URL at ${fieldPath}`,
    );
    return null;
  }
  return str;
}

function truncate(value: string | undefined, max: number): string | undefined {
  if (value === undefined) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

export interface BuildReportSnapshotInput {
  normalized_payload: Json;
  instagram_username: string;
  competitor_usernames: string[];
  algorithm_version?: string;
  generated_at?: string;
}

export interface BuildReportSnapshotResult {
  payload: ReportPayloadV1;
  payload_schema_version: typeof REPORT_PAYLOAD_SCHEMA_VERSION;
  algorithm_version: string;
}

export function buildReportSnapshotPayload(
  input: BuildReportSnapshotInput,
): BuildReportSnapshotResult {
  const src = asObject(input.normalized_payload);
  const profileSrc = asObject(src.profile);
  const postsSrc = asArray(src.posts).slice(0, MAX_POSTS);

  const profile = {
    username: asString(profileSrc.username) ?? input.instagram_username,
    display_name: asString(profileSrc.display_name) ?? null,
    bio: asString(profileSrc.bio) ?? null,
    category: asString(profileSrc.category) ?? null,
    is_business: asBoolean(profileSrc.is_business),
    is_verified: asBoolean(profileSrc.is_verified),
    followers_count: asNumber(profileSrc.followers_count) ?? null,
    following_count: asNumber(profileSrc.following_count) ?? null,
    posts_count: asNumber(profileSrc.posts_count) ?? null,
    avatar_url: sanitizeUrl(profileSrc.avatar_url, "profile.avatar_url"),
  };

  const posts = postsSrc.map((raw, idx) => {
    const p = asObject(raw);
    const caption = truncate(asString(p.caption), MAX_CAPTION_CHARS);
    return {
      id: asString(p.id),
      shortcode: asString(p.shortcode),
      permalink: asString(p.permalink),
      format: asString(p.format),
      taken_at_iso: asString(p.taken_at_iso),
      weekday: asNumber(p.weekday) ?? null,
      hour_local: asNumber(p.hour_local) ?? null,
      caption,
      caption_length:
        asNumber(p.caption_length) ?? (asString(p.caption)?.length ?? 0),
      hashtags: asStringArray(p.hashtags, MAX_HASHTAGS),
      mentions: asStringArray(p.mentions, MAX_MENTIONS),
      likes: asNumber(p.likes) ?? null,
      comments: asNumber(p.comments) ?? null,
      video_views: asNumber(p.video_views) ?? null,
      video_plays: asNumber(p.video_plays) ?? null,
      video_duration: asNumber(p.video_duration) ?? null,
      engagement_pct: asNumber(p.engagement_pct) ?? null,
      thumbnail_url: sanitizeUrl(p.thumbnail_url, `posts[${idx}].thumbnail_url`),
    };
  });

  // Whitelist of metric-shaped sub-trees. Anything not listed is dropped.
  const metrics = asObject(src.metrics);
  const formatStats = isObject(src.format_stats) ? src.format_stats : undefined;
  const contentSummary = isObject(src.content_summary)
    ? src.content_summary
    : undefined;
  const insights = isObject(src.insights)
    ? src.insights
    : isObject(src.ai_insights_v2)
      ? src.ai_insights_v2
      : undefined;

  const competitorSummaries = asArray(src.competitor_summaries)
    .filter(isObject)
    .slice(0, 10);

  const dataProvenance = isObject(src.data_provenance)
    ? src.data_provenance
    : undefined;

  const payload: ReportPayloadV1 = ReportPayloadV1Schema.parse({
    schema_version: REPORT_PAYLOAD_SCHEMA_VERSION,
    algorithm_version: input.algorithm_version ?? ALGORITHM_VERSION_V1,
    generated_at: input.generated_at ?? new Date().toISOString(),
    handle: input.instagram_username,
    network: "instagram",
    competitors: input.competitor_usernames,
    language: "pt-PT",
    profile,
    metrics,
    format_stats: formatStats,
    content_summary: contentSummary,
    posts,
    competitor_summaries: competitorSummaries,
    insights,
    data_provenance: dataProvenance,
  });

  return {
    payload,
    payload_schema_version: REPORT_PAYLOAD_SCHEMA_VERSION,
    algorithm_version: payload.algorithm_version,
  };
}