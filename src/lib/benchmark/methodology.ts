import { z } from "zod";
export const MethodologySchema = z.object({
  numerator: z.string(),
  denominator: z.string(),
  aggregation: z.string(),
  population: z.string(),
  format_scope: z.string(),
  source: z.string().url(),
  published_at: z.string().date(),
  version: z.string().min(1),
  formula: z.string().min(1),
});
export type MetricMethodology = z.infer<typeof MethodologySchema>;
export const PUBLIC_ENGAGEMENT_METHOD = {
  numerator: "likes+comments",
  denominator: "followers_at_collection",
  aggregation: "mean_post_rate",
  population: "instagram_public_posts",
  format_scope: "all",
  formula: "mean((likes + comments) / followers_at_collection * 100)",
  version: "public-engagement.v2",
} as const;
/** Missing provenance or a different metric prevents numeric ranking. */
export function compatibleMethodology(
  reference: unknown,
  observed: Pick<
    MetricMethodology,
    "numerator" | "denominator" | "aggregation" | "population" | "format_scope"
  > = PUBLIC_ENGAGEMENT_METHOD,
): boolean {
  const parsed = MethodologySchema.safeParse(reference);
  return (
    parsed.success &&
    (["numerator", "denominator", "aggregation", "population", "format_scope"] as const).every(
      (key) => parsed.data[key] === observed[key],
    )
  );
}
