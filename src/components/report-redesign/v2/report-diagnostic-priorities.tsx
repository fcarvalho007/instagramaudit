import { cn } from "@/lib/utils";
import type { PriorityItem } from "@/lib/report/block02-diagnostic";
import { Bot } from "lucide-react";

interface Props {
  items: PriorityItem[];
  source?: "ai" | "deterministic";
}

const STYLE = {
  alta: {
    border: "border-l-rose-500",
    chip: "bg-rose-50 text-rose-700 ring-rose-200",
    label: "PRIORIDADE ALTA",
  },
  media: {
    border: "border-l-amber-500",
    chip: "bg-amber-50 text-amber-800 ring-amber-200",
    label: "PRIORIDADE MÉDIA",
  },
  oportunidade: {
    border: "border-l-blue-500",
    chip: "bg-blue-50 text-blue-700 ring-blue-200",
    label: "OPORTUNIDADE",
  },
} as const;

export function ReportDiagnosticPriorities({ items, source = "deterministic" }: Props) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Prioridades de ação" className="space-y-4 md:space-y-5">
      <div className="flex items-center gap-3 border-b border-slate-200/70 pb-2">
        <p className="text-eyebrow-sm text-slate-500">
          Prioridades de ação
        </p>
        {source === "ai" ? (
          <span className="text-eyebrow-sm text-blue-700 inline-flex items-center gap-1">
            <Bot aria-hidden className="size-3" />
            Leitura IA
          </span>
        ) : null}
        <span className="text-eyebrow-sm ml-auto text-slate-400 tabular-nums">
          {items.length} {items.length === 1 ? "AÇÃO" : "AÇÕES"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((it, i) => {
          const s = STYLE[it.level];
          return (
            <article
              key={`${it.title}-${i}`}
              className={cn(
                "h-full rounded-2xl border border-slate-200/70 bg-white",
                "p-6 flex flex-col gap-3.5",
                "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                "border-l-4",
                s.border,
              )}
            >
              <span
                className={cn(
                  "self-start inline-flex items-center rounded-full px-2.5 py-1",
                  "text-eyebrow-sm ring-1",
                  s.chip,
                )}
              >
                {s.label}
              </span>
              <h4 className="font-display text-[1.05rem] font-semibold tracking-tight text-slate-900 leading-snug">
                {it.title}
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">{it.body}</p>
              <p className="text-eyebrow-sm mt-auto text-slate-500">
                {it.resolves}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}