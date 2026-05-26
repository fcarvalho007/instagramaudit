/**
 * Tab Perfis · Secção 1 — Visão de perfis.
 *
 * 4 KPIs reais a partir de `/api/admin/profiles/metrics`.
 */

import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminCard } from "../admin-card";
import { AdminInfoTooltip } from "../admin-info-tooltip";
import { type AdminAccent, ACCENT_500 } from "../admin-tokens";
import { AdminSectionHeader } from "../admin-section-header";
import { adminFetch } from "@/lib/admin/fetch";
import type { AdminPeriod } from "@/components/admin/v2/period-select";

interface MetricsApi {
  success: boolean;
  unique_profiles: number;
  repeated_profiles: number;
  profiles_with_report: number;
  conversion_pct: number | null;
  total_profiles: number;
  window_days: number;
}

const PERIOD_LABEL: Record<AdminPeriod, string> = {
  "7d": "últimos 7 dias",
  "30d": "últimos 30 dias",
  "90d": "últimos 90 dias",
  ytd: "desde 1 Jan",
};

export function MetricsSection({ period }: { period: AdminPeriod }) {
  const { data } = useQuery<MetricsApi>({
    queryKey: ["admin", "profiles", "metrics", period],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/profiles/metrics?period=${period}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  const unique = data?.unique_profiles ?? 0;
  const repeated = data?.repeated_profiles ?? 0;
  const withReport = data?.profiles_with_report ?? 0;
  const conv = data?.conversion_pct;
  const label = PERIOD_LABEL[period];

  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader
        title="Visão de perfis"
        subtitle={label}
        accent="expense"
        info="Agregação de perfis Instagram com snapshot no período seleccionado (fonte: `analysis_snapshots`)."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ProfileKpi
          accent="expense"
          eyebrow={`Perfis únicos · ${period}`}
          info="Perfis com pelo menos 1 análise nova (snapshot) na janela. Não inclui pesquisas servidas via cache."
          value={String(unique)}
          sub={`${data?.total_profiles ?? 0} no histórico`}
        />
        <ProfileKpi
          accent="signal"
          eyebrow="Perfis repetidos"
          info="Perfis com ≥2 análises novas (snapshots) na janela seleccionada."
          value={String(repeated)}
          sub="≥ 2 snapshots na janela"
        />
        <ProfileKpi
          accent="revenue"
          eyebrow={`Com relatório · ${period}`}
          info="Perfis com snapshot na janela (fonte: `analysis_snapshots`)."
          value={String(withReport)}
          sub="origem analysis_snapshots"
        />
      </div>
    </section>
  );
}

interface ProfileKpiProps {
  accent: AdminAccent;
  eyebrow: string;
  info: string;
  value: ReactNode;
  sub?: ReactNode;
}

function ProfileKpi({ accent, eyebrow, info, value, sub }: ProfileKpiProps) {
  return (
    <AdminCard variant="accent-left" accent={accent} className="!p-4">
      <div
        className="mb-2 flex items-center gap-1.5"
        style={{ color: ACCENT_500[accent] }}
      >
        <span className="admin-eyebrow" style={{ color: "inherit" }}>
          {eyebrow}
        </span>
        <AdminInfoTooltip label={info} />
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="font-mono font-medium tracking-tight text-admin-text-primary"
          style={{ fontSize: "2.25rem", lineHeight: 1.1, letterSpacing: "-0.02em" }}
        >
          {value}
        </span>
      </div>
      {sub ? (
        <p className="mt-2 text-[12px] text-admin-text-tertiary">{sub}</p>
      ) : null}
    </AdminCard>
  );
}