import { ReportSourceLabel, type ReportSourceType } from "./report-source-label";

/**
 * Variant names used by caption-intelligence (data-level values).
 * Maps to the unified ReportSourceType.
 */
export type SourceBadgeVariant = "extracted" | "auto" | "ai";

const VARIANT_MAP: Record<SourceBadgeVariant, ReportSourceType> = {
  extracted: "dados",
  auto: "auto",
  ai: "ia",
};

/**
 * Thin wrapper around ReportSourceLabel for backward compatibility
 * with caption-intelligence's data-level source kinds.
 */
export function SourceBadge({
  variant,
  className,
}: {
  variant: SourceBadgeVariant;
  className?: string;
}) {
  return <ReportSourceLabel type={VARIANT_MAP[variant]} className={className} />;
}