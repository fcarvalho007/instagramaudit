/**
 * CostSummaryCard — versão condensada da despesa para a Visão Geral.
 *
 * Mostra:
 *   • 3 fornecedores (Apify · OpenAI · DataForSEO) com valor + barra
 *   • custo médio por análise
 *   • fiabilidade (linkage rate provider_call_logs → analysis_events)
 *
 * Detalhe pesado (actor breakdown, evolução diária, reconciliação) vive
 * em `/admin/sistema` e `/admin/receita`. Esta card é só sinal de topo.
 */

import { useQuery } from "@tanstack/react-query";
import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { ProgressBar } from "../progress-bar";
import { SectionError, SectionSkeleton } from "../section-state";
import { adminFetch } from "@/lib/admin/fetch";
import type { OverviewKpis } from "@/routes/api/admin/overview-kpis";

const PROVIDER_COLOR: Record<"apify" | "openai" | "dataforseo", string> = {
  apify: "#BA7517",
  openai: "#378ADD",
  dataforseo: "#534AB7",
};

function Row({
  label,
  value,
  capLabel,
  pct,
  color,
}: {
  label: string;
  value: number;
  capLabel: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="flex items-center gap-2 text-[13px] font-medium text-admin-text-primary">
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          {label}
        </span>
        <span className="font-mono text-[14px] font-medium text-admin-text-primary tabular-nums">
          ${value.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-admin-neutral-50 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, pct * 100))}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <p className="mt-1 text-[11px] text-admin-text-tertiary">{capLabel}</p>
    </div>
  );
}

export function CostSummaryCard() {
  const { data, isLoading, error, refetch } = useQuery<OverviewKpis>({
    queryKey: ["admin", "overview-kpis"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/overview-kpis");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  return (
    <AdminCard>
      <AdminSectionHeader
        title="Custo por fornecedor"
        subtitle="últimos 30 dias"
        accent="expense"
      />
      {isLoading ? (
        <SectionSkeleton rows={3} rowHeight={28} />
      ) : error || !data ? (
        <SectionError error={error as Error} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <Row
              label="Apify"
              value={data.providers.apify.total}
              color={PROVIDER_COLOR.apify}
              capLabel={`${pctLabel(data.providers.apify.total, data.providers.apify.cap)} do limite $${data.providers.apify.cap}`}
              pct={data.providers.apify.cap > 0 ? data.providers.apify.total / data.providers.apify.cap : 0}
            />
            <Row
              label="OpenAI"
              value={data.providers.openai.total}
              color={PROVIDER_COLOR.openai}
              capLabel={`${pctLabel(data.providers.openai.total, data.providers.openai.cap)} do cap $${data.providers.openai.cap}`}
              pct={data.providers.openai.cap > 0 ? data.providers.openai.total / data.providers.openai.cap : 0}
            />
            <Row
              label="DataForSEO"
              value={data.providers.dataforseo.total}
              color={PROVIDER_COLOR.dataforseo}
              capLabel={
                data.providers.dataforseo.balance !== null
                  ? `saldo $${data.providers.dataforseo.balance.toFixed(2)}`
                  : "saldo desconhecido"
              }
              pct={
                data.providers.dataforseo.balance && data.providers.dataforseo.balance > 0
                  ? data.providers.dataforseo.total /
                    (data.providers.dataforseo.total + data.providers.dataforseo.balance)
                  : 0
              }
            />
          </div>

          <div className="mt-5 pt-4 border-t border-admin-border flex items-baseline justify-between gap-3">
            <div>
              <p className="m-0 text-[12px] uppercase tracking-wider text-admin-text-tertiary font-medium">
                Custo médio / análise
              </p>
              <p className="m-0 mt-1 text-[11px] text-admin-text-tertiary">
                fiabilidade {data.reliability_pct.toFixed(1)}%
              </p>
            </div>
            <span className="font-mono text-[1.5rem] font-medium tabular-nums text-admin-text-primary leading-none">
              {data.avg_cost_per_report !== null
                ? `$${data.avg_cost_per_report.toFixed(2)}`
                : "—"}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-3 text-[12px] text-admin-text-tertiary">
            <span>
              Total plataforma{" "}
              <span className="font-mono tabular-nums text-admin-text-secondary">
                ${data.cost_total_30d.toFixed(2)}
              </span>
            </span>
            <span title="Chamadas ligadas a análises públicas (exclui lab e órfãs)">
              Atribuído a público{" "}
              <span className="font-mono tabular-nums text-admin-text-secondary">
                ${data.cost_public_30d.toFixed(2)}
              </span>
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between gap-3 text-[12px] text-admin-text-tertiary">
            <span title="Produção: análises públicas + enriquecimento de comentários. Base para custo/lead e margem.">
              Produção{" "}
              <span className="font-mono tabular-nums text-admin-text-secondary">
                ${data.production_cost_30d.toFixed(2)}
              </span>
            </span>
            <span title="Apify Lab / I&D — corre real, conta para o total mas NÃO para custo/lead.">
              I&D · Lab{" "}
              <span className="font-mono tabular-nums text-admin-text-secondary">
                ${data.lab_cost_30d.toFixed(2)}
              </span>
            </span>
          </div>
        </>
      )}
    </AdminCard>
  );
}

function pctLabel(value: number, cap: number): string {
  if (cap <= 0) return "0%";
  const pct = (value / cap) * 100;
  return `${pct < 10 ? pct.toFixed(1) : pct.toFixed(0)}%`;
}