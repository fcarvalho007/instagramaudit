/**
 * Tab Perfis · Secção 3 — Oportunidades de conversão.
 *
 * 2 cartões:
 *   - Esquerdo: pesquisas repetidas (mesmo perfil, mesmo utilizador) com
 *     contador grande coral.
 *   - Direito: funil por perfil (top 5) com 2 mini-barras empilhadas.
 */

import { ArrowRight } from "lucide-react";

import { AdminSectionHeader } from "../admin-section-header";
import { AdminCard } from "../admin-card";
import { AdminActionButton } from "../admin-action-button";
import { ADMIN_LITERAL } from "../admin-tokens";
import {
  MOCK_PROFILE_FUNNELS,
  MOCK_REPEATED_SEARCHES,
  type MockProfileFunnel,
  type MockRepeatedSearch,
} from "@/lib/admin/mock-data";

export function IntentOpportunitiesSection() {
  return (
    <section>
      <AdminSectionHeader
        title="Oportunidades de conversão"
        accent="signal"
        info="Perfis pesquisados várias vezes pelos mesmos utilizadores que ainda não geraram relatório pago. Cada repetição é um sinal forte de intenção."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RepeatedSearchesCard />
        <PerProfileFunnelCard />
      </div>
    </section>
  );
}

function RepeatedSearchesCard() {
  return (
    <AdminCard className="!p-6">
      <header className="mb-4">
        <h3 className="m-0 text-[16px] font-medium text-admin-text-primary">
          Pesquisas repetidas
        </h3>
        <p className="mt-1 text-[12px] text-admin-text-tertiary">
          Mesmo perfil pesquisado por mesmo utilizador
        </p>
      </header>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {MOCK_REPEATED_SEARCHES.map((item) => (
          <li key={`${item.profile}-${item.user}`}>
            <RepeatedRow item={item} />
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <AdminActionButton size="sm">
          Ver oportunidades completas
          <ArrowRight size={12} strokeWidth={1.75} />
        </AdminActionButton>
      </div>
    </AdminCard>
  );
}

function RepeatedRow({ item }: { item: MockRepeatedSearch }) {
  return (
    <div
      className="flex items-center justify-between rounded-lg px-3.5 py-3"
      style={{ backgroundColor: "rgb(var(--admin-canvas-rgb))" }}
    >
      <div className="min-w-0">
        <p className="m-0 truncate text-[13px] text-admin-text-primary">
          {item.profile}
        </p>
        <p className="mt-0.5 text-[11px] text-admin-text-secondary">
          por <strong className="font-medium">{item.user}</strong>
        </p>
      </div>
      <div className="ml-3 shrink-0 text-right">
        <p
          className="m-0 font-mono text-[16px] font-medium leading-none"
          style={{ color: ADMIN_LITERAL.profileBarReports }}
        >
          {item.count}
        </p>
        <p className="mt-1 text-[10px] text-admin-text-tertiary">
          {item.window}
        </p>
      </div>
    </div>
  );
}

function PerProfileFunnelCard() {
  const max = MOCK_PROFILE_FUNNELS.reduce(
    (m, p) => (p.analyses > m ? p.analyses : m),
    0,
  );
  return (
    <AdminCard className="!p-6">
      <header className="mb-4">
        <h3 className="m-0 text-[16px] font-medium text-admin-text-primary">
          Funil por perfil
        </h3>
        <p className="mt-1 text-[12px] text-admin-text-tertiary">
          Análise grátis → relatório pago, top 5 perfis
        </p>
      </header>
      <ul className="m-0 flex list-none flex-col p-0">
        {MOCK_PROFILE_FUNNELS.map((f, idx) => (
          <li
            key={f.handle}
            className={
              idx === MOCK_PROFILE_FUNNELS.length - 1
                ? "py-3"
                : "border-b border-admin-border py-3"
            }
          >
            <FunnelRow funnel={f} max={max} />
          </li>
        ))}
      </ul>
    </AdminCard>
  );
}

function FunnelRow({
  funnel,
  max,
}: {
  funnel: MockProfileFunnel;
  max: number;
}) {
  const analysesPct = Math.round((funnel.analyses / max) * 100);
  const reportsPct = Math.round((funnel.reports / max) * 100);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[13px] text-admin-text-primary">
          {funnel.handle}
        </span>
        <span
          className="font-mono text-[12px]"
          style={{ color: ADMIN_LITERAL.profileBarReports }}
        >
          {funnel.conversionPct}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 rounded-full"
            style={{
              width: `${analysesPct}%`,
              backgroundColor: ADMIN_LITERAL.profileFunnelBase,
            }}
          />
          <span className="text-[11px] text-admin-text-tertiary">
            {funnel.analyses} análises grátis
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 rounded-full"
            style={{
              width: `${reportsPct}%`,
              backgroundColor: ADMIN_LITERAL.profileBarReports,
            }}
          />
          <span className="text-[11px] text-admin-text-tertiary">
            {funnel.reports} reports pagos
          </span>
        </div>
      </div>
    </div>
  );
}