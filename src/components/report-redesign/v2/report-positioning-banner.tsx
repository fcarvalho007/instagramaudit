import { cn } from "@/lib/utils";
import { REDESIGN_TOKENS } from "../report-tokens";

/**
 * Banner editorial curto entre o hero e o bloco 01: explica em uma
 * frase o que o InstaBench cruza neste relatório. Mantém-se compacto
 * e não introduz cor adicional.
 */
export function ReportPositioningBanner() {
  return (
    <section
      aria-label="O que mostra o InstaBench"
      className={cn("w-full", REDESIGN_TOKENS.bandWhite, "border-y border-slate-200/70")}
    >
      <div className="mx-auto max-w-7xl px-5 md:px-6 py-6 md:py-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm md:text-[15px] text-slate-700 leading-relaxed max-w-3xl">
            O <strong className="text-slate-900">InstaBench</strong> mostra o que o perfil
            comunica publicamente, como compara com perfis semelhantes e que
            temas têm procura fora do Instagram.
          </p>
          <ul
            aria-hidden="true"
            className="flex flex-wrap gap-2 shrink-0"
          >
            {["Conteúdo público", "Comparação com pares", "Procura externa"].map(
              (chip) => (
                <li
                  key={chip}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full ring-1 px-3 py-1.5",
                    "font-mono text-[10px] uppercase tracking-[0.16em]",
                    "ring-blue-200 text-blue-700 bg-blue-50",
                  )}
                >
                  <span className="size-1.5 rounded-full bg-blue-500" />
                  {chip}
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
