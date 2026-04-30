import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { REDESIGN_TOKENS } from "../report-tokens";
import type { BlockConfig } from "./block-config";

interface Props {
  block: BlockConfig;
  /** Banda de fundo alternada para ritmo visual. */
  tone?: "white" | "soft-blue" | "canvas";
  children: ReactNode;
}

/**
 * Wrapper editorial de um bloco da Phase 1A. Apenas desenha o
 * cabeçalho do BLOCO (eyebrow numerado, pergunta humana em serif,
 * subtítulo curto). Não desenha cabeçalhos por componente — esses
 * já vivem nos componentes filhos locked.
 */
export function ReportBlockSection({ block, tone = "canvas", children }: Props) {
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
      <div className="py-10 md:py-14">
        <header className="mb-6 md:mb-8 max-w-3xl space-y-2">
          <p className={REDESIGN_TOKENS.eyebrowAccent}>
            BLOCO {block.number} · {block.shortLabel.toUpperCase()}
          </p>
          <h2 className={REDESIGN_TOKENS.h2Section}>{block.question}</h2>
          <p className={REDESIGN_TOKENS.subtitle}>{block.subtitle}</p>
        </header>
        <div className="min-w-0 space-y-8 md:space-y-10">{children}</div>
      </div>
    </section>
  );
}
