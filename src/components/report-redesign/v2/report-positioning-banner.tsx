import { cn } from "@/lib/utils";
import { REDESIGN_TOKENS } from "../report-tokens";
import { useTranslation, Trans } from "react-i18next";

/**
 * Banner editorial curto entre o hero e o bloco 01: explica em uma
 * frase o que o AuditProfiles cruza neste relatório, e identifica a
 * família de fontes editoriais que serve de enquadramento (sem links).
 *
 * Política completa: ver `KNOWLEDGE.md` na raiz do projecto e a nota
 * "Política de fontes de benchmark" na Knowledge Base.
 */
export function ReportPositioningBanner() {
  const { t } = useTranslation("report");
  const chips = [
    t("positioning.chip_public_content"),
    t("positioning.chip_peer_comparison"),
    t("positioning.chip_external_demand"),
  ];
  return (
    <section
      aria-label={t("positioning.aria")}
      className={cn("w-full", REDESIGN_TOKENS.bandWhite, "border-y border-slate-200/70")}
    >
      <div className="mx-auto max-w-7xl px-5 md:px-6 py-6 md:py-7 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm md:text-[15px] text-slate-700 leading-relaxed max-w-3xl">
            <Trans
              i18nKey="positioning.lead"
              t={t}
              components={[<strong key="0" className="text-slate-900" />]}
            />
          </p>
          <ul
            aria-hidden="true"
            className="flex flex-wrap gap-2 shrink-0"
          >
            {chips.map((chip) => (
                <li
                  key={chip}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full ring-1 px-3 py-1.5",
                    "text-eyebrow-sm",
                    "ring-blue-200 text-blue-700 bg-blue-50",
                  )}
                >
                  <span className="size-1.5 rounded-full bg-blue-500" />
                  {chip}
                </li>
              ))}
          </ul>
        </div>

        <p className="text-eyebrow-sm text-[10.5px] text-slate-500 leading-relaxed">
          {t("positioning.source_note")}{" "}
          <span className="normal-case tracking-normal font-sans text-[12px] text-slate-500">
            {t("positioning.benchmark_note")}
          </span>
        </p>
      </div>
    </section>
  );
}
