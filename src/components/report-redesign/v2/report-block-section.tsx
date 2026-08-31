import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { REDESIGN_TOKENS } from "../report-tokens";
import type { BlockConfig } from "./block-config";

interface Props {
  block: BlockConfig;
  /** Banda de fundo alternada para ritmo visual. */
  tone?: "white" | "soft-blue" | "canvas";
  /** First section in the report — uses reduced top padding so the
   *  section title aligns with the sidebar card top edge. */
  first?: boolean;
  children: ReactNode;
}

/**
 * Wrapper editorial de um bloco da Phase 1A. Desenha o cabeçalho
 * cinematic do BLOCO: número grande decorativo à esquerda,
 * label + pergunta humana em serif + subtítulo.
 */
export function ReportBlockSection({ block, tone = "canvas", first, children }: Props) {
  const { t } = useTranslation("report");
  const band =
    tone === "white"
      ? REDESIGN_TOKENS.bandWhite
      : tone === "soft-blue"
        ? REDESIGN_TOKENS.bandSoftBlue
        : REDESIGN_TOKENS.bandCanvas;

  const shortLabel = t(`blocks.${block.id}.short`, { defaultValue: block.shortLabel });
  const question = t(`blocks.${block.id}.question`, { defaultValue: block.question });
  const subtitle = t(`blocks.${block.id}.subtitle`, { defaultValue: block.subtitle });
  const eyebrow = block.eyebrowOverride
    ? t(`blocks.${block.id}.eyebrow`, { defaultValue: block.eyebrowOverride })
    : shortLabel;

  // Reading-progress for the current block. Computes how much of the
  // section has scrolled past the viewport top. Stays at 0 while the
  // block is below the fold, animates 0→100 as the user reads through.
  const sectionRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const compute = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      // Scrolled = how far past the top (clamped). When the bottom is
      // above the viewport bottom we treat as fully read.
      const scrolled = Math.min(total, Math.max(0, -rect.top + vh * 0.15));
      const pct = Math.max(0, Math.min(100, (scrolled / total) * 100));
      setProgress(pct);
    };
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, []);

  const showProgress = progress > 0 && progress < 100;

  return (
    <section
      ref={sectionRef}
      id={block.id}
      aria-label={question}
      className={cn("w-full scroll-mt-20 lg:scroll-mt-6", band)}
    >
      {/* Reading-progress bar — visible only while the user is reading
          this block. Decorative, non-interactive. */}
      <div
        className="relative h-0.5 w-full overflow-hidden"
        aria-hidden="true"
      >
        <div
          className={cn(
            "h-full bg-accent-primary/60 transition-[width,opacity] duration-150 ease-out",
            showProgress ? "opacity-100" : "opacity-0",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className={cn(first ? "pt-0 pb-8 md:pt-0 md:pb-12" : "py-8 md:py-12")}>
        <header className="mb-0 pb-5 md:pb-6 border-t border-border-subtle pt-6 md:pt-8">
          <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-6">
            {/* Chapter marker — caixa em desktop, número inline em mobile */}
            <div className={REDESIGN_TOKENS.chapterNumberBox}>
              <span
                aria-hidden="true"
                className={cn(REDESIGN_TOKENS.chapterNumber, "tabular-nums")}
              >
                {block.number}
              </span>
            </div>

            {/* Text stack */}
            <div className="min-w-0 max-w-[820px] space-y-1.5 md:space-y-2.5 md:pt-1">
              <p className={REDESIGN_TOKENS.chapterLabel}>
                <span
                  aria-hidden="true"
                  className={cn(REDESIGN_TOKENS.chapterNumberInline, "mr-2")}
                >
                  {block.number}
                </span>
                {eyebrow.toUpperCase()}
              </p>
              <h2 className={REDESIGN_TOKENS.h2Section}>{question}</h2>
              <p className={cn(REDESIGN_TOKENS.chapterSubtitle)}>{subtitle}</p>
            </div>
          </div>
        </header>

        <div className="min-w-0 pt-5 md:pt-6 space-y-6 md:space-y-8">{children}</div>
      </div>
    </section>
  );
}
