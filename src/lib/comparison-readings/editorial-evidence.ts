import type { EnrichedPost } from "@/lib/analysis/normalize";
import { normalizePostTimestamp } from "@/lib/report/cadence";
import { publicationUrl } from "./publication-url";

export interface EditorialPost {
  id: string;
  permalink: string | null;
  date: string | null;
  format: string | null;
  caption: string | null;
  likes: number | null;
  comments: number | null;
  engagement_pct: number | null;
}
const finite = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return Math.round((sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2) * 100) / 100;
}
/** Round-robin over date thirds × performance thirds; input order cannot change the sample. */
export function sampleEditorialPosts(posts: readonly EditorialPost[], limit = 24): EditorialPost[] {
  const chronological = [...posts].sort(
    (a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.id.localeCompare(b.id),
  );
  const performance = [...posts].sort(
    (a, b) => (a.engagement_pct ?? -1) - (b.engagement_pct ?? -1) || a.id.localeCompare(b.id),
  );
  const rank = new Map(performance.map((p, i) => [p.id, i]));
  const buckets: EditorialPost[][] = Array.from({ length: 9 }, () => []);
  chronological.forEach((p, i) =>
    buckets[
      Math.min(2, Math.floor((i * 3) / posts.length)) * 3 +
        Math.min(2, Math.floor(((rank.get(p.id) ?? 0) * 3) / posts.length))
    ].push(p),
  );
  const sample: EditorialPost[] = [];
  for (let offset = 0; sample.length < Math.min(limit, posts.length); offset++) {
    for (const bucket of buckets)
      if (bucket[offset] && sample.length < limit) sample.push(bucket[offset]);
  }
  return sample;
}
export function editorialEvidence(raw: unknown, start: number | null, end: number | null) {
  const list = Array.isArray(raw) ? (raw as Partial<EnrichedPost>[]) : [];
  const seen = new Set<string>();
  const posts: EditorialPost[] = list.flatMap((p) => {
    const time = normalizePostTimestamp(p);
    if (start !== null && (!Number.isFinite(time) || time < start)) return [];
    if (end !== null && Number.isFinite(time) && time > end) return [];
    const url = publicationUrl(p.permalink);
    const id = p.id || p.shortcode || url;
    if (!id || seen.has(id)) return [];
    seen.add(id);
    const likes = p.likes_observed === false ? null : finite(p.likes);
    const comments = p.comments_observed === false ? null : finite(p.comments);
    return [
      {
        id,
        permalink: url,
        date: Number.isFinite(time) ? new Date(time).toISOString() : null,
        format: p.format ?? null,
        caption: typeof p.caption === "string" ? p.caption.slice(0, 1000) : null,
        likes,
        comments,
        engagement_pct: likes !== null && comments !== null ? finite(p.engagement_pct) : null,
      },
    ];
  });
  const engagements = posts.flatMap((p) => (p.engagement_pct === null ? [] : [p.engagement_pct]));
  const interactions = posts.flatMap((p) =>
    p.likes === null || p.comments === null ? [] : [p.likes + p.comments],
  );
  const total = interactions.reduce((a, b) => a + b, 0);
  return {
    sampled_posts: sampleEditorialPosts(posts),
    aggregates: {
      eligible_posts: posts.length,
      measured_posts: engagements.length,
      median_engagement_pct: median(engagements),
      median_likes: median(posts.flatMap((p) => (p.likes === null ? [] : [p.likes]))),
      median_comments: median(posts.flatMap((p) => (p.comments === null ? [] : [p.comments]))),
      top_three_interaction_share_pct:
        total > 0
          ? Math.round(
              ([...interactions]
                .sort((a, b) => b - a)
                .slice(0, 3)
                .reduce((a, b) => a + b, 0) /
                total) *
                10000,
            ) / 100
          : null,
    },
  };
}
