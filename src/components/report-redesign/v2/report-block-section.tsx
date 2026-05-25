import type { ReactNode } from "react";
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

  return (
    <section
      id={block.id}
      aria-label={question}
      className={cn("w-full scroll-mt-20 lg:scroll-mt-6", band)}
    >
      <div className={cn(first ? "pt-0 pb-14 md:pt-0 md:pb-24" : "py-14 md:py-24")}>
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
                {eyebrow.toUpperCase()}
              </p>
              <h2 className={REDESIGN_TOKENS.h2Section}>{question}</h2>
              <p className={cn(REDESIGN_TOKENS.chapterSubtitle)}>{subtitle}</p>
            </div>
          </div>
        </header>

        <div className="min-w-0 pt-10 md:pt-12 space-y-8 md:space-y-10">{children}</div>
      </div>
    </section>
  );
}
