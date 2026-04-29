import { cn } from "@/lib/utils";

interface ReportSectionFrameProps {
  /** Eyebrow curto em mono — ex.: "02 · Resposta da audiência". */
  eyebrow: string;
  /** Título editorial em Fraunces. */
  title: string;
  /** Descrição humana, opcional. */
  subtitle?: string;
  /** Acção opcional alinhada à direita do header. */
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Tom de fundo da secção. */
  tone?: "calm" | "soft-cyan" | "soft-violet" | "plain";
  /** Espaçamento vertical entre secções. */
  spacing?: "default" | "tight";
  /** ID âncora opcional. */
  id?: string;
  /** Aria-label opcional, fallback ao title. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Frame editorial reutilizável usado pelo redesign de
 * `/analyze/$username`. Garante hierarquia tipográfica consistente
 * (eyebrow mono · título Fraunces · subtítulo) e fundos diferenciados
 * para criar ritmo entre secções (calmas vs hero-soft).
 *
 * Não toca em componentes locked — apenas envolve.
 */
export function ReportSectionFrame({
  eyebrow,
  title,
  subtitle,
  action,
  children,
  tone = "plain",
  spacing = "default",
  id,
  ariaLabel,
  className,
}: ReportSectionFrameProps) {
  const toneClass =
    tone === "soft-cyan"
      ? "bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.08),transparent_60%)]"
      : tone === "soft-violet"
        ? "bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.08),transparent_60%)]"
        : tone === "calm"
          ? "bg-surface-secondary/25"
          : "";
  const verticalPad =
    spacing === "tight" ? "py-8 md:py-10" : "py-12 md:py-16";

  return (
    <section
      id={id}
      aria-label={ariaLabel ?? title}
      className={cn("w-full", toneClass, verticalPad, className)}
    >
      <div className="mx-auto max-w-7xl px-5 md:px-6">
        <header className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2 max-w-2xl min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-content-tertiary">
              {eyebrow}
            </p>
            <h2 className="font-display text-2xl md:text-[2rem] font-medium tracking-tight text-content-primary leading-[1.15]">
              {title}
            </h2>
            {subtitle ? (
              <p className="text-sm md:text-[15px] text-content-secondary leading-relaxed">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}