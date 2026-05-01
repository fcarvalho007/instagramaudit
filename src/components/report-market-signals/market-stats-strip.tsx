import type { ReactNode } from "react";

export interface MarketStat {
  eyebrow: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "neutral" | "positive" | "warning";
}

/**
 * Strip horizontal de 4 métricas para a secção "Procura de mercado".
 * Substitui o grid 2x2 de cards individuais por uma única banda editorial
 * com colunas separadas por divisores subtis. Mais leve, mais Iconosquare.
 */
export function MarketStatsStrip({ items }: { items: MarketStat[] }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y divide-slate-200/70 lg:divide-y-0 lg:divide-x">
        {items.map((stat, idx) => {
          const accentDot =
            stat.accent === "positive"
              ? "bg-emerald-500"
              : stat.accent === "warning"
                ? "bg-amber-500"
                : "bg-slate-300";
          return (
            <div key={idx} className="p-5 md:p-6 min-w-0">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${accentDot}`} />
                <p className="text-eyebrow-sm text-slate-500">
                  {stat.eyebrow}
                </p>
              </div>
              <div className="mt-3 font-display text-xl md:text-2xl leading-tight tracking-tight text-slate-900 break-words">
                {stat.value}
              </div>
              {stat.hint ? (
                <p className="mt-2 text-[13px] text-slate-600 leading-relaxed break-words">
                  {stat.hint}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}