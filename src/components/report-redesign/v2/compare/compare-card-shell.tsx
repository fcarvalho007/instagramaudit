import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CompareHandleRow, type CompareHandleSide } from "./compare-handle-row";

interface Props {
  /** Fraunces H3 title — always shown. */
  title: string;
  /** Optional small Inter line under the title (e.g. "Publicações por semana"). */
  subtitle?: string;
  /** When false, renders the "Concorrente em janela baseline" pill chip. */
  windowAligned: boolean;
  primary: CompareHandleSide;
  competitor: CompareHandleSide;
  /** Deterministic insight string or node, rendered in the footer panel. */
  footer?: ReactNode;
  /** Eyebrow shown above the footer string (default: "Leitura"). */
  footerEyebrow?: string;
  /** ARIA label override for the wrapping <section>. */
  ariaLabel?: string;
  id?: string;
  children: ReactNode;
  className?: string;
  /**
   * Unified editorial density. All compare cards render at the same
   * "hero" tier; the only difference is `anchor`, which adds a 3-px
   * accent left rule reserved for the section-anchor identity card.
   * The `default` value is kept for back-compat and rendered identically
   * to `hero`.
   */
  density?: "default" | "hero" | "anchor";
}

/**
 * Shared shell for every Pro compare card. Owns: white card chrome,
 * Fraunces title, baseline hint chip placement, identity row, footer
 * insight panel. The card body is provided by the caller (stat block,
 * bar pair, table — all in `bare` mode).
 */
export function CompareCardShell({
  title,
  subtitle,
  windowAligned,
  primary,
  competitor,
  footer,
  footerEyebrow = "Leitura",
  ariaLabel,
  id,
  children,
  className,
  density = "default",
}: Props) {
  const anchor = density === "anchor";
  return (
    <section
      id={id}
      aria-label={ariaLabel ?? `${title}: comparação com concorrente`}
      className={cn(
        "rounded-2xl border border-border-default bg-surface-primary shadow-card",
        anchor ? "p-7 sm:p-9 border-l-[3px] border-l-[var(--accent-primary)]" : "p-6 sm:p-8",
        className,
      )}
    >
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="min-w-0">
          <h3
            className={cn(
              "font-serif text-content-primary leading-snug tracking-tight",
              anchor
                ? "text-2xl sm:text-3xl md:text-[2.25rem]"
                : "text-2xl sm:text-3xl",
            )}
          >
            {title}
          </h3>
          {subtitle ? (
            <p
              className={cn(
                "text-content-secondary",
                anchor
                  ? "mt-2 text-sm sm:text-base font-medium"
                  : "mt-1.5 text-sm sm:text-base",
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {!windowAligned ? (
          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-border-subtle bg-surface-muted px-2.5 py-1 text-xs text-content-tertiary">
            Concorrente em janela baseline
          </span>
        ) : null}
      </header>

      <div className={cn(anchor ? "mt-6" : "mt-5")}>
        <CompareHandleRow
          primary={primary}
          competitor={competitor}
          prominence="strong"
        />
      </div>

      <div
        className={cn(
          anchor
            ? "mt-10 sm:mt-12"
            : "mt-8 sm:mt-10",
        )}
      >
        {children}
      </div>

      {footer ? (
        <div
          className={cn(
            "rounded-xl border border-border-subtle bg-surface-muted px-5 py-4",
            anchor ? "mt-10" : "mt-8",
          )}
        >
          <p className="text-eyebrow-sm text-content-tertiary mb-1.5">
            {footerEyebrow}
          </p>
          <p className="text-sm sm:text-base text-content-secondary leading-relaxed">
            {footer}
          </p>
        </div>
      ) : null}
    </section>
  );
}