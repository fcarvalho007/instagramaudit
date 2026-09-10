import { z } from "zod";

export const ComparisonContextSchema = z.object({
  objective: z.string().trim().max(160).default(""),
  sector: z.string().trim().max(80).default(""),
  market: z.string().trim().max(80).default(""),
});
export type ComparisonContext = z.infer<typeof ComparisonContextSchema>;
export function parseComparisonContext(raw: unknown): ComparisonContext {
  try {
    const parsed = ComparisonContextSchema.safeParse(
      typeof raw === "string" ? JSON.parse(raw) : raw,
    );
    if (parsed.success) return parsed.data;
  } catch {
    /* Invalid optional context is ignored. */
  }
  return { objective: "", sector: "", market: "" };
}
export function contextSearch(context: ComparisonContext): string | undefined {
  return Object.values(context).some(Boolean) ? JSON.stringify(context) : undefined;
}
