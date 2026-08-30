import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/* ─── Phase steps (no repetition — one per stage) ──────────────────── */

// Ronda 3 — quatro etapas reais do pipeline, sem percentagens fictícias.
const STEPS = [
  { key: "1", durationMs: 3000 },
  { key: "2", durationMs: 5000 },
  { key: "3", durationMs: 6000 },
  { key: "4", durationMs: 8000 },
] as const;

const TOTAL_STEPS = STEPS.length;

/* ─── Bar gradient pairs (local decorative) ────────────────────────── */

const BAR_STATIC_SCALES = [0.45, 0.60, 0.35, 0.70, 0.90, 0.55, 0.75] as const;

const BAR_GRADIENTS = [
  { from: "#C084FC", to: "#EC4899" },
  { from: "#818CF8", to: "#A855F7" },
  { from: "#22D3EE", to: "#6366F1" },
  { from: "#34D399", to: "#22D3EE" },
  { from: "#FBBF24", to: "#34D399" },
  { from: "#F97316", to: "#FBBF24" },
  { from: "#FB7185", to: "#F97316" },
] as const;

/* ─── CSS Keyframes (injected once) ────────────────────────────────── */

const LOADER_CSS = `
@keyframes liq-wave {
  0%, 100% { transform: scaleY(0.35); }
  50%      { transform: scaleY(1); }
}
@keyframes liq-droplet {
  0%, 40%, 100% { opacity: 0; transform: translateY(4px) scale(0.6); }
  50%           { opacity: 0.85; transform: translateY(-2px) scale(1); }
  70%           { opacity: 0; transform: translateY(-8px) scale(0.4); }
}
@keyframes liq-shimmer {
  0%   { opacity: 0.12; }
  50%  { opacity: 0.35; }
  100% { opacity: 0.12; }
}
@keyframes liq-glow {
  0%, 100% { opacity: 0.08; }
  50%      { opacity: 0.22; }
}
@keyframes liq-phase-in {
  0%   { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes liq-progress {
  0%   { width: 0%; }
  100% { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .liq-bar,
  .liq-droplet,
  .liq-shimmer,
  .liq-glow {
    animation: none !important;
  }
  .liq-bar { transform: scaleY(var(--liq-static, 0.5)) !important; }
  .liq-droplet { opacity: 0 !important; }
}
`;

/* ─── Component ────────────────────────────────────────────────────── */

export function AnalysisSkeleton({ username }: { username?: string }) {
  const { t } = useTranslation("analyze");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Determine current step based on elapsed time
  let cumulative = 0;
  let currentStep = 0;
  for (let i = 0; i < TOTAL_STEPS; i++) {
    cumulative += STEPS[i].durationMs / 1000;
    if (elapsed < cumulative) {
      currentStep = i;
      break;
    }
    if (i === TOTAL_STEPS - 1) currentStep = TOTAL_STEPS - 1;
  }

  const handle = username ? `@${username.replace(/^@/, "")}` : null;

  return (
    <section
      aria-label={t("skeleton.aria")}
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-screen items-center justify-center px-4 sm:px-6"
      style={{
        background: "linear-gradient(180deg, #F6FAFF 0%, #FFFFFF 100%)",
      }}
    >
      <style>{LOADER_CSS}</style>

      {/* SR-only live announcement of phase progress. */}
      <span className="sr-only">
        {t("skeleton.sr_progress", {
          defaultValue: "A analisar {{handle}} — passo {{current}} de {{total}}",
          handle: handle ?? "",
          current: currentStep + 1,
          total: TOTAL_STEPS,
        })}
      </span>

      <div className="flex w-full max-w-[520px] flex-col items-center gap-5 rounded-2xl border border-border-default bg-surface-secondary px-6 py-8 shadow-card sm:px-8 sm:py-10">
        {/* Eyebrow + handle */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-eyebrow-sm text-content-secondary">
            {t("skeleton.eyebrow")}
          </span>
          {handle && (
            <span className="rounded-full bg-tint-primary px-3.5 py-1 font-sans text-xs font-medium text-accent-primary">
              {handle}
            </span>
          )}
        </div>

        {/* Liquid analytics loader */}
        <div
          className="relative flex items-end justify-center gap-[10px] sm:gap-3"
          style={{ width: "clamp(220px, 60vw, 310px)", height: "clamp(90px, 16vw, 110px)" }}
          aria-hidden="true"
        >
          {BAR_GRADIENTS.map((g, i) => (
            <LiquidBar key={i} index={i} from={g.from} to={g.to} staticScale={BAR_STATIC_SCALES[i]} />
          ))}
          <div
            className="liq-glow pointer-events-none absolute inset-0 rounded-xl"
            style={{
              background:
                "radial-gradient(ellipse at 50% 80%, rgba(99,102,241,0.10) 0%, transparent 70%)",
              animation: "liq-glow 3.2s ease-in-out infinite",
              willChange: "opacity",
            }}
          />
        </div>

        {/* Phase message — no repetition */}
        <div className="flex min-h-[2.5rem] items-center justify-center" role="status">
          <p
            key={currentStep}
            className="text-center font-sans text-base font-semibold text-content-primary sm:text-lg"
            style={{ animation: "liq-phase-in 0.4s ease-out both" }}
          >
            {t(`skeleton.steps.${STEPS[currentStep].key}`)}
          </p>
        </div>

        {/* Step progress — horizontal segments */}
        <div className="flex w-full max-w-[280px] items-center gap-1.5" aria-hidden="true">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full overflow-hidden transition-colors duration-300",
                i <= currentStep ? "bg-accent-primary/15" : "bg-surface-muted",
              )}
            >
              {i < currentStep && (
                <div className="h-full w-full rounded-full bg-accent-primary" />
              )}
              {i === currentStep && (
                <div
                  className="h-full rounded-full bg-accent-primary"
                  style={{
                    animation: `liq-progress ${STEPS[i].durationMs}ms linear forwards`,
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step counter */}
        <p className="text-center font-sans text-xs text-content-secondary tabular-nums">
          {t("skeleton.stepCounter", { current: currentStep + 1, total: TOTAL_STEPS })}
        </p>

        {/* Footnote */}
        <p className="max-w-[340px] text-center font-sans text-xs leading-relaxed text-content-tertiary">
          {t("skeleton.footnote")}
        </p>
      </div>
    </section>
  );
}

/* ─── Liquid bar sub-component ─────────────────────────────────────── */

function LiquidBar({
  index,
  from,
  to,
  staticScale,
}: {
  index: number;
  from: string;
  to: string;
  staticScale: number;
}) {
  const delay = `${index * 0.4}s`;
  const duration = "3s";

  return (
    <div className="relative flex flex-1 flex-col items-center" style={{ height: "100%" }}>
      <div
        className="liq-droplet absolute top-0 size-[6px] rounded-full"
        style={{
          background: from,
          animation: `liq-droplet ${duration} ease-in-out ${delay} infinite`,
          willChange: "transform, opacity",
        }}
      />
      <div
        className="liq-bar absolute bottom-0 w-full rounded-t-lg"
        style={{
          height: "100%",
          transformOrigin: "bottom",
          // @ts-expect-error CSS custom property
          "--liq-static": staticScale,
          background: `linear-gradient(180deg, ${from} 0%, ${to} 100%)`,
          animation: `liq-wave ${duration} cubic-bezier(0.45, 0.05, 0.55, 0.95) ${delay} infinite`,
          willChange: "transform",
        }}
      >
        <div
          className="liq-shimmer absolute inset-0 rounded-t-lg"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 60%)",
            animation: `liq-shimmer 2.4s ease-in-out ${delay} infinite`,
            willChange: "opacity",
          }}
        />
      </div>
    </div>
  );
}
