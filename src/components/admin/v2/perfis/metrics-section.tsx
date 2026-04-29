/**
 * Tab Perfis · Secção 1 — Visão de perfis.
 *
 * 4 KPICards size lg, cada um com tooltip "i" para explicar a fórmula.
 * Composição local (não toca em `KPICard` partilhado): cartão accent-left +
 * eyebrow com info tooltip + valor mono grande + delta + sub.
 *
 * Padrão idêntico ao `relatorios/metrics-section.tsx` para coerência visual.
 */

import { type ReactNode } from "react";
import { DemoOnlySection } from "../demo-only-section";
import { AdminCard } from "../admin-card";
import { AdminInfoTooltip } from "../admin-info-tooltip";
import { type AdminAccent, ACCENT_500 } from "../admin-tokens";
import { MOCK_PROFILES_METRICS } from "@/lib/admin/mock-data";

type DeltaDirection = "up" | "down";

export function MetricsSection() {
  const m = MOCK_PROFILES_METRICS;

  return (
    <DemoOnlySection
      title="Visão de perfis"
      subtitle="últimos 30 dias"
      accent="expense"
      info={"Agregação de todos os perfis Instagram analisados pela ferramenta nos últimos 30 dias."}
      pendingReason={"Métricas agregadas de perfis serão ligadas a `social_profiles` e `analysis_events` numa próxima iteração. Até lá, ativa Modo demonstração para ver o layout."}
    >
      <section>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ProfileKpi
          accent="expense"
          eyebrow={m.uniqueProfiles.eyebrow}
          info={m.uniqueProfiles.info}
          value={m.uniqueProfiles.value}
          delta={m.uniqueProfiles.delta}
          sub={m.uniqueProfiles.sub}
        />
        <ProfileKpi
          accent="signal"
          eyebrow={m.repeated.eyebrow}
          info={m.repeated.info}
          value={m.repeated.value}
          sub={m.repeated.sub}
        />
        <ProfileKpi
          accent="revenue"
          eyebrow={m.conversion.eyebrow}
          info={m.conversion.info}
          value={m.conversion.value}
          delta={m.conversion.delta}
          sub={m.conversion.sub}
        />
        <ProfileKpi
          accent="revenue-alt"
          eyebrow={m.avgRevenuePerProfile.eyebrow}
          info={m.avgRevenuePerProfile.info}
          value={m.avgRevenuePerProfile.value}
          sub={m.avgRevenuePerProfile.sub}
        />
      </div>
    </section>
    </DemoOnlySection>
  );
}

interface ProfileKpiProps {
  accent: AdminAccent;
  eyebrow: string;
  info: string;
  value: ReactNode;
  delta?: { text: string; direction: DeltaDirection };
  sub?: ReactNode;
}

function ProfileKpi({
  accent,
  eyebrow,
  info,
  value,
  delta,
  sub,
}: ProfileKpiProps) {
  const deltaCls = delta
    ? delta.direction === "down"
      ? "text-admin-danger-500"
      : "text-admin-revenue-700"
    : "";
  const arrow = !delta ? null : delta.direction === "up" ? "▲" : "▼";

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
          style={{
            fontSize: "2.25rem",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </span>
        {delta ? (
          <span className={`text-xs ${deltaCls}`}>
            {arrow} {delta.text}
          </span>
        ) : null}
      </div>
      {sub ? (
        <p className="mt-2 text-[11px] text-admin-text-tertiary">{sub}</p>
      ) : null}
    </AdminCard>
  );
}