import { z } from "zod";
import { normalizePostTimestamp, type CadenceInputPost } from "@/lib/report/cadence";

export interface CollectionCoverage {
  requested_start: string | null;
  requested_end: string;
  observed_start: string | null;
  observed_end: string | null;
  collected_at: string;
  post_count: number;
  limit: number;
  truncated: boolean;
  status: "complete" | "partial" | "sample";
}
const CoverageSchema = z
  .object({
    requested_start: z.string().datetime({ offset: true }).nullable(),
    requested_end: z.string().datetime({ offset: true }),
    observed_start: z.string().datetime({ offset: true }).nullable(),
    observed_end: z.string().datetime({ offset: true }).nullable(),
    collected_at: z.string().datetime({ offset: true }),
    post_count: z.number().int().min(0),
    limit: z.number().int().positive(),
    truncated: z.boolean(),
    status: z.enum(["complete", "partial", "sample"]),
  })
  .refine(
    (c) =>
      c.requested_start === null || Date.parse(c.requested_start) < Date.parse(c.requested_end),
  )
  .refine(
    (c) =>
      c.status !== "complete" ||
      (!c.truncated && c.requested_start !== null && c.post_count < c.limit),
  );
export function parseCoverage(value: unknown): CollectionCoverage | null {
  const parsed = CoverageSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
export function windowBounds(window: "baseline" | "30d" | "90d", endMs: number) {
  return {
    startMs: window === "baseline" ? null : endMs - (window === "30d" ? 30 : 90) * 86400000,
    endMs,
  };
}
export function buildCoverage(
  posts: readonly CadenceInputPost[],
  bounds: ReturnType<typeof windowBounds>,
  limit: number,
  providerTruncated: boolean | undefined,
): CollectionCoverage {
  const dates = posts.map(normalizePostTimestamp).filter(Number.isFinite);
  const truncated = providerTruncated === true || posts.length >= limit;
  return {
    requested_start: bounds.startMs === null ? null : new Date(bounds.startMs).toISOString(),
    requested_end: new Date(bounds.endMs).toISOString(),
    collected_at: new Date(bounds.endMs).toISOString(),
    observed_start: dates.length ? new Date(Math.min(...dates)).toISOString() : null,
    observed_end: dates.length ? new Date(Math.max(...dates)).toISOString() : null,
    post_count: posts.length,
    limit,
    truncated,
    status:
      bounds.startMs === null
        ? "sample"
        : truncated || providerTruncated === undefined
          ? "partial"
          : "complete",
  };
}
export function matchingCompleteWindows(
  a?: CollectionCoverage | null,
  b?: CollectionCoverage | null,
): boolean {
  a = parseCoverage(a);
  b = parseCoverage(b);
  return Boolean(
    a &&
    b &&
    a.status === "complete" &&
    b.status === "complete" &&
    a.requested_start &&
    a.requested_start === b.requested_start &&
    a.requested_end === b.requested_end,
  );
}
