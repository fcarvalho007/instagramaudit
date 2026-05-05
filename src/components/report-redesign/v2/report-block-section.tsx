import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { REDESIGN_TOKENS } from "../report-tokens";
import type { BlockConfig } from "./block-config";

/** Ordinal labels for chapter markers. */
const CHAPTER_ORDINALS: Record<string, string> = {
  "01": "CAPÍTULO PRIMEIRO",
  "02": "CAPÍTULO SEGUNDO",
  "03": "CAPÍTULO TERCEIRO",
  "04": "CAPÍTULO QUARTO",
  "05": "CAPÍTULO QUINTO",
  "06": "CAPÍTULO SEXTO",
};

interface Props {
  block: BlockConfig;
  /** Banda de fundo alternada para ritmo visual. */
  tone?: "white" | "soft-blue" | "canvas";
  children: ReactNode;
}

/**
 * Wrapper editorial de um bloco da Phase 1A. Apenas desenha o
 * cabeçalho do BLOCO (número grande à esquerda, label mono, pergunta
 * humana em serif, subtítulo curto). Não desenha cabeçalhos por
 * componente — esses já vivem nos componentes filhos locked.
 */
export function ReportBlockSection({ block, tone = "canvas", children }: Props) {
  const band =
    tone === "white"
      ? REDESIGN_TOKENS.bandWhite
      : tone === "soft-blue"
        ? REDESIGN_TOKENS.bandSoftBlue
        : REDESIGN_TOKENS.bandCanvas;

  const ordinal = CHAPTER_ORDINALS[block.number] ?? "";

  return (
    <section
      id={block.id}
      aria-label={block.question}
      className={cn("w-full scroll-mt-20 lg:scroll-mt-6", band)}
    >
      <div className="py-12 md:py-16">
        <header className="mb-0 pb-6 md:pb-8 border-b border-slate-200/50">
          <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-6">
            {/* Large chapter number */}
            <span
              aria-hidden="true"
              className={cn(REDESIGN_TOKENS.chapterNumber, "shrink-0 tabular-nums")}
            >
              {block.number}
            </span>

            {/* Text stack */}
            <div className="min-w-0 max-w-3xl space-y-1.5 md:pt-2">
              {ordinal && (
                <p className={REDESIGN_TOKENS.chapterMeta}>{ordinal}</p>
              )}
              <p className={REDESIGN_TOKENS.eyebrowAccent}>
                {(block.eyebrowOverride ?? block.shortLabel).toUpperCase()}
              </p>
              <h2 className={REDESIGN_TOKENS.h2Section}>{block.question}</h2>
              <p className={cn(REDESIGN_TOKENS.subtitle, "mt-1")}>{block.subtitle}</p>
            </div>
          </div>
        </header>

        <div className="min-w-0 pt-8 md:pt-10 space-y-8 md:space-y-10">{children}</div>
      </div>
    </section>
  );
}
