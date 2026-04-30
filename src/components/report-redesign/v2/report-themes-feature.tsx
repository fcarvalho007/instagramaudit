import { Bot, Hash, Quote, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ThemesResult } from "@/lib/report/block02-diagnostic";

interface Props {
  themes: ThemesResult;
}

/**
 * Pergunta 04 · Temas das legendas — bloco isolado, full-width.
 *
 * Diferencia-se visualmente dos cards 1/3 das outras perguntas para que
 * o leitor perceba que é uma análise temática, baseada explicitamente
 * no texto das legendas (não nas hashtags).
 *
 * Comportamento:
 *  - Quando `themes.source === "ai"`: layout split — lista determinística
 *    à esquerda (se existir) ou apenas a interpretação IA à direita.
 *  - Quando `themes.source === "deterministic"`: lista de até 6 temas em
 *    duas colunas com barra proporcional e contagem mono.
 *  - Empty state explícito quando `available=false`.
 */
export function ReportThemesFeature({ themes }: Props) {
  if (!themes.available) {
    return (
      <ThemesShell>
        <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
          A amostra ainda não tem palavras suficientes nas legendas para
          identificar temas claros.
        </p>
      </ThemesShell>
    );
  }

  const isAi = themes.source === "ai" && !!themes.aiText;
  const items = themes.items ?? [];
  const visibleItems = items.slice(0, 6);

  return (
    <ThemesShell headline={themes.headline}>
      <div
        className={cn(
          "grid grid-cols-1 gap-6 md:gap-8",
          isAi && visibleItems.length > 0 ? "md:grid-cols-5" : "md:grid-cols-1",
        )}
      >
        {visibleItems.length > 0 ? (
          <div className={cn(isAi ? "md:col-span-3" : "md:col-span-1")}>
            <ThemesRanking items={visibleItems} />
          </div>
        ) : null}

        {isAi && themes.aiText ? (
          <aside
            className={cn(
              "md:col-span-2 rounded-xl bg-blue-50/50 ring-1 ring-blue-100",
              "p-5 md:p-6 flex flex-col gap-2.5",
            )}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-700 inline-flex items-center gap-1.5">
              <Bot aria-hidden className="size-3" />
              Leitura IA · interpretação
            </p>
            <p className="text-[14px] text-slate-700 leading-relaxed italic">
              <Quote
                aria-hidden
                className="inline size-3.5 -mt-1 mr-1 text-blue-400"
              />
              {themes.aiText}
            </p>
          </aside>
        ) : null}
      </div>

      <p className="text-[12.5px] text-slate-500 leading-relaxed border-t border-slate-100 pt-4 mt-2">
        Estes temas resultam da análise das palavras recorrentes nas legendas
        analisadas. Não correspondem necessariamente às{" "}
        <span className="inline-flex items-center gap-1 align-middle">
          <Hash aria-hidden className="size-3 text-slate-400" />
          hashtags
        </span>{" "}
        utilizadas — essas vivem na Pergunta 03.
      </p>
    </ThemesShell>
  );
}

function ThemesShell({
  headline,
  children,
}: {
  headline?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label="Pergunta 04 · Temas das legendas"
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-white",
        "p-7 md:p-9",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.08)]",
        "flex flex-col gap-6",
      )}
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-2 min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 inline-flex items-center gap-1.5">
            <Sparkles aria-hidden className="size-3 text-slate-400" />
            Pergunta 04 · Temas das legendas
          </p>
          <h3 className="font-display text-[1.25rem] md:text-[1.5rem] font-semibold tracking-tight text-slate-900 leading-snug">
            Sobre que assuntos o perfil fala mais?
          </h3>
        </div>
        <span
          className={cn(
            "self-start inline-flex items-center rounded-full px-2.5 py-1",
            "font-mono text-[10px] uppercase tracking-[0.14em] ring-1",
            "bg-slate-50 text-slate-600 ring-slate-200",
          )}
        >
          Baseado nas legendas
        </span>
      </header>

      {headline ? (
        <p className="font-display text-[1.05rem] md:text-[1.15rem] font-semibold tracking-tight text-blue-800">
          {headline}
        </p>
      ) : null}

      {children}
    </section>
  );
}

function ThemesRanking({
  items,
}: {
  items: ReadonlyArray<{ text: string; weight: number }>;
}) {
  const max = Math.max(1, ...items.map((it) => it.weight));
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {items.map((it) => {
        const pct = Math.max(6, (it.weight / max) * 100);
        return (
          <li key={it.text} className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-semibold text-slate-800 truncate">
                {it.text}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-slate-500 shrink-0">
                {it.weight}×
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${pct}%` }}
                aria-hidden
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}