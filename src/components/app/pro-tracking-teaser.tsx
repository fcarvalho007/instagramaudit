import { Link } from "@tanstack/react-router";
import { Lock, TrendingUp } from "lucide-react";

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
            Tracking diário
          </h3>
        </div>
        <span className="inline-flex items-center rounded-full border border-violet-200/60 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-600">
          PRO
        </span>
      </div>

      {/* Mini chart placeholder */}
      <div className="relative mt-5 flex items-end justify-between gap-1.5 rounded-lg border border-dashed border-border-default/20 bg-surface-muted/60 px-4 py-4">
        {barHeights.map((h, i) => (
          <div
            key={i}
            className={`w-full max-w-[28px] rounded-sm bg-border-default/15 ${h}`}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-1.5 rounded-full border border-border-default/20 bg-white/90 px-3 py-1 shadow-sm">
            <Lock className="size-3 text-content-tertiary" />
            <span className="text-xs font-medium text-content-secondary">
              Disponível em breve
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <p className="mt-4 text-[13px] leading-relaxed text-content-secondary">
        Evolução semanal, alertas de crescimento e comparação temporal
        — incluído nos planos Pro e Agency.
      </p>

      {/* CTA */}
      <Link
        to="/app/plan"
        className="mt-3 inline-block text-[13px] font-medium text-blue-500 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:rounded"
      >
        Saber mais sobre os planos →
      </Link>
    </div>
  );
}