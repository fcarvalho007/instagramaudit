/**
 * Receita · Bloco Pagamentos — visibilidade operacional do checkout.
 *
 * Mostra contagens e totais por produto/estado, performance do upsell
 * 9€ → 97€ e os últimos 20 pagamentos (qualquer estado). Lê de
 * `/api/admin/payments-overview` (admin-gated, sem provider calls).
 */

import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";

import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { KPICard } from "../kpi-card";
import { SectionError, SectionSkeleton } from "../section-state";
import { adminFetch } from "@/lib/admin/fetch";
import type { PaymentRow, PaymentsOverview } from "@/routes/api/admin/payments-overview";

const EUR = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});
const NUM = new Intl.NumberFormat("pt-PT");

const PRODUCT_LABELS: Record<string, string> = {
  report_full_9: "Relatório completo 9€",
  authority_diagnosis_97: "Diagnóstico 97€",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhado",
  expired: "Expirado",
};

function productLabel(p: string): string {
  return PRODUCT_LABELS[p] ?? p;
}

function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s;
}

function statusPillClass(status: string): string {
  switch (status) {
    case "paid":
      return "bg-admin-revenue-50 text-admin-revenue-700 ring-admin-revenue-200";
    case "pending":
      return "bg-admin-amber-50 text-admin-amber-700 ring-admin-amber-200";
    case "failed":
      return "bg-admin-error-50 text-admin-error-700 ring-admin-error-200";
    default:
      return "bg-admin-border/30 text-admin-text-secondary ring-admin-border";
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchOverview(): Promise<PaymentsOverview> {
  const res = await adminFetch("/api/admin/payments-overview");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as PaymentsOverview;
}

export function PaymentsSection() {
  const q = useQuery({
    queryKey: ["admin", "receita", "payments-overview"],
    queryFn: fetchOverview,
    refetchInterval: 60_000,
  });

  return (
    <section>
      <AdminSectionHeader
        title="Pagamentos"
        subtitle="checkouts · estado · upsell 9€ → 97€"
        accent="revenue"
        info="Agrega lead_payments e lead_entitlements para os produtos activos (report_full_9, authority_diagnosis_97). Sem chamadas ao EuPago."
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
        <PaymentsBody data={q.data!} />
      )}
    </section>
  );
}

function PaymentsBody({ data }: { data: PaymentsOverview }) {
  const { totals, upsell, by_product_status, entitlements_by_product, pending_stale, recent_all } = data;

  const pendingSub =
    pending_stale.length > 0
      ? `${NUM.format(pending_stale.length)} com mais de 1h`
      : "sem pendentes antigas";

  const upsellValue =
    upsell.upsell_presented > 0
      ? `${NUM.format(upsell.upsell_accepted)} / ${NUM.format(upsell.upsell_presented)}`
      : "—";
  const upsellSub =
    upsell.conversion_pct != null
      ? `${upsell.conversion_pct.toFixed(0)}% conversão · ${NUM.format(upsell.upsell_declined)} declinados`
      : `${NUM.format(upsell.report_full_9_checkouts)} checkouts 9€`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KPICard
          eyebrow="Checkouts iniciados"
          value={NUM.format(totals.checkouts_started)}
          accent="info"
          variant="accent-left"
          info="Total de linhas em lead_payments para os dois produtos activos."
        />
        <KPICard
          eyebrow="Pendentes"
          value={NUM.format(totals.pending)}
          accent="info"
          variant="accent-left"
          info="lead_payments com status='pending' (checkout aberto, sem confirmação do webhook)."
          sub={pendingSub}
        />
        <KPICard
          eyebrow="Pagos"
          value={NUM.format(totals.paid)}
          accent="revenue"
          variant="accent-left"
          info="lead_payments confirmados via webhook EuPago."
        />
        <KPICard
          eyebrow="Falhados"
          value={NUM.format(totals.failed)}
          accent="leads"
          variant="accent-left"
          info="lead_payments com status='failed' (erro no provider ou no nosso lado)."
        />
        <KPICard
          eyebrow="Receita paga"
          value={EUR.format(totals.paid_amount_eur)}
          accent="revenue"
          variant="accent-left"
          info="Soma de amount_cents para status='paid'."
        />
        <KPICard
          eyebrow="Upsell 9€ → 97€"
          value={upsellValue}
          accent="revenue"
          variant="accent-left"
          info="Aceites / vistos. Calculado a partir de metadata.upsell_presented e metadata.upsell_accepted nos checkouts que começaram em report_full_9."
          sub={upsellSub}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold text-admin-text-primary">
            Por produto e estado
          </h3>
          {by_product_status.length === 0 ? (
            <p className="m-0 text-sm text-admin-text-tertiary">
              Sem pagamentos ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-eyebrow-sm text-admin-text-tertiary">
                    <th className="py-2 pr-4 font-medium">Produto</th>
                    <th className="py-2 pr-4 font-medium">Estado</th>
                    <th className="py-2 pr-4 font-medium text-right">Nº</th>
                    <th className="py-2 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {by_product_status.map((row) => (
                    <tr
                      key={`${row.product}-${row.status}`}
                      className="border-t border-admin-border/60 text-admin-text-secondary"
                    >
                      <td className="py-2 pr-4">{productLabel(row.product)}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ${statusPillClass(row.status)}`}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {NUM.format(row.count)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {EUR.format(row.amount_eur)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold text-admin-text-primary">
            Entitlements concedidos
          </h3>
          {Object.keys(entitlements_by_product).length === 0 ? (
            <p className="m-0 text-sm text-admin-text-tertiary">
              Sem entitlements ainda — só são concedidos quando o webhook EuPago confirma o pagamento.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {Object.entries(entitlements_by_product).map(([code, count]) => (
                <li
                  key={code}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="text-admin-text-secondary">{productLabel(code)}</span>
                  <span className="tabular-nums text-admin-text-primary">
                    {NUM.format(count)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      <AdminCard>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-admin-text-primary">
            Últimos 20 pagamentos
          </h3>
          <span className="text-eyebrow-sm text-admin-text-tertiary">
            {recent_all.length === 0 ? "vazio" : `${recent_all.length} mais recentes`}
          </span>
        </div>

        {recent_all.length === 0 ? (
          <p className="m-0 text-sm text-admin-text-tertiary">
            Sem pagamentos registados. Aparecem aqui assim que alguém iniciar checkout.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-eyebrow-sm text-admin-text-tertiary">
                  <th className="py-2 pr-4 font-medium whitespace-nowrap">Data</th>
                  <th className="py-2 pr-4 font-medium">Lead</th>
                  <th className="py-2 pr-4 font-medium">Produto</th>
                  <th className="py-2 pr-4 font-medium text-right">Valor</th>
                  <th className="py-2 pr-4 font-medium">Estado</th>
                  <th className="py-2 pr-4 font-medium">Origem</th>
                  <th className="py-2 pr-4 font-medium">Prioridade</th>
                  <th className="py-2 pr-4 font-medium">Upsell</th>
                  <th className="py-2 pr-4 font-medium">Checkout</th>
                  <th className="py-2 font-medium">Falha</th>
                </tr>
              </thead>
              <tbody>
                {recent_all.map((row) => (
                  <PaymentRowView key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}

function PaymentRowView({ row }: { row: PaymentRow }) {
  const upsellCell =
    row.upsell_accepted === true
      ? "✓"
      : row.upsell_presented === true
        ? "·"
        : "—";

  return (
    <tr className="border-t border-admin-border/60 align-top text-admin-text-secondary">
      <td className="py-2 pr-4 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
      <td className="py-2 pr-4 max-w-[14rem] truncate" title={row.lead_email ?? row.lead_id}>
        {row.lead_email ?? <span className="text-admin-text-tertiary">—</span>}
      </td>
      <td className="py-2 pr-4 whitespace-nowrap">{productLabel(row.product)}</td>
      <td className="py-2 pr-4 text-right tabular-nums whitespace-nowrap">
        {EUR.format(row.amount_cents / 100)}
      </td>
      <td className="py-2 pr-4">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ${statusPillClass(row.status)}`}
        >
          {statusLabel(row.status)}
        </span>
      </td>
      <td className="py-2 pr-4 max-w-[10rem] truncate" title={row.source_component ?? undefined}>
        {row.source_component ?? <span className="text-admin-text-tertiary">—</span>}
      </td>
      <td className="py-2 pr-4 max-w-[10rem] truncate" title={row.report_priority ?? undefined}>
        {row.report_priority ?? <span className="text-admin-text-tertiary">—</span>}
      </td>
      <td className="py-2 pr-4 text-center">{upsellCell}</td>
      <td className="py-2 pr-4">
        {row.provider_checkout_url ? (
          <a
            href={row.provider_checkout_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-admin-accent hover:underline"
            title="Abrir checkout EuPago"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            abrir
          </a>
        ) : (
          <span className="text-admin-text-tertiary">—</span>
        )}
      </td>
      <td className="py-2 max-w-[16rem] truncate" title={row.failure_reason ?? undefined}>
        {row.failure_reason ?? <span className="text-admin-text-tertiary">—</span>}
      </td>
    </tr>
  );
}