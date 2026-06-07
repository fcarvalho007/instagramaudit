import { cn } from "@/lib/utils";
import { buildDelta } from "./compare-delta";
import type { CompareSide, CompareUnit } from "./compare-types";

interface CompareStatBlockProps {
  /** Eyebrow / label above the comparison (e.g. "Envolvimento médio"). */
  label: string;
  primary: CompareSide;
  competitor: CompareSide;
  /** Drives the delta math + unit suffix. */
  unit: CompareUnit;
  /** Used to colour the delta chip. Defaults to true. */
  higherIsBetter?: boolean;
  /** Optional hint shown under the label (e.g. "últimos 30 dias"). */
  hint?: string;
}

/**
 * Padrão 1 — single-number comparison.
 *
 * Two equal blocks side-by-side on ≥sm, stacked on mobile. A neutral "vs"
 * pill sits between them, and a deterministic delta chip appears below the
 * pair. Pure presentation — caller supplies pre-formatted values.
 */
export function CompareStatBlock({
  label,
  primary,
  competitor,
  unit,
  higherIsBetter = true,
  hint,
}: CompareStatBlockProps) {
  const delta = buildDelta(primary.value, competitor.value, unit, higherIsBetter);

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

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-stretch gap-3">
        <Side side={primary} accent="primary" align="start" />
        <div className="flex items-center justify-center">
          <span
            aria-hidden="true"
            className="rounded-full border border-border-subtle bg-surface-primary px-2 py-0.5 text-eyebrow-sm text-content-tertiary"
          >
            vs
          </span>
        </div>
        <Side side={competitor} accent="secondary" align="end" />
      </div>

      <div className="mt-3 flex justify-center">
        <span
          className={cn(
            "tabular-nums rounded-md border px-2 py-0.5 text-xs font-medium",
            delta.tone === "positive" &&
              "border-signal-success/30 bg-signal-success/10 text-signal-success",
            delta.tone === "negative" &&
              "border-signal-danger/30 bg-signal-danger/10 text-signal-danger",
            delta.tone === "neutral" &&
              "border-border-subtle bg-surface-muted text-content-secondary",
          )}
        >
          {delta.label}
        </span>
      </div>
    </section>
  );
}

function Side({
  side,
  accent,
  align,
}: {
  side: CompareSide;
  accent: "primary" | "secondary";
  align: "start" | "end";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg bg-surface-primary border border-border-subtle px-3 py-3 min-w-0",
        align === "end" ? "sm:items-end" : "sm:items-start",
      )}
    >
      <span className="flex items-center gap-2 text-xs text-content-secondary truncate max-w-full">
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full shrink-0",
            accent === "primary" ? "bg-accent-primary" : "bg-accent-secondary",
          )}
        />
        <span className="truncate">@{side.handle}</span>
      </span>
      <span className="tabular-nums text-2xl font-semibold text-content-primary">
        {side.formatted}
      </span>
    </div>
  );
}