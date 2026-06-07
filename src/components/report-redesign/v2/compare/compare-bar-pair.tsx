import { cn } from "@/lib/utils";
import type { CompareBarCategory, CompareUnit } from "./compare-types";

interface CompareBarPairProps {
  /** Eyebrow / label above the comparison (e.g. "Distribuição de formato"). */
  label: string;
  /** Display names for the legend. */
  primaryHandle: string;
  competitorHandle: string;
  /** Ordered list of categories, each with raw values for both profiles. */
  categories: CompareBarCategory[];
  /** Drives the default formatted label suffix when not provided per row. */
  unit: CompareUnit;
  /** Optional hint shown under the label. */
  hint?: string;
}

/**
 * Padrão 2 — distribution comparison.
 *
 * Each category renders two paired bars: primary in `accent-primary`,
 * competitor in `accent-secondary`. The bar width is normalised against
 * the largest value across both series so a 100 %-stacked distribution
 * and a free-scale metric look honest.
 */
export function CompareBarPair({
  label,
  primaryHandle,
  competitorHandle,
  categories,
  unit,
  hint,
}: CompareBarPairProps) {
  const maxValue = Math.max(
    1,
    ...categories.flatMap((c) => [c.primary, c.competitor]),
  );

  return (
    <section
      className="rounded-xl border border-border-default bg-surface-secondary p-4 sm:p-5"
      aria-label={`${label}: comparação com concorrente`}
    >
      <header className="flex flex-col gap-0.5">
        <span className="text-eyebrow-sm text-content-tertiary">{label}</span>
        {hint ? (
          <span className="text-xs text-content-tertiary">{hint}</span>
        ) : null}
      </header>

      <Legend
        primaryHandle={primaryHandle}
        competitorHandle={competitorHandle}
      />

      <div className="mt-3 space-y-3">
        {categories.map((c) => (
          <div key={c.key} className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-2 sm:gap-4 items-center">
            <span className="text-xs sm:text-sm text-content-secondary truncate">
              {c.label}
            </span>
            <div className="space-y-1.5">
              <Bar
                value={c.primary}
                max={maxValue}
                accent="primary"
                formatted={c.primaryFormatted ?? formatValue(c.primary, unit)}
              />
              <Bar
                value={c.competitor}
                max={maxValue}
                accent="secondary"
                formatted={
                  c.competitorFormatted ?? formatValue(c.competitor, unit)
                }
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Legend({
  primaryHandle,
  competitorHandle,
}: {
  primaryHandle: string;
  competitorHandle: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-content-secondary">
      <LegendDot accent="primary" label={`@${primaryHandle}`} />
      <LegendDot accent="secondary" label={`@${competitorHandle}`} />
    </div>
  );
}

function LegendDot({
  accent,
  label,
}: {
  accent: "primary" | "secondary";
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          accent === "primary" ? "bg-accent-primary" : "bg-compare-competitor",
        )}
      />
      <span className="truncate max-w-[10rem]">{label}</span>
    </span>
  );
}

function Bar({
  value,
  max,
  accent,
  formatted,
}: {
  value: number;
  max: number;
  accent: "primary" | "secondary";
  formatted: string;
}) {
  const safeValue = Number.isFinite(value) && value > 0 ? value : 0;
  const pct = Math.min(100, (safeValue / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 flex-1 rounded-full bg-surface-muted overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            accent === "primary" ? "bg-accent-primary" : "bg-compare-competitor",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums text-xs text-content-primary w-14 text-right shrink-0">
        {formatted}
      </span>
    </div>
  );
}

function formatValue(value: number, unit: CompareUnit): string {
  if (!Number.isFinite(value)) return "—";
  switch (unit) {
    case "pp":
    case "percent":
      return `${value.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} %`;
    case "x":
      return `${value.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}×`;
    case "abs":
    default:
      return value.toLocaleString("pt-PT");
  }
}