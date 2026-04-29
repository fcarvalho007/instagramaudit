import { cn } from "@/lib/utils";

import { REDESIGN_TOKENS } from "./report-tokens";

interface Props {
  /** Banda alternada para ritmo visual (white | soft-blue | canvas). */
  tone?: "white" | "soft-blue" | "canvas";
  /** Aria-label obrigatório (a section interna locked tem o título visível). */
  ariaLabel: string;
  /** ID âncora opcional. */
  id?: string;
  children: React.ReactNode;
  spacing?: "default" | "tight";
}

/**
 * Wrapper de framing apenas: aplica banda + card branco elevado em
 * volta de componentes locked que JÁ trazem o seu próprio
 * `<ReportSection>` header. Não renderiza eyebrow/h2/subtítulo —
 * evita duplo cabeçalho no redesign Iconosquare-style.
 */
export function ReportFramedBlock({
  tone = "canvas",
  ariaLabel,
  id,
  children,
  spacing = "default",
}: Props) {
  const band =
    tone === "white"
      ? REDESIGN_TOKENS.bandWhite
      : tone === "soft-blue"
        ? REDESIGN_TOKENS.bandSoftBlue
        : REDESIGN_TOKENS.bandCanvas;
  const pad = spacing === "tight" ? "py-8 md:py-10" : "py-10 md:py-14";
  return (
    <section id={id} aria-label={ariaLabel} className={cn("w-full", band, pad)}>
      <div className="mx-auto max-w-7xl px-5 md:px-6">
        <div className={cn(REDESIGN_TOKENS.card, "p-5 md:p-8")}>{children}</div>
      </div>
    </section>
  );
}