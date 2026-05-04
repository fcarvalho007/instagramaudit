import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Check, Loader2, Sparkles, Building2, Zap, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/plan")({
  component: PlanPage,
  head: () => ({
    meta: [
      { title: "Plano — InstaBench" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

interface Tier {
  key: string;
  name: string;
  icon: typeof Zap;
  description: string;
  features: string[];
  badge?: string;
  badgeColor?: string;
}

const tiers: Tier[] = [
  {
    key: "free",
    name: "Free",
    icon: Zap,
    description: "Análise pontual para conhecer o teu perfil.",
    features: [
      "Análise pontual de perfil",
      "Snapshot guardado",
      "Comparação com benchmarks",
      "Sem histórico completo",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    icon: Sparkles,
    description: "Acompanhamento contínuo para criadores e marcas.",
    features: [
      "Tracking diário de 1 perfil",
      "Evolução semanal e mensal",
      "Alertas de crescimento",
      "Comparação temporal",
      "Relatório PDF completo",
    ],
    badge: "Em breve",
    badgeColor: "bg-violet-50 text-violet-500",
  },
  {
    key: "agency",
    name: "Agency",
    icon: Building2,
    description: "Gestão multi-perfil para agências e equipas.",
    features: [
      "Tudo do Pro",
      "Tracking diário de vários perfis",
      "Análise de concorrentes",
      "Exportação de dados",
      "Alertas personalizados",
      "Comparação lado a lado",
    ],
    badge: "Em breve",
    badgeColor: "bg-amber-50 text-amber-600",
  },
];

function PlanPage() {
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", data.user.id)
          .single();
        if (profile?.plan) setCurrentPlan(profile.plan);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-800">
        Plano
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Consulta o teu plano atual e compara as opções disponíveis.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.key}
            className={
              "rounded-xl border bg-white p-5 shadow-sm transition-shadow " +
              (tier.key === currentPlan
                ? "border-blue-300 ring-1 ring-blue-100 shadow-blue-50"
                : "border-slate-200/60")
            }
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={
                    "flex size-8 items-center justify-center rounded-lg " +
                    (tier.key === currentPlan
                      ? "bg-blue-50 text-blue-500"
                      : "bg-slate-50 text-slate-400")
                  }
                >
                  <tier.icon className="size-4" />
                </div>
                <h2 className="text-base font-semibold text-slate-800">
                {tier.name}
                </h2>
              </div>
              {tier.key === currentPlan && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-600">
                  Atual
                </span>
              )}
              {tier.badge && tier.key !== currentPlan && (
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tier.badgeColor}`}>
                  {tier.badge}
                </span>
              )}
            </div>

            <p className="mt-3 text-[13px] leading-relaxed text-slate-500">
              {tier.description}
            </p>

            <ul className="mt-4 space-y-2">
              {tier.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-[13px] text-slate-600"
                >
                  <Check className="mt-0.5 size-3.5 shrink-0 text-blue-400" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {tier.key !== currentPlan && tier.badge && (
              <div className="mt-5 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 py-2.5">
                <Lock className="size-3 text-slate-300" />
                <p className="text-[11px] font-medium text-slate-400">
                  Preparado para uma fase futura
                </p>
              </div>
            )}

            {tier.key === currentPlan && (
              <p className="mt-5 text-center text-[11px] font-medium text-blue-500">
                O teu plano atual
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Manifesto card */}
      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/40 p-5">
        <div className="flex gap-3">
          <Info className="mt-0.5 size-4 shrink-0 text-blue-400" />
          <div>
            <p className="text-[13px] font-medium text-slate-700">
              Sobre o tracking diário
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
              O tracking diário será uma funcionalidade PRO futura. Por agora, a tua conta guarda
              os relatórios solicitados e prepara a evolução para histórico contínuo. Não existem
              cobranças nem funcionalidades ativas dos planos Pro e Agency neste momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
