/**
 * Custos detalhados — 4 KPICards, tabela das últimas chamadas ao provedor
 * (10 linhas, 8 colunas) e cartão de alertas operacionais (2 itens).
 */

import { ArrowRight } from "lucide-react";

import { AdminCard } from "@/components/admin/v2/admin-card";
import { AdminBadge } from "@/components/admin/v2/admin-badge";
import { AdminSectionHeader } from "@/components/admin/v2/admin-section-header";
import { KPICard } from "@/components/admin/v2/kpi-card";
import {
  ACCENT_500,
  ACCENT_BG_50,
  type AdminAccent,
} from "@/components/admin/v2/admin-tokens";
import {
  MOCK_ALERTS,
  MOCK_COST_METRICS,
  MOCK_PROVIDER_CALLS,
  type MockAlert,
  type MockProviderCall,
} from "@/lib/admin/mock-data";

const PROVIDER_BADGE: Record<MockProviderCall["provider"], AdminAccent> = {
  Apify: "expense",
  OpenAI: "info",
};

const STATUS_BADGE: Record<
  MockProviderCall["status"],
  { label: string; variant: AdminAccent }
> = {
  success: { label: "Sucesso", variant: "revenue" },
  cache:   { label: "Cache",   variant: "expense" },
  failure: { label: "Falha",   variant: "danger"  },
};

const ALERT_ACCENT: Record<MockAlert["severity"], AdminAccent> = {
  warning: "signal",
  critical: "danger",
  info: "info",
};

const ALERT_EYEBROW: Record<MockAlert["severity"], string> = {
  warning: "AVISO",
  critical: "CRÍTICO",
  info: "INFO",
};

function ProviderCallRow({ call, first }: { call: MockProviderCall; first: boolean }) {
  return (
    <tr
      className={`${first ? "" : "border-t border-admin-border"} hover:bg-admin-surface-muted/60`}
    >
      <td className="py-3 pr-4 font-mono text-[12px] tabular-nums text-admin-text-primary">
        {call.when}
      </td>
      <td className="py-3 pr-4">
        <AdminBadge variant={PROVIDER_BADGE[call.provider]}>{call.provider}</AdminBadge>
      </td>
      <td className="py-3 pr-4 font-mono text-[12px] text-admin-text-secondary">
        {call.model}
      </td>
      <td className="py-3 pr-4 font-mono text-[12px] text-admin-text-primary">
        {call.handle}
      </td>
      <td className="py-3 pr-4">
        <AdminBadge variant={STATUS_BADGE[call.status].variant}>
          {STATUS_BADGE[call.status].label}
        </AdminBadge>
      </td>
      <td className="py-3 pr-4 font-mono text-[12px] tabular-nums text-admin-text-secondary">
        {call.http}
      </td>
      <td className="py-3 pr-4 text-right font-mono text-[12px] tabular-nums text-admin-text-secondary">
        {call.duration}
      </td>
      <td className="py-3 text-right font-mono text-[12px] tabular-nums text-admin-text-primary">
        {call.cost ?? "—"}
      </td>
    </tr>
  );
}

function AlertCard({ alert }: { alert: MockAlert }) {
  const accent = ALERT_ACCENT[alert.severity];
  return (
    <article
      className="rounded-lg px-4 py-3.5"
      style={{
        backgroundColor: ACCENT_BG_50[accent],
        borderLeft: `3px solid ${ACCENT_500[accent]}`,
      }}
    >
      <header className="mb-1 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-admin-text-tertiary">
          {ALERT_EYEBROW[alert.severity]}
        </span>
        <span className="text-[11px] text-admin-text-tertiary">{alert.when}</span>
      </header>
      <p className="m-0 text-[13px] font-medium text-admin-text-primary">
        {alert.title}
      </p>
      <p className="m-0 mt-1 text-[12px] text-admin-text-secondary">
        {alert.detail}
      </p>
    </article>
  );
}

export function CostsDetailSection() {
  return (
    <section>
      <AdminSectionHeader
        accent="expense"
        title="Custos detalhados"
        info="Estimativas internas de custo por chamada Apify e tokens OpenAI. Não é a fatura real do provedor — é uma projecção baseada nas tarifas configuradas."
      />

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          eyebrow="Custo Apify · 24h"
          value={MOCK_COST_METRICS.apify24h.value}
          sub={MOCK_COST_METRICS.apify24h.sub}
          size="lg"
        />
        <KPICard
          eyebrow="Custo OpenAI · 24h"
          value={MOCK_COST_METRICS.openai24h.value}
          sub={MOCK_COST_METRICS.openai24h.sub}
          size="lg"
        />
        <KPICard
          eyebrow="Cache hits · 24h"
          value={MOCK_COST_METRICS.cacheHits.value}
          sub={MOCK_COST_METRICS.cacheHits.sub}
          size="lg"
        />
        <KPICard
          eyebrow="Poupança · cache"
          value={MOCK_COST_METRICS.cacheSavings.value}
          sub={MOCK_COST_METRICS.cacheSavings.sub}
          size="lg"
        />
      </div>

      {/* Últimas chamadas ao provedor */}
      <AdminCard className="mt-4">
        <div className="mb-4">
          <h3 className="m-0 text-[16px] font-medium text-admin-text-primary">
            Últimas chamadas ao provedor
          </h3>
          <p className="m-0 mt-0.5 text-[12px] text-admin-text-tertiary">
            Para investigar timeouts, falhas HTTP ou erros de configuração
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {[
                  "Quando",
                  "Provedor",
                  "Actor / Modelo",
                  "Handle",
                  "Estado",
                  "HTTP",
                  "Duração",
                  "Custo",
                ].map((label, idx) => (
                  <th
                    key={label}
                    className={`pb-3 font-mono text-[10px] uppercase tracking-[0.08em] text-admin-text-tertiary ${
                      idx >= 6 ? "text-right" : "text-left"
                    }`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_PROVIDER_CALLS.map((call, idx) => (
                <ProviderCallRow
                  key={`${call.when}-${call.handle}-${idx}`}
                  call={call}
                  first={idx === 0}
                />
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* Alertas */}
      <AdminCard className="mt-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="m-0 text-[16px] font-medium text-admin-text-primary">
            Alertas
          </h3>
          <AdminBadge variant="expense">{MOCK_ALERTS.length} abertos</AdminBadge>
        </div>
        <div className="flex flex-col gap-3">
          {MOCK_ALERTS.map((alert, idx) => (
            <AlertCard key={`${alert.severity}-${idx}`} alert={alert} />
          ))}
        </div>
        <div className="mt-4 border-t border-admin-border pt-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-admin-info-700 hover:underline"
          >
            Ver todos os alertas
            <ArrowRight size={12} />
          </button>
        </div>
      </AdminCard>
    </section>
  );
}