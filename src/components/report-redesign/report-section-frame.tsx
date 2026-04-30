import { cn } from "@/lib/utils";

import { REDESIGN_TOKENS } from "./report-tokens";

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
  tone?: "plain" | "white" | "soft-blue" | "calm" | "soft-cyan" | "soft-violet";
  /** Espaçamento vertical entre secções. */
  spacing?: "default" | "tight";
  /** ID âncora opcional. */
  id?: string;
  /** Aria-label opcional, fallback ao title. */
  ariaLabel?: string;
  className?: string;
  /**
   * Se `true`, o conteúdo é envolvido num card branco elevado.
   * Usado para todas as secções analíticas L2 do redesign Iconosquare.
   */
  framed?: boolean;
  /**
   * Se `true`, suprime o cabeçalho (eyebrow + h2 + subtitle) e
   * reduz o padding vertical. Usado quando o frame está aninhado
   * dentro de um wrapper que já fornece a pergunta editorial
   * dominante (ex.: `ReportBlockSection` no `ReportShellV2`).
   * Default: `false` — comportamento original preservado para todos
   * os consumidores actuais.
   */
  compact?: boolean;
}

/**
 * Frame editorial reutilizável usado pelo redesign de
 * `/analyze/$username`. Garante hierarquia tipográfica consistente
 * (eyebrow mono · h2 display · subtítulo) e fundos diferenciados.
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
  framed = false,
  compact = false,
}: ReportSectionFrameProps) {
  const toneClass =
    tone === "white"
      ? REDESIGN_TOKENS.bandWhite
      : tone === "soft-blue" || tone === "soft-cyan"
        ? REDESIGN_TOKENS.bandSoftBlue
        : tone === "soft-violet"
          ? REDESIGN_TOKENS.bandSoftBlue
          : tone === "calm"
            ? REDESIGN_TOKENS.bandSoftBlue
            : REDESIGN_TOKENS.bandCanvas;
  const verticalPad = compact
    ? "py-6 md:py-8"
    : spacing === "tight"
      ? "py-8 md:py-10"
      : "py-10 md:py-14";

  return (
    <section
      id={id}
      aria-label={ariaLabel ?? title}
      className={cn("w-full", toneClass, verticalPad, className)}
    >
      <div className="mx-auto max-w-7xl px-5 md:px-6">
        {compact ? (
          action ? (
            <header className="mb-4 flex justify-end">
              <div className="shrink-0">{action}</div>
            </header>
          ) : null
        ) : (
          <header className="mb-6 md:mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2 max-w-2xl min-w-0">
              <p className={REDESIGN_TOKENS.eyebrowAccent}>{eyebrow}</p>
              <h2 className={REDESIGN_TOKENS.h2Section}>{title}</h2>
              {subtitle ? (
                <p className={REDESIGN_TOKENS.subtitle}>{subtitle}</p>
              ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </header>
        )}
        <div className="min-w-0">
          {framed ? (
            <div className={cn(REDESIGN_TOKENS.card, "p-5 md:p-8")}>
              {children}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </section>
  );
}