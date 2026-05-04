import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/app/plan")({
  component: PlanPage,
  head: () => ({
    meta: [
      { title: "Plano — InstaBench" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const tiers = [
  {
    name: "Free",
    current: true,
    features: [
      "1 análise por mês",
      "Relatório base",
      "Benchmarks públicos",
    ],
  },
  {
    name: "Pro",
    current: false,
    features: [
      "Análises ilimitadas",
      "Relatório PDF completo",
      "Histórico de evolução",
      "Comparação com concorrentes",
    ],
  },
  {
    name: "Agency",
    current: false,
    features: [
      "Tudo do Pro",
      "Múltiplos perfis",
      "White-label",
      "API de integração",
    ],
  },
];

function PlanPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Plano
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Consulta o teu plano atual e compara as opções disponíveis.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={
              "rounded-xl border bg-white p-5 shadow-sm " +
              (tier.current
                ? "border-blue-300 ring-1 ring-blue-200"
                : "border-slate-200/70")
            }
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                {tier.name}
              </h2>
              {tier.current && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
                  Atual
                </span>
              )}
              {!tier.current && (
                <Lock className="size-3.5 text-slate-300" />
              )}
            </div>
            <ul className="mt-3 space-y-1.5">
              {tier.features.map((f) => (
                <li
                  key={f}
                  className="text-sm text-slate-500 before:mr-2 before:text-slate-300 before:content-['•']"
                >
                  {f}
                </li>
              ))}
            </ul>
            {!tier.current && (
              <p className="mt-4 text-center text-xs text-slate-400">
                Em breve
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
