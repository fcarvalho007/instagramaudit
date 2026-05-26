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

interface MetricsApi {
  success: boolean;
  unique_profiles_30d: number;
  repeated_profiles: number;
  profiles_with_report_30d: number;
  conversion_pct: number | null;
  total_profiles: number;
}

export function MetricsSection() {
  const { data } = useQuery<MetricsApi>({
    queryKey: ["admin", "profiles", "metrics"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/profiles/metrics");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  const unique = data?.unique_profiles_30d ?? 0;
  const repeated = data?.repeated_profiles ?? 0;
  const withReport = data?.profiles_with_report_30d ?? 0;
  const conv = data?.conversion_pct;

  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader
        title="Visão de perfis"
        subtitle="últimos 30 dias"
        accent="expense"
        info="Agregação de perfis Instagram analisados nos últimos 30 dias, lida de `social_profiles`."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ProfileKpi
          accent="expense"
          eyebrow="Perfis únicos · 30d"
          info="Perfis com pelo menos uma análise nos últimos 30 dias."
          value={String(unique)}
          sub={`${data?.total_profiles ?? 0} no histórico`}
        />
        <ProfileKpi
          accent="signal"
          eyebrow="Perfis repetidos"
          info="Perfis com 2 ou mais análises totais (sinal de intenção)."
          value={String(repeated)}
          sub="≥ 2 análises"
        />
        <ProfileKpi
          accent="revenue"
          eyebrow="Com relatório · 30d"
          info="Perfis analisados nos últimos 30 dias que originaram um pedido de relatório."
          value={String(withReport)}
          sub="origem report_requests"
        />
        <ProfileKpi
          accent="revenue-alt"
          eyebrow="Conversão · 30d"
          info="Perfis com relatório ÷ perfis únicos analisados."
          value={conv != null ? `${conv.toFixed(1)}%` : "—"}
          sub="análise → report"
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