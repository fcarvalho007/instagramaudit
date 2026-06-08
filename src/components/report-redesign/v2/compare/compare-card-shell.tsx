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
   * - "default" (current): used by every standard compare card.
   * - "hero": stronger title scale + identity row prominence, used by
   *   the Phase 2 distribution cards (Format Mix, Weekday Rhythm).
   */
  density?: "default" | "hero";
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
  const hero = density === "hero";
  return (
    <section
      id={id}
      aria-label={ariaLabel ?? `${title}: comparação com concorrente`}
      className={cn(
        "rounded-2xl border border-border-default bg-surface-primary shadow-card",
        "p-6 sm:p-8",
        className,
      )}
    >
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="min-w-0">
          <h3
            className={cn(
              "font-serif text-content-primary leading-snug tracking-tight",
              hero ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
            )}
          >
            {title}
          </h3>
          {subtitle ? (
            <p
              className={cn(
                "text-content-secondary",
                hero ? "mt-1.5 text-sm sm:text-base" : "mt-1 text-sm",
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {!windowAligned ? (
          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-border-subtle bg-surface-muted px-2.5 py-0.5 text-xs text-content-tertiary">
            Concorrente em janela baseline
          </span>
        ) : null}
      </header>

      <div className={cn(hero ? "mt-5" : "mt-4")}>
        <CompareHandleRow
          primary={primary}
          competitor={competitor}
          prominence={hero ? "strong" : "default"}
        />
      </div>

      <div className={cn(hero ? "mt-8 sm:mt-10" : "mt-6 md:mt-8")}>{children}</div>

      {footer ? (
        hero ? (
          <div className="mt-8 rounded-xl border border-border-subtle bg-surface-muted px-5 py-4">
            <p className="text-eyebrow-sm text-content-tertiary mb-1.5">
              {footerEyebrow}
            </p>
            <p className="text-sm sm:text-base text-content-secondary leading-relaxed">
              {footer}
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-border-subtle bg-surface-muted px-4 py-3 text-sm text-content-secondary leading-relaxed">
            {footer}
          </div>
        )
      ) : null}
    </section>
  );
}