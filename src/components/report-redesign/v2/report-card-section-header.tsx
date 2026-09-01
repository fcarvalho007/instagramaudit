/**
 * ReportCardSectionHeader — header editorial unificado para cartões de
 * secção do relatório (Engagement, Frequência, Formato, Melhores e piores
 * publicações, Temas, …).
 *
 * Substitui os múltiplos `<h3 className="font-display text-[…] …">`
 * duplicados pelos cartões. Garante:
 *  - mesma família (Fraunces)
 *  - mesmo tamanho responsivo (24/28/32px)
 *  - mesmo peso, tracking, leading
 *  - mesma posição e estilo de eyebrow
 *  - mesma regra de qualifier inline (com underline tonal subtil)
 *  - mesmo spacing inferior
 *
 * Não altera dados, cálculos ou copy — apenas apresentação.
 *
 * Regras canónicas (header consistency hotfix):
 *  - o qualifier é SEMPRE inline, dentro do mesmo `<h3>` do título;
 *    quebras de linha em ecrãs estreitos são naturais, nunca forçadas;
 *  - não existe variante em bloco — o padrão de referência é o card
 *    Engagement ("Taxa de Engagement Baixa");
 *  - não renderizar eyebrow que apenas repita o título (regra de
 *    não-redundância). O eyebrow só é usado quando acrescenta uma
 *    categoria ou contexto que o título não contém.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  REPORT_SECTION_HEADER_TOKENS as T,
  REPORT_SECTION_QUALIFIER_UNDERLINE,
} from "../report-tokens";

export type ReportSectionQualifierTone =
  | "positive"
  | "warning"
  | "negative"
  | "info"
  | "neutral";

interface ReportCardSectionHeaderProps {
  /** Eyebrow opcional acima do título (ex.: "ENGAGEMENT"). */
  eyebrow?: ReactNode;
  /** Título editorial — Fraunces, ~24/28/32px. */
  title: string;
  /** Qualificador inline opcional (ex.: "Baixa", "Alta"). */
  qualifier?: string;
  /** Tom do qualifier — controla a cor do underline subtil. */
  qualifierTone?: ReportSectionQualifierTone;
  /** Subtítulo descritivo opcional logo abaixo do título. */
  subtitle?: ReactNode;
  /** Acção opcional alinhada à direita (ex.: chip de sample size). */
  action?: ReactNode;
  /** Margem inferior — default `mb-4 md:mb-5`; `false` remove-a. */
  bottomMargin?: boolean;
  className?: string;
}

export function ReportCardSectionHeader({
  eyebrow,
  title,
  qualifier,
  qualifierTone = "neutral",
  subtitle,
  action,
  bottomMargin = true,
  className,
}: ReportCardSectionHeaderProps) {
  const underline = REPORT_SECTION_QUALIFIER_UNDERLINE[qualifierTone];
  const hasUnderline = qualifierTone !== "neutral" && underline !== "transparent";
  

  return (
    <header
      className={cn(
        "min-w-0",
        bottomMargin ? T.blockMargin : null,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className={cn(T.eyebrow, T.eyebrowGap)}>{eyebrow}</p>
          ) : null}
          <h3 className={T.title}>
            {title}
            {qualifier ? (
              <>
                {" "}
                <span
                  className={T.qualifier}
                  style={
                    hasUnderline
                      ? {
                          borderBottom: `2px solid ${underline}`,
                          paddingBottom: "1px",
                        }
                      : undefined
                  }
                >
                  {qualifier}
                </span>
              </>
            ) : null}
          </h3>
          {subtitle ? (
            typeof subtitle === "string" ? (
              <p className={T.subtitle}>{subtitle}</p>
            ) : (
              <div className={T.subtitle}>{subtitle}</div>
            )
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
