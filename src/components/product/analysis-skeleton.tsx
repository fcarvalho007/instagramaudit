import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/* ─── Phase messages ───────────────────────────────────────────────── */

const PHASES = [
  "A recolher dados públicos do perfil…",
  "A analisar métricas e sinais de engagement…",
  "A cruzar resultados com benchmarks do setor…",
  "A interpretar padrões com IA…",
  "A preparar o teu relatório visual…",
] as const;

function getWaitMessage(elapsed: number): string {
  if (elapsed < 7) return "Normalmente demora alguns segundos.";
  if (elapsed < 25)
    return "Estamos a processar dados públicos. Pode demorar até 30 segundos.";
  return "Ainda estamos a montar o relatório. Obrigado pela paciência.";
}

/* ─── Bar gradient pairs (local decorative) ────────────────────────── */

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
  0%   { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .liq-bar,
  .liq-droplet,
  .liq-shimmer,
  .liq-glow {
    animation: none !important;
  }
  .liq-bar { transform: scaleY(0.6) !important; }
  .liq-droplet { opacity: 0 !important; }
}
`;

/* ─── Component ────────────────────────────────────────────────────── */

export function AnalysisSkeleton({ username }: { username?: string }) {
  const [phase, setPhase] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPhase((p) => (p + 1) % PHASES.length);
    }, 3800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handle = username ? `@${username.replace(/^@/, "")}` : null;

  return (
    <section
      aria-label="A analisar perfil"
      className="flex min-h-[80vh] items-center justify-center px-4 sm:px-6"
      style={{
        background: "linear-gradient(180deg, #F6FAFF 0%, #FFFFFF 100%)",
      }}
    >
      <style>{LOADER_CSS}</style>

      <div className="flex w-full max-w-[520px] flex-col items-center gap-6 rounded-2xl border border-border-default bg-surface-secondary px-6 py-8 shadow-card sm:px-8 sm:py-10">
        {/* Eyebrow */}
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-content-tertiary">
          A analisar perfil
        </span>

        {/* Liquid analytics loader */}
        <div
          className="relative flex items-end justify-center gap-[10px] sm:gap-3"
          style={{ width: "clamp(220px, 60vw, 310px)", height: "clamp(100px, 18vw, 120px)" }}
          aria-hidden="true"
        >
          {BAR_GRADIENTS.map((g, i) => (
            <LiquidBar key={i} index={i} from={g.from} to={g.to} />
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

        {/* Phase message */}
        <div className="flex min-h-[3.5rem] items-center justify-center" role="status">
          <p
            key={phase}
            className="text-center font-display text-xl font-semibold text-content-primary sm:text-2xl"
            style={{ animation: "liq-phase-in 0.45s ease-out both" }}
          >
            {PHASES[phase]}
          </p>
        </div>

        {/* Username badge */}
        {handle && (
          <span className="rounded-full bg-tint-primary px-3.5 py-1 font-sans text-xs font-medium text-accent-primary">
            {handle}
          </span>
        )}

        {/* Phase dots */}
        <div className="flex items-center gap-2" aria-hidden="true">
          {PHASES.map((_, i) => (
            <span
              key={i}
              className={cn(
                "size-1.5 rounded-full transition-colors duration-500",
                i <= phase ? "bg-accent-primary" : "bg-surface-muted",
              )}
            />
          ))}
        </div>

        {/* Wait message */}
        <p className="text-center font-sans text-xs text-content-secondary">
          {getWaitMessage(elapsed)}
        </p>

        {/* Footnote */}
        <p className="max-w-[360px] text-center font-sans text-[12px] leading-relaxed text-content-tertiary">
          Não feches esta janela — estamos a montar o diagnóstico.
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
}: {
  index: number;
  from: string;
  to: string;
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
