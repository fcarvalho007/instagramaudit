import type { ReactNode } from "react";

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
  const band =
    tone === "white"
      ? REDESIGN_TOKENS.bandWhite
      : tone === "soft-blue"
        ? REDESIGN_TOKENS.bandSoftBlue
        : REDESIGN_TOKENS.bandCanvas;

  return (
    <section
      id={block.id}
      aria-label={block.question}
      className={cn("w-full scroll-mt-20 lg:scroll-mt-6", band)}
    >
      <div className={cn(first ? "pt-0 pb-14 md:pt-0 md:pb-20" : "py-14 md:py-20")}>
        <header className="mb-0 pb-8 md:pb-10 border-t border-border-subtle pt-8 md:pt-10">
          <div className="flex flex-col md:flex-row md:items-start gap-5 md:gap-8">
            {/* Large chapter number */}
            <div className={REDESIGN_TOKENS.chapterNumberBox}>
              <span
                aria-hidden="true"
                className={cn(REDESIGN_TOKENS.chapterNumber, "tabular-nums")}
              >
                {block.number}
              </span>
            </div>

            {/* Text stack */}
            <div className="min-w-0 max-w-[900px] space-y-2 md:space-y-3 md:pt-1">
              <p className={REDESIGN_TOKENS.chapterLabel}>
                {(block.eyebrowOverride ?? block.shortLabel).toUpperCase()}
              </p>
              <h2 className={REDESIGN_TOKENS.h2Section}>{block.question}</h2>
              <p className={cn(REDESIGN_TOKENS.chapterSubtitle)}>{block.subtitle}</p>
            </div>
          </div>
        </header>

        <div className="min-w-0 pt-10 md:pt-12 space-y-8 md:space-y-10">{children}</div>
      </div>
    </section>
  );
}
