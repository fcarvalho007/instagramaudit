/**
 * Receita · Bloco 2 — Sinais de pré-receita.
 *
 * Enquanto o checkout não está ligado, agregamos sinais reais de demanda:
 * pagamentos confirmados (lead_payments), intenção de compra dos beta
 * (beta_feedback) e WTP recolhido em /preços (pricing_interest).
 * Zero mockup: cada número vem do endpoint /api/admin/pre-revenue-signals.
 */

import { useQuery } from "@tanstack/react-query";

import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { KPICard } from "../kpi-card";
import { SectionError, SectionSkeleton } from "../section-state";
import { adminFetch } from "@/lib/admin/fetch";
import type { PreRevenueSignals } from "@/routes/api/admin/pre-revenue-signals";

async function fetchSignals(): Promise<PreRevenueSignals> {
  const res = await adminFetch("/api/admin/pre-revenue-signals");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as PreRevenueSignals;
}

const EUR = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const NUM = new Intl.NumberFormat("pt-PT");

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

export function PreRevenueSignalsSection() {
  const q = useQuery({
    queryKey: ["admin", "receita", "pre-revenue-signals"],
    queryFn: fetchSignals,
    refetchInterval: 60_000,
  });

  return (
    <section>
      <AdminSectionHeader
        title="Sinais de pré-receita"
        subtitle="pagamentos · intenção beta · interesse em /preços"
        accent="revenue"
        info="Indicadores reais de demanda enquanto o checkout não está ligado. Vêm de lead_payments, beta_feedback e pricing_interest."
      />

      {q.isLoading ? (
        <AdminCard>
          <SectionSkeleton rows={2} rowHeight={64} />
        </AdminCard>
      ) : q.error ? (
        <AdminCard>
          <SectionError error={q.error} onRetry={() => q.refetch()} />
        </AdminCard>
      ) : (
        <SignalsBody data={q.data!} />
      )}
    </section>
  );
}

function SignalsBody({ data }: { data: PreRevenueSignals }) {
  const { payments, beta_feedback, pricing_interest } = data;

  const intentSub =
    beta_feedback.total === 0
      ? "Sem respostas de feedback ainda"
      : `${beta_feedback.total} ${beta_feedback.total === 1 ? "resposta" : "respostas"} no total`;

  const interestSub =
    pricing_interest.total_30d === 0
      ? `${NUM.format(pricing_interest.total_all_time)} no histórico`
      : `${NUM.format(pricing_interest.would_pay_yes_30d)} disseram "sim, pagaria"`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          eyebrow="Pagamentos confirmados (30d)"
          value={NUM.format(payments.paid_count_30d)}
          accent="revenue"
          variant="accent-left"
          info="Linhas em lead_payments com status='paid' nos últimos 30 dias. Activa quando o checkout estiver ligado."
          sub={
            payments.paid_count_all_time === 0
              ? "0 pagamentos no histórico"
              : `${NUM.format(payments.paid_count_all_time)} no histórico`
          }
        />
        <KPICard
          eyebrow="Receita cobrada (30d)"
          value={EUR.format(payments.paid_amount_eur_30d)}
          accent="revenue"
          variant="accent-left"
          info="Soma de amount_cents (status='paid') nos últimos 30 dias. Activa quando o checkout estiver ligado."
          sub={`${EUR.format(payments.paid_amount_eur_all_time)} acumulados`}
        />
        <KPICard
          eyebrow="Intenção de compra beta"
          value={
            beta_feedback.positive_intent_pct == null
              ? "—"
              : `${beta_feedback.positive_intent_pct.toFixed(0)}%`
          }
          accent="leads"
          variant="accent-left"
          info="% de respostas de beta_feedback com purchase_intent ∈ {sim, talvez}."
          sub={intentSub}
        />
        <KPICard
          eyebrow="Interesse em /preços (30d)"
          value={NUM.format(pricing_interest.total_30d)}
          accent="info"
          variant="accent-left"
          info="Respostas submetidas na página de preços nos últimos 30 dias."
          sub={interestSub}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Intenção de compra (beta)"
          empty="Sem respostas de feedback ainda."
          rows={Object.entries(beta_feedback.by_intent)}
        />
        <BreakdownCard
          title="Opção escolhida em /preços (30d)"
          empty="Sem respostas em /preços nos últimos 30 dias."
          rows={Object.entries(pricing_interest.by_option_30d)}
        />
      </div>

      <AdminCard>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-admin-text-primary">
            Últimas respostas em /preços
          </h3>
          <span className="text-eyebrow-sm text-admin-text-tertiary">
            {pricing_interest.recent.length === 0
              ? "vazio"
              : `${pricing_interest.recent.length} mais recentes`}
          </span>
        </div>

        {pricing_interest.recent.length === 0 ? (
          <p className="m-0 text-sm text-admin-text-tertiary">
            Ainda não foram registadas respostas. Quando alguém submeter na
            página de preços, aparece aqui.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-eyebrow-sm text-admin-text-tertiary">
                  <th className="py-2 pr-4 font-medium">Data</th>
                  <th className="py-2 pr-4 font-medium">Opção</th>
                  <th className="py-2 pr-4 font-medium">Pagaria?</th>
                  <th className="py-2 pr-4 font-medium">Preço justo</th>
                  <th className="py-2 font-medium">Comentário</th>
                </tr>
              </thead>
              <tbody>
                {pricing_interest.recent.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-admin-border/60 align-top text-admin-text-secondary"
                  >
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="py-2 pr-4">{row.pricing_option}</td>
                    <td className="py-2 pr-4 capitalize">{row.would_pay}</td>
                    <td className="py-2 pr-4">{row.price_fairness ?? "—"}</td>
                    <td className="py-2 max-w-[28rem] truncate">
                      {row.comment ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}

function BreakdownCard({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Array<[string, number]>;
}) {
  const total = rows.reduce((s, [, v]) => s + v, 0);
  const sorted = [...rows].sort((a, b) => b[1] - a[1]);

  return (
    <AdminCard>
      <h3 className="mb-3 text-sm font-semibold text-admin-text-primary">{title}</h3>
      {total === 0 ? (
        <p className="m-0 text-sm text-admin-text-tertiary">{empty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {sorted.map(([key, value]) => {
            const pct = total > 0 ? (value / total) * 100 : 0;
            return (
              <li key={key} className="flex items-center gap-3 text-sm">
                <span className="min-w-[8rem] text-admin-text-secondary">{key}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-admin-border/40">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-admin-revenue-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-20 text-right tabular-nums text-admin-text-primary">
                  {NUM.format(value)} · {pct.toFixed(0)}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </AdminCard>
  );
}