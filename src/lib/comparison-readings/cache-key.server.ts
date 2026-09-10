import { createHash } from "node:crypto";
import { buildCacheKey } from "@/lib/analysis/cache";
import { isComparisonV2Enabled } from "./config.server";
import { parseComparisonContext, contextSearch } from "./context";

export function comparisonCacheKey(
  primary: string,
  competitors: string[],
  window: "baseline" | "30d" | "90d",
  context?: unknown,
): string {
  const legacy = buildCacheKey(primary, competitors, window);
  if (!isComparisonV2Enabled()) return legacy;
  const normalized = contextSearch(parseComparisonContext(context));
  return (
    legacy +
    ":comparison-v2" +
    (normalized ? ":" + createHash("sha256").update(normalized).digest("hex").slice(0, 24) : "")
  );
}
