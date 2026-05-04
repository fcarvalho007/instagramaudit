import { useEffect, useState } from "react";

const PHASES = [
  "A recolher dados do perfil…",
  "A analisar métricas e engagement…",
  "A comparar com benchmarks do setor…",
  "A preparar o teu relatório…",
] as const;

export function AnalysisSkeleton({ username }: { username?: string }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPhase((p) => (p + 1) % PHASES.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const handle = username ? `@${username.replace(/^@/, "")}` : null;

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-surface-base px-4">
      <style>{`
        @keyframes analysis-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes analysis-dash {
          0% { stroke-dashoffset: 220; }
          50% { stroke-dashoffset: 60; }
          100% { stroke-dashoffset: 220; }
        }
        @keyframes analysis-pulse-ring {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.08); }
        }
        @keyframes analysis-fade-up {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .analysis-spinner {
          animation: analysis-spin 2.4s linear infinite;
        }
        .analysis-arc {
          animation: analysis-dash 2s ease-in-out infinite;
          stroke-linecap: round;
        }
        .analysis-pulse-ring {
          animation: analysis-pulse-ring 2.4s ease-in-out infinite;
        }
        .analysis-phase-enter {
          animation: analysis-fade-up 0.4s ease-out both;
        }
      `}</style>

      <div className="flex w-full max-w-sm flex-col items-center gap-8 rounded-2xl border border-border-subtle bg-white p-8 md:p-10 shadow-card">
        {/* Animated analytics ring */}
        <div className="relative flex items-center justify-center">
          {/* Pulse ring behind */}
          <div className="analysis-pulse-ring absolute size-24 md:size-28 rounded-full border border-accent-primary/20" />
          {/* Spinner SVG */}
          <svg
            className="analysis-spinner size-20 md:size-24"
            viewBox="0 0 80 80"
            fill="none"
            aria-hidden="true"
          >
            {/* Track */}
            <circle
              cx="40"
              cy="40"
              r="35"
              stroke="currentColor"
              strokeWidth="3"
              className="text-border-subtle"
            />
            {/* Animated arc */}
            <circle
              cx="40"
              cy="40"
              r="35"
              strokeWidth="3.5"
              className="analysis-arc text-accent-primary"
              stroke="currentColor"
              strokeDasharray="220"
              strokeDashoffset="220"
            />
          </svg>
          {/* Center icon — small bar chart */}
          <svg
            className="absolute size-7 md:size-8 text-accent-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <rect x="3" y="12" width="4" height="9" rx="1" fill="currentColor" opacity="0.25" />
            <rect x="10" y="7" width="4" height="14" rx="1" fill="currentColor" opacity="0.45" />
            <rect x="17" y="3" width="4" height="18" rx="1" fill="currentColor" opacity="0.7" />
          </svg>
        </div>

        {/* Phase message */}
        <div className="flex min-h-[2.5rem] items-center justify-center">
          <p
            key={phase}
            className="analysis-phase-enter text-center font-sans text-sm font-medium text-content-secondary md:text-base"
          >
            {PHASES[phase]}
          </p>
        </div>

        {/* Username badge */}
        {handle && (
          <span className="rounded-full border border-border-subtle bg-surface-secondary px-4 py-1.5 font-sans text-xs font-medium text-content-tertiary">
            {handle}
          </span>
        )}

        {/* Footnote */}
        <p className="text-center font-sans text-[0.6875rem] leading-relaxed text-content-tertiary/70">
          Isto pode demorar até 30 segundos
        </p>
      </div>
    </div>
  );
}
