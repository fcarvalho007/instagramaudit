import { TrendingUp } from "lucide-react";

const barHeights = ["h-2", "h-3", "h-4", "h-3", "h-5", "h-4", "h-3"];

export function ProTrackingTeaser() {
  return (
    <div className="rounded-xl border border-border-default/20 bg-white p-5 shadow-sm sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-surface-muted">
            <TrendingUp className="size-4 text-content-tertiary" />
          </div>
          <h3 className="text-sm font-semibold text-content-primary">
            Acompanhamento recorrente
          </h3>
        </div>
      </div>

      {/* Mini chart placeholder */}
      <div className="relative mt-5 flex items-end justify-between gap-1.5 rounded-lg border border-dashed border-border-default/20 bg-surface-muted/60 px-4 py-4" aria-hidden="true">
        {barHeights.map((h, i) => (
          <div
            key={i}
            className={`w-full max-w-[28px] rounded-sm bg-border-default/15 ${h}`}
          />
        ))}
      </div>

      {/* Body */}
      <p className="mt-4 text-[13px] leading-relaxed text-content-secondary">
        Acompanhamento recorrente ficará disponível numa fase futura.
      </p>
    </div>
  );
}