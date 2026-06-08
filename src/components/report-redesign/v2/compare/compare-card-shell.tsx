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
  /** ARIA label override for the wrapping <section>. */
  ariaLabel?: string;
  id?: string;
  children: ReactNode;
  className?: string;
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
  ariaLabel,
  id,
  children,
  className,
}: Props) {
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
          <h3 className="font-serif text-xl sm:text-2xl text-content-primary leading-snug">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-sm text-content-secondary">{subtitle}</p>
          ) : null}
        </div>
        {!windowAligned ? (
          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-border-subtle bg-surface-muted px-2.5 py-0.5 text-xs text-content-tertiary">
            Concorrente em janela baseline
          </span>
        ) : null}
      </header>

      <div className="mt-4">
        <CompareHandleRow primary={primary} competitor={competitor} />
      </div>

      <div className="mt-6 md:mt-8">{children}</div>

      {footer ? (
        <div className="mt-6 rounded-xl border border-border-subtle bg-surface-muted px-4 py-3 text-sm text-content-secondary leading-relaxed">
          {footer}
        </div>
      ) : null}
    </section>
  );
}