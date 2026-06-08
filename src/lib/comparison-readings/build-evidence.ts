/**
 * Build the deterministic evidence pack handed to the AI model.
 * Pure function — no I/O, no Date.now(), no randomness.
 *
 * Inputs come from a snapshot's `normalized_payload`. Output is small,
 * stable JSON; the same input always produces the same `evidence_hash`,
 * which drives idempotent caching.
 */

import { createHash } from "crypto";

type AnyRecord = Record<string, unknown>;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function pick<T extends AnyRecord>(obj: unknown, keys: string[]): T {
  const out: AnyRecord = {};
  if (obj && typeof obj === "object") {
    for (const k of keys) {
      const v = (obj as AnyRecord)[k];
      if (v !== undefined) out[k] = v;
    }
  }
  return out as T;
}

export interface ComparisonEvidencePack {
  window: string | null;
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
    primary_sample_small: boolean;
    competitor_sample_small: boolean;
  };
}

export interface ProfileEvidence {
  handle: string;
  full_name: string | null;
  followers: number | null;
  verified: boolean | null;
  bio_present: boolean;
  bio_external_url_count: number;
  posts_analyzed: number | null;
  engagement_rate_pct: number | null;
  posting_frequency_weekly: number | null;
  average_likes: number | null;
  average_comments: number | null;
  dominant_format: string | null;
  dominant_format_share_pct: number | null;
  format_mix: Array<{ format: string; share_pct: number; count: number | null }>;
  weekday_counts_iso: number[] | null; // Mon=0..Sun=6
  weekday_peak_iso: number | null;
  top_hashtags: Array<{ tag: string; uses: number }>;
  top_post_metrics: Array<{
    rank: number;
    type: string | null;
    likes: number | null;
    comments: number | null;
    taken_at: string | null;
  }>;
}

function profileFromPrimary(payload: AnyRecord): ProfileEvidence {
  const profile = (payload.profile ?? {}) as AnyRecord;
  const summary = (payload.content_summary ?? {}) as AnyRecord;
  const formatStats = (payload.format_stats ?? {}) as AnyRecord;

  const formatMix: ProfileEvidence["format_mix"] = [];
  for (const [k, v] of Object.entries(formatStats)) {
    if (!v || typeof v !== "object") continue;
    const rec = v as AnyRecord;
    const share = num(rec.sharePct) ?? num(rec.share_pct);
    if (share === null) continue;
    formatMix.push({
      format: String(k),
      share_pct: Math.round(share * 10) / 10,
      count: num(rec.count),
    });
  }

  const topHashtags: ProfileEvidence["top_hashtags"] = Array.isArray(payload.top_hashtags)
    ? (payload.top_hashtags as AnyRecord[])
        .slice(0, 8)
        .map((h) => ({
          tag: String(h.tag ?? ""),
          uses: num(h.uses) ?? 0,
        }))
        .filter((h) => h.tag.length > 0)
    : [];

  const posts = Array.isArray(payload.posts) ? (payload.posts as AnyRecord[]) : [];
  const sortedByLikes = [...posts]
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (num(b.p.likes) ?? 0) - (num(a.p.likes) ?? 0))
    .slice(0, 3);

  const bio = str(profile.bio);
  const externalUrls = Array.isArray(profile.external_urls)
    ? (profile.external_urls as unknown[])
    : Array.isArray(profile.externalUrls)
      ? (profile.externalUrls as unknown[])
      : [];

  return {
    handle: String(profile.username ?? profile.handle ?? "").toLowerCase(),
    full_name: str(profile.full_name) ?? str(profile.fullName),
    followers: num(profile.followers),
    verified: typeof profile.verified === "boolean" ? profile.verified : null,
    bio_present: bio !== null,
    bio_external_url_count: externalUrls.length,
    posts_analyzed: num(summary.posts_analyzed) ?? num(summary.postsAnalyzed),
    engagement_rate_pct:
      num(summary.engagement_rate) ?? num(summary.engagementRate),
    posting_frequency_weekly:
      num(summary.posting_frequency_weekly) ?? num(summary.postingFrequencyWeekly),
    average_likes: num(summary.average_likes) ?? num(summary.averageLikes),
    average_comments:
      num(summary.average_comments) ?? num(summary.averageComments),
    dominant_format: str(summary.dominant_format) ?? str(summary.dominantFormat),
    dominant_format_share_pct:
      num(summary.dominant_format_share) ?? num(summary.dominantFormatShare),
    format_mix: formatMix.sort((a, b) => b.share_pct - a.share_pct),
    weekday_counts_iso: Array.isArray(payload.weekday_counts_iso)
      ? (payload.weekday_counts_iso as number[]).map((n) => num(n) ?? 0)
      : null,
    weekday_peak_iso: null, // filled below
    top_hashtags: topHashtags,
    top_post_metrics: sortedByLikes.map((x, idx) => ({
      rank: idx + 1,
      type: str(x.p.type) ?? str(x.p.media_type),
      likes: num(x.p.likes),
      comments: num(x.p.comments),
      taken_at: str(x.p.taken_at_iso) ?? str(x.p.taken_at),
    })),
  };
}

function profileFromCompetitor(comp: AnyRecord): ProfileEvidence {
  const profile = (comp.profile ?? {}) as AnyRecord;
  const summary = (comp.content_summary ?? comp.summary ?? {}) as AnyRecord;
  const formatStats = (comp.format_stats ?? comp.formatStats ?? {}) as AnyRecord;

  const formatMix: ProfileEvidence["format_mix"] = [];
  for (const [k, v] of Object.entries(formatStats)) {
    if (!v || typeof v !== "object") continue;
    const rec = v as AnyRecord;
    const share = num(rec.sharePct) ?? num(rec.share_pct);
    if (share === null) continue;
    formatMix.push({
      format: String(k),
      share_pct: Math.round(share * 10) / 10,
      count: num(rec.count),
    });
  }

  const bio = str(profile.bio);
  const externalUrls = Array.isArray(profile.external_urls)
    ? (profile.external_urls as unknown[])
    : Array.isArray(profile.externalUrls)
      ? (profile.externalUrls as unknown[])
      : [];

  return {
    handle: String(comp.handle ?? profile.username ?? "").toLowerCase(),
    full_name: str(profile.full_name) ?? str(profile.fullName),
    followers: num(profile.followers),
    verified: typeof profile.verified === "boolean" ? profile.verified : null,
    bio_present: bio !== null,
    bio_external_url_count: externalUrls.length,
    posts_analyzed: num(summary.posts_analyzed) ?? num(summary.postsAnalyzed),
    engagement_rate_pct:
      num(summary.engagement_rate) ?? num(summary.engagementRate),
    posting_frequency_weekly:
      num(summary.posting_frequency_weekly) ?? num(summary.postingFrequencyWeekly),
    average_likes: num(summary.average_likes) ?? num(summary.averageLikes),
    average_comments:
      num(summary.average_comments) ?? num(summary.averageComments),
    dominant_format: str(summary.dominant_format) ?? str(summary.dominantFormat),
    dominant_format_share_pct:
      num(summary.dominant_format_share) ?? num(summary.dominantFormatShare),
    format_mix: formatMix.sort((a, b) => b.share_pct - a.share_pct),
    weekday_counts_iso: Array.isArray(comp.weekday_counts_iso)
      ? (comp.weekday_counts_iso as number[]).map((n) => num(n) ?? 0)
      : Array.isArray(comp.weekdayCountsIso)
        ? (comp.weekdayCountsIso as number[]).map((n) => num(n) ?? 0)
        : null,
    weekday_peak_iso: null,
    top_hashtags: [],
    top_post_metrics: [],
  };
}

function fillPeak(p: ProfileEvidence): ProfileEvidence {
  if (!p.weekday_counts_iso || p.weekday_counts_iso.length === 0) return p;
  let peakIdx = 0;
  let peakVal = -1;
  for (let i = 0; i < p.weekday_counts_iso.length; i += 1) {
    if (p.weekday_counts_iso[i] > peakVal) {
      peakVal = p.weekday_counts_iso[i];
      peakIdx = i;
    }
  }
  return peakVal > 0 ? { ...p, weekday_peak_iso: peakIdx } : p;
}

/**
 * Build the evidence pack for a snapshot + competitor index.
 * Returns null when the snapshot has no usable competitor.
 */
export function buildComparisonEvidence(
  normalizedPayload: AnyRecord,
  competitorIndex = 0,
  window: string | null = null,
): ComparisonEvidencePack | null {
  const competitors = Array.isArray(normalizedPayload.competitors)
    ? (normalizedPayload.competitors as AnyRecord[])
    : [];
  const usable = competitors.filter((c) => c && c.success !== false);
  const comp = usable[competitorIndex];
  if (!comp) return null;

  let primary = profileFromPrimary(normalizedPayload);
  let competitor = profileFromCompetitor(comp);
  primary = fillPeak(primary);
  competitor = fillPeak(competitor);

  const erPp =
    primary.engagement_rate_pct !== null &&
    competitor.engagement_rate_pct !== null
      ? Math.round(
          (primary.engagement_rate_pct - competitor.engagement_rate_pct) * 100,
        ) / 100
      : null;
  const freqDelta =
    primary.posting_frequency_weekly !== null &&
    competitor.posting_frequency_weekly !== null
      ? Math.round(
          (primary.posting_frequency_weekly -
            competitor.posting_frequency_weekly) *
            10,
        ) / 10
      : null;
  const followersRatio =
    primary.followers !== null &&
    competitor.followers !== null &&
    competitor.followers > 0
      ? Math.round((primary.followers / competitor.followers) * 100) / 100
      : null;

  return {
    window,
    primary,
    competitor,
    deltas: {
      engagement_rate_pp: erPp,
      posting_frequency_weekly: freqDelta,
      followers_ratio: followersRatio,
    },
    flags: {
      has_format_stats_competitor: competitor.format_mix.length > 0,
      has_weekday_data_competitor:
        Array.isArray(competitor.weekday_counts_iso) &&
        competitor.weekday_counts_iso.some((n) => n > 0),
      competitor_bio_present: competitor.bio_present,
      primary_sample_small: (primary.posts_analyzed ?? 0) < 6,
      competitor_sample_small: (competitor.posts_analyzed ?? 0) < 6,
    },
  };
}

/** Stable string for hashing — sorts object keys recursively. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const keys = Object.keys(value as AnyRecord).sort();
  return (
    "{" +
    keys
      .map(
        (k) =>
          JSON.stringify(k) + ":" + stableStringify((value as AnyRecord)[k]),
      )
      .join(",") +
    "}"
  );
}

export function hashEvidencePack(
  pack: ComparisonEvidencePack,
  promptVersion: string,
  model: string,
): string {
  const h = createHash("sha256");
  h.update(promptVersion);
  h.update("|");
  h.update(model);
  h.update("|");
  h.update(stableStringify(pack));
  return h.digest("hex");
}

// re-export helpers used by tests
export const _internals = { stableStringify };