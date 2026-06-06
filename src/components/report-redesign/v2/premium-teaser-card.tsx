import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PUBLIC_PRODUCTS } from "@/lib/payments/products";
import { usePremiumCta, type PremiumCtaSource } from "./premium-cta-context";

export type TeaserPreviewVariant =
  | "frequency"
  | "format"
  | "publications"
  | "diagnostic"
  | "priorities";

export interface PremiumTeaserCardProps {
  /** Section number rendered in the left chip (e.g. "03"). */
  number: string;
  /** Short uppercase category label (e.g. "FREQUÊNCIA EDITORIAL"). */
  eyebrow: string;
  /** Editorial title — visible, not blurred. */
  title: string;
  /** Short value proposition under the title. */
  description: string;
  /** Anchor id so the sidebar TOC can scroll to this card. */
  anchorId: string;
  /** Tracking source forwarded to PremiumCtaProvider. */
  source: PremiumCtaSource;
  /** Optional compact list of locked sub-items (e.g. 7 diagnostic questions
   *  for section 06). Rendered as chip labels above the blurred preview. */
  subItems?: readonly string[];
  /** Section-specific blurred skeleton variant. Defaults to generic bars. */
  previewVariant?: TeaserPreviewVariant;
  className?: string;
}

/**
 * Locked premium teaser card used in the FREE-with-engagement flow.
 * Shows section number, category, title and value prop fully, with a
 * blurred decorative preview and a CTA "Desbloquear por {priceLabel}".
 *
 * Pricing is read from `PUBLIC_PRODUCTS.report_full_9.priceLabel` — never
 * hardcoded. The CTA is wired into `usePremiumCta()` so unlock logic,
 * checkout and entitlements remain untouched.
 */
export function PremiumTeaserCard({
  number,
  eyebrow,
  title,
  description,
  anchorId,
  source,
  subItems,
  previewVariant,
  className,
}: PremiumTeaserCardProps) {
  const { handlePremiumAccessClick } = usePremiumCta();
  const priceLabel = PUBLIC_PRODUCTS.report_full_9.priceLabel;

  return (
    <section
      id={anchorId}
      className={cn(
        "scroll-mt-24 rounded-2xl border border-border-default bg-surface-base shadow-card",
        "p-5 md:p-7 overflow-hidden",
        className,
      )}
    >
      {/* Header: number chip · eyebrow + title · premium badge */}
      <div className="flex items-start gap-4 md:gap-5">
        <div
          aria-hidden="true"
          className={cn(
            "shrink-0 flex items-center justify-center",
            "size-11 md:size-12 rounded-xl",
            "bg-surface-muted text-content-primary",
            "font-sans font-semibold tabular-nums text-base md:text-lg",
          )}
        >
          {number}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-eyebrow-sm text-accent-primary">{eyebrow}</p>
          <h3 className="mt-1 font-display text-lg md:text-2xl leading-tight text-content-primary">
            {title}
          </h3>
        </div>

        <span
          className={cn(
            "hidden sm:inline-flex items-center gap-1.5 shrink-0",
            "rounded-full border border-border-default bg-surface-muted",
            "px-2.5 py-1 text-[11px] font-medium text-content-secondary",
          )}
        >
          <Lock className="size-3" aria-hidden="true" />
          Premium
        </span>
      </div>

      <p className="mt-3 md:mt-4 text-sm md:text-[15px] leading-relaxed text-content-secondary md:pl-[68px]">
        {description}
      </p>

      {subItems && subItems.length > 0 && (
        <ul
          role="list"
          className="mt-4 md:pl-[68px] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5"
        >
          {subItems.map((label) => (
            <li
              key={label}
              role="listitem"
              className={cn(
                "inline-flex items-center gap-1.5",
                "rounded-md border border-border-default/60 bg-surface-muted/40",
                "px-2 py-1 text-[12px] text-content-secondary",
              )}
            >
              <Lock className="size-3 text-content-tertiary shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Blurred decorative preview + CTA */}
      <div className="relative mt-5 md:mt-6 md:pl-[68px]">
        <div
          aria-hidden="true"
          className="relative h-[160px] md:h-[200px] rounded-xl overflow-hidden bg-surface-muted/60"
        >
          <div className="absolute inset-0 p-4 md:p-5 opacity-70 blur-[5px]">
            <TeaserPreview variant={previewVariant} />
          </div>
          {/* Soft fade for readability */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.70) 100%)",
            }}
          />
        </div>

        {/* CTA centered over the blur */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={() => handlePremiumAccessClick(source)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full",
              "bg-surface-base border border-border-default shadow-sm",
              "px-4 py-2 text-sm font-semibold text-content-primary",
              "hover:bg-surface-muted/60 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2",
            )}
            aria-label={`Desbloquear secção por ${priceLabel}`}
          >
            <Lock className="size-3.5" aria-hidden="true" />
            Desbloquear por {priceLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section-specific blurred skeletons (pure presentational, aria-hidden)     */
/* -------------------------------------------------------------------------- */

function TeaserPreview({ variant }: { variant?: TeaserPreviewVariant }) {
  switch (variant) {
    case "frequency":
      return <FrequencyPreview />;
    case "format":
      return <FormatPreview />;
    case "publications":
      return <PublicationsPreview />;
    case "diagnostic":
      return <DiagnosticPreview />;
    case "priorities":
      return <PrioritiesPreview />;
    default:
      return <GenericPreview />;
  }
}

function GenericPreview() {
  return (
    <div className="flex flex-col justify-center gap-2.5 h-full">
      <div className="h-2.5 rounded-full bg-accent-primary/30 w-[82%]" />
      <div className="h-2.5 rounded-full bg-content-tertiary/25 w-[58%]" />
      <div className="h-2.5 rounded-full bg-accent-primary/20 w-[71%]" />
      <div className="h-2.5 rounded-full bg-content-tertiary/20 w-[44%]" />
    </div>
  );
}

function KpiTile() {
  return (
    <div className="flex-1 rounded-lg border border-border-default/60 bg-surface-base/70 p-2 flex flex-col gap-1.5">
      <div className="h-1.5 w-10 rounded-full bg-content-tertiary/30" />
      <div className="h-3.5 w-12 rounded bg-accent-primary/40" />
      <div className="h-1 w-8 rounded-full bg-content-tertiary/25" />
    </div>
  );
}

function FrequencyPreview() {
  const bars = [60, 35, 80, 50, 70, 25, 45];
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex gap-2">
        <KpiTile />
        <KpiTile />
        <KpiTile />
      </div>
      <div className="flex items-end gap-1.5 h-12">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-accent-primary/35"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="h-2 rounded-full bg-content-tertiary/25 w-[70%]" />
    </div>
  );
}

function FormatPreview() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        <div className="bg-accent-primary/50" style={{ width: "55%" }} />
        <div className="bg-accent-primary/30" style={{ width: "28%" }} />
        <div className="bg-content-tertiary/30" style={{ width: "17%" }} />
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 aspect-[3/4] rounded-md bg-surface-base/70 border border-border-default/60"
          />
        ))}
      </div>
      <div className="flex gap-3 mt-auto">
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-accent-primary/60" />
          <div className="h-1.5 w-10 rounded-full bg-content-tertiary/30" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-accent-primary/40" />
          <div className="h-1.5 w-12 rounded-full bg-content-tertiary/30" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-content-tertiary/40" />
          <div className="h-1.5 w-8 rounded-full bg-content-tertiary/30" />
        </div>
      </div>
    </div>
  );
}

function PublicationsPreview() {
  const dots = [
    [15, 70],
    [28, 45],
    [40, 80],
    [55, 30],
    [62, 60],
    [72, 25],
    [82, 55],
    [90, 75],
  ];
  return (
    <div className="flex gap-3 h-full">
      <div className="flex-1 relative rounded-md border border-border-default/60 bg-surface-base/60 overflow-hidden">
        <div className="absolute left-0 right-0 bottom-2 h-px bg-content-tertiary/30" />
        <div className="absolute top-2 bottom-2 left-2 w-px bg-content-tertiary/30" />
        {dots.map(([x, y], i) => (
          <div
            key={i}
            className="absolute size-2 rounded-full bg-accent-primary/60"
            style={{ left: `${x}%`, bottom: `${y}%` }}
          />
        ))}
      </div>
      <div className="hidden sm:flex w-32 flex-col gap-2">
        <div className="flex-1 rounded-md border border-border-default/60 bg-surface-base/70 p-2 flex flex-col gap-1.5">
          <div className="h-1.5 w-10 rounded-full bg-accent-primary/50" />
          <div className="h-3 w-full rounded bg-content-tertiary/25" />
          <div className="h-1.5 w-8 rounded-full bg-content-tertiary/30 mt-auto" />
        </div>
        <div className="flex-1 rounded-md border border-border-default/60 bg-surface-base/70 p-2 flex flex-col gap-1.5">
          <div className="h-1.5 w-10 rounded-full bg-content-tertiary/40" />
          <div className="h-3 w-full rounded bg-content-tertiary/25" />
          <div className="h-1.5 w-8 rounded-full bg-content-tertiary/30 mt-auto" />
        </div>
      </div>
    </div>
  );
}

function DiagnosticPreview() {
  return (
    <div className="grid grid-cols-2 gap-2 h-full">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-md border border-border-default/60 bg-surface-base/70 p-2 flex gap-2"
        >
          <div className="size-3 rounded-full bg-accent-primary/40 shrink-0 mt-0.5" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-1.5 w-[70%] rounded-full bg-content-tertiary/35" />
            <div className="h-1.5 w-[50%] rounded-full bg-content-tertiary/25" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PrioritiesPreview() {
  const rows = [
    "bg-accent-primary/60",
    "bg-amber-500/50",
    "bg-emerald-500/50",
  ];
  return (
    <div className="flex flex-col gap-2 h-full justify-center">
      {rows.map((dot, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-md border border-border-default/60 bg-surface-base/70 p-2.5"
        >
          <div className={cn("size-3 rounded-full shrink-0", dot)} />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-1.5 w-[60%] rounded-full bg-content-tertiary/35" />
            <div className="h-1.5 w-[80%] rounded-full bg-content-tertiary/25" />
          </div>
        </div>
      ))}
    </div>
  );
}