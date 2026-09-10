import { publicationUrl } from "./publication-url";
export { publicationUrl } from "./publication-url";
/** Canonical, deterministic evidence shared by generation, validation and reports. */
import { createHash } from "crypto";
import type { PublicAnalysisProfile, PublicAnalysisContentSummary } from "@/lib/analysis/types";
import type { EnrichedPost, FormatStats } from "@/lib/analysis/normalize";
import { computeCadence, normalizePostTimestamp } from "@/lib/report/cadence";
import { remapUtcCountsToIso } from "@/lib/report/weekday-iso";

import { editorialEvidence } from "./editorial-evidence";
import { parseCoverage, matchingCompleteWindows, type CollectionCoverage } from "./coverage";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const round = (v: number) => Math.round(v * 100) / 100;

export interface ComparisonEvidencePack {
  window: string | null;
  context: { objective: string | null; sector: string | null; market: string | null };
  primary: ProfileEvidence;
  competitor: ProfileEvidence;
  deltas: {
    engagement_rate_pp: number | null;
    posting_frequency_weekly: number | null;
    followers_ratio: number | null;
  };
  flags: {
    has_format_stats_competitor: boolean;
    has_weekday_data_competitor: boolean;
    competitor_bio_present: boolean;
    comparable_periods: boolean;
    primary_sample_small: boolean;
    competitor_sample_small: boolean;
  };
}

export interface ProfileEvidence {
  collection_coverage: CollectionCoverage | null;
  bio_text: string | null;
  sampled_posts: ReturnType<typeof editorialEvidence>["sampled_posts"];
  aggregates: ReturnType<typeof editorialEvidence>["aggregates"];
  handle: string;
  full_name: string | null;
  followers: number | null;
  verified: boolean | null;
  bio_present: boolean;
  bio_external_url_count: number | null;
  posts_analyzed: number | null;
  engagement_rate_pct: number | null;
  posting_frequency_weekly: number | null;
  average_likes: number | null;
  average_comments: number | null;
  dominant_format: string | null;
  dominant_format_share_pct: number | null;
  format_mix: Array<{ format: string; share_pct: number; count: number | null }>;
  weekday_counts_iso: number[] | null;
  weekday_peak_iso: number | null;
  top_hashtags: Array<{ tag: string; uses: number }>;
  top_post_metrics: Array<{
    rank: number;
    id: string | null;
    permalink: string | null;
    caption: string | null;
    type: string | null;
    likes: number | null;
    comments: number | null;
    taken_at: string | null;
  }>;
}

/** Only accept Instagram publication URLs; never turn a caption into an executable link. */

function profileEvidence(raw: Obj, referenceTime: number | undefined): ProfileEvidence {
  // The boundary accepts old snapshots, but all field names below come from the canonical contract.
  const profile = obj(raw.profile) as Partial<PublicAnalysisProfile>;
  const summary = obj(raw.content_summary) as Partial<PublicAnalysisContentSummary>;
  const posts = (Array.isArray(raw.posts) ? raw.posts : []).filter(
    (p) => p && typeof p === "object",
  ) as Partial<EnrichedPost>[];
  const stats = obj(raw.format_stats) as Partial<FormatStats>;

  const formatMix = Object.entries(stats)
    .flatMap(([format, stat]) => {
      const share = num(stat?.share_pct);
      return share === null ? [] : [{
      format,
      share_pct: round(share),
      count: num(stat?.count) }];
    })
    .sort((a, b) => b.share_pct - a.share_pct || a.format.localeCompare(b.format));
  const utc = Array.isArray(raw.weekday_counts) ? (raw.weekday_counts as number[]) : null;
  const iso = Array.isArray(raw.weekday_counts_iso)
      ? (raw.weekday_counts_iso as number[]) : null;
  const weekday = utc
    ? remapUtcCountsToIso(utc)
    : iso?.length === 7
      ? iso.map((n) => num(n) ?? 0)
      : posts.some((p) => Number.isInteger(p.weekday))
        ? remapUtcCountsToIso(
            posts.reduce(
              (counts, p) => {
                if (typeof p.weekday === "number" && p.weekday >= 0 && p.weekday < 7)
                  counts[p.weekday]++;
                return counts;
              },
              [0, 0, 0, 0, 0, 0, 0],
            ),
          )
        : null;
  const tags = new Map<string, number>();
  if (posts.length) {
    for (const p of posts)
      for (const tag of new Set(p.hashtags ?? [])) {
        const key = tag.toLowerCase();
        tags.set(key, (tags.get(key) ?? 0) + 1);
      }
  } else if (Array.isArray(raw.top_hashtags)) {
    for (const item of raw.top_hashtags) {
      const h = obj(item);
    const count = num(h.count) ?? num(h.uses);
    if (str(h.tag) && count !== null) tags.set(str(h.tag)!,
      count);
    }
  }
  // Without a collection timestamp, never reinterpret a historic sample against today's clock.
  const cadence =
    referenceTime === undefined ? null : computeCadence(posts, { now: referenceTime });
  const dominant = str(summary.dominant_format);
  const bio = str(profile.bio);
  const coverage = parseCoverage(raw.collection_coverage);
  const start = coverage?.requested_start ? Date.parse(coverage.requested_start) : null;
  const editorial = editorialEvidence(
    posts,
    start !== null && Number.isFinite(start) ? start : null,
    referenceTime ?? null,
  );
  const sorted = [...posts].sort(
    (a, b) =>
      (num(b.engagement_pct) ?? -1) - (num(a.engagement_pct) ?? -1) ||
      (num(b.likes) ?? -1) - (num(a.likes) ?? -1) ||
      String(a.id).localeCompare(String(b.id)),
  );
  return {
    collection_coverage: coverage ?? null,
    bio_text: bio,
    ...editorial,
    handle: (str(profile.username)
    ?? "").replace(/^@/, "").toLowerCase(),
    full_name: str(profile.display_name),
    followers: num(profile.followers_count),
    verified: typeof profile.is_verified === "boolean" ? profile.is_verified : null,
    bio_present: bio !== null,
    bio_external_url_count: Array.isArray(profile.external_urls)
      ? profile.external_urls.length
      : null,
    posts_analyzed: num(summary.posts_analyzed),
    engagement_rate_pct:
      summary.posts_analyzed === 0 ||
      (profile.followers_count ?? 0) <= 0 ||
      posts.some((p) => p.likes_observed === false || p.comments_observed === false)
        ? null
        :
      num(summary.average_engagement_rate),
    posting_frequency_weekly: cadence?.sufficient ? cadence.weekly : null,
    average_likes: posts.some((p) => p.likes_observed === false) ? null
      : num(summary.average_likes),
    average_comments: posts.some((p) => p.comments_observed === false)
      ? null
      :
      num(summary.average_comments),
    dominant_format: dominant,
    dominant_format_share_pct: formatMix.find((f) => f.format === dominant) ?.share_pct ?? null,
    format_mix: formatMix,
    weekday_counts_iso: weekday,
    weekday_peak_iso:
      weekday && Math.max(...weekday) > 0 ? weekday.indexOf(Math.max(...weekday)) : null,
    top_hashtags: [...tags]
      .sort(([a, ac], [b, bc]) => bc - ac || a.localeCompare(b))
      .slice(0, 8)
      .map(([tag, uses]) => ({ tag, uses })),
    top_post_metrics: sorted.slice(0, 3).map((p, i) => ({
      rank: i + 1,
      id: str(p.id),
      permalink: publicationUrl(p.permalink),
      caption: str(p.caption),
      type: str(p.format),
      likes: num(p.likes),
      comments: num(p.comments),
      taken_at: Number.isFinite(normalizePostTimestamp(p))
        ? new Date(normalizePostTimestamp(p)).toISOString()
        : null,
    })),
  };
}

export function buildComparisonEvidence(
  normalizedPayload: Obj,
  competitorIndex = 0,
  window: string | null = null,
): ComparisonEvidencePack | null {
  const usable = (Array.isArray(normalizedPayload.competitors)
    ? normalizedPayload.competitors : [])
    .map(obj)
    .filter((c) => c.success !== false && str(obj(c.profile).username));
  const comp = usable[competitorIndex];
  if (!comp) return null;
  const timestamp =
    str(normalizedPayload.analysis_window_end) ??
    str(normalizedPayload.analyzed_at) ??
    str(normalizedPayload.generated_at);

  const epoch = timestamp ? Date.parse(timestamp) : NaN;
  const referenceTime = Number.isFinite(epoch) ? epoch : undefined;
  const primary = profileEvidence(normalizedPayload, referenceTime);
  const competitor = profileEvidence(comp, referenceTime);
  const diff = (a: number | null, b: number | null) =>
    a !== null && b !== null
      ? round(a - b) : null;
  return {
    window: window ?? str(normalizedPayload.analysis_window),
    context: {
      objective: str(obj(normalizedPayload.comparison_context).objective),
      sector: str(obj(normalizedPayload.comparison_context).sector),
      market: str(obj(normalizedPayload.comparison_context).market),
    },
    primary,
    competitor,
    deltas: {
      engagement_rate_pp: diff(primary.engagement_rate_pct, competitor.engagement_rate_pct),
      posting_frequency_weekly: matchingCompleteWindows(
        primary.collection_coverage,
        competitor.collection_coverage,
        )
        ? diff(primary.posting_frequency_weekly, competitor.posting_frequency_weekly)
        : null,
      followers_ratio:
        primary.followers !== null &&
    competitor.followers !== null &&
    competitor.followers > 0
      ? round(primary.followers / competitor.followers)
          : null,
    },
    flags: {
      comparable_periods: matchingCompleteWindows(
        primary.collection_coverage,
        competitor.collection_coverage,
      ),
      has_format_stats_competitor: competitor.format_mix.length > 0,
      has_weekday_data_competitor: competitor.weekday_counts_iso?.some((n) => n > 0) ?? false,
      competitor_bio_present: competitor.bio_present,
      primary_sample_small: (primary.posts_analyzed ?? 0) < 6,
      competitor_sample_small: (competitor.posts_analyzed ?? 0) < 6,
    },
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort()
    .map(
        (k) => `${JSON.stringify(k)}:${stableStringify((value as Obj)[k])}`)
    .join(",")}}`;
}

export function hashEvidencePack(
  pack: ComparisonEvidencePack,
  promptVersion: string,
  model: string,
): string {
  return createHash("sha256")
    .update(`${promptVersion}|${model}|${stableStringify(pack)}`)
    .digest("hex");
}
export const _internals = { stableStringify };
