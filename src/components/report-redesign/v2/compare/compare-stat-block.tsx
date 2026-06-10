import { cn } from "@/lib/utils";
import { buildDelta, buildDeltaPair } from "./compare-delta";
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
  /**
   * Visual shell variant:
   * - "card" (default): self-contained section with border + surface bg
   *   and an internal eyebrow header. Use as a standalone block.
   * - "bare": no outer shell, no eyebrow — the parent already provides
   *   the white card chrome and Fraunces title. Renders only the side
   *   panels + `vs` + per-side text.
   */
  variant?: "card" | "bare";
}

/**
 * Padrão 1 — single-number comparison.
 *
 * Two tinted panels side-by-side on ≥sm, stacked on mobile. Primary is
 * blue-tinted, competitor is indigo-tinted, with a plain `vs` separator
 * between them. Each side renders an optional `subText` line under the
 * value (e.g. "↓ abaixo do concorrente", "4,8× o teu valor"). When the
 * caller omits `subText` on both sides, the block falls back to its
 * legacy centered delta chip for back-compat.
 */
export function CompareStatBlock({
  label,
  primary,
  competitor,
  unit,
  higherIsBetter = true,
  hint,
  variant = "card",
}: CompareStatBlockProps) {
  // Decide whether to show per-side text or fall back to legacy chip.
  const hasCallerSubText = Boolean(primary.subText || competitor.subText);
  const pair = hasCallerSubText
    ? null
    : buildDeltaPair(primary.value, competitor.value, unit, higherIsBetter);
  const primarySub = primary.subText ?? pair?.primarySubText ?? "";
  const competitorSub = competitor.subText ?? pair?.competitorSubText ?? "";
  const showLegacyChip = !hasCallerSubText && !pair; // safety fallback only

  const body = (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-3 sm:gap-4">
        <Side side={primary} accent="primary" subText={primarySub} />
        <div className="flex items-center justify-center sm:min-w-10 sm:px-2">
          <span
            aria-hidden="true"
            className="font-serif text-xl sm:text-2xl text-content-tertiary tracking-tight"
          >
            vs
          </span>
        </div>
        <Side side={competitor} accent="competitor" subText={competitorSub} />
      </div>
      {showLegacyChip ? <LegacyChip {...{ primary, competitor, unit, higherIsBetter }} /> : null}
    </>
  );

  if (variant === "bare") {
    return (
      <div
        className="min-w-0"
        aria-label={`${label}: comparação com concorrente`}
      >
        {body}
      </div>
    );
  }

  return (
    <section
      className="rounded-2xl border border-border-default bg-surface-primary shadow-card p-5 sm:p-6"
      aria-label={`${label}: comparação com concorrente`}
    >
      <header className="flex flex-col gap-1 mb-5">
        <h3 className="font-serif text-xl sm:text-2xl text-content-primary leading-snug">
          {label}
        </h3>
        {hint ? (
          <span className="text-xs text-content-tertiary">{hint}</span>
        ) : null}
      </header>
      {body}
    </section>
  );
}

function Side({
  side,
  accent,
  subText,
}: {
  side: CompareSide;
  accent: "primary" | "competitor";
  subText: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-5 py-6 sm:px-6 sm:py-7 min-w-0",
        accent === "primary"
          ? "border-accent-primary/30 bg-accent-primary/8"
          : "border-compare-competitor/30 bg-compare-competitor/8",
      )}
    >
      <span
        className={cn(
          "text-eyebrow-sm truncate max-w-full",
          accent === "primary"
            ? "text-accent-primary"
            : "text-compare-competitor",
        )}
      >
        @{side.handle}
      </span>
      <span
        className="tabular-nums font-semibold text-content-primary leading-[1.05] min-w-0 overflow-hidden whitespace-nowrap text-2xl sm:text-3xl md:text-4xl"
        title={side.title ?? side.formatted}
      >
        {side.formatted}
      </span>
      {subText ? (
        <span className="text-sm text-content-secondary leading-snug">{subText}</span>
      ) : null}
    </div>
  );
}

/** Back-compat safety: only used if buildDeltaPair returns null (it doesn't today). */
function LegacyChip({
  primary,
  competitor,
  unit,
  higherIsBetter,
}: {
  primary: CompareSide;
  competitor: CompareSide;
  unit: CompareUnit;
  higherIsBetter: boolean;
}) {
  const delta = buildDelta(primary.value, competitor.value, unit, higherIsBetter);
  return (
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
  );
}