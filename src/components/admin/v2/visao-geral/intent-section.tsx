/**
 * Secção 5 — Sinais de intenção.
 * Duas colunas: pesquisas repetidas + últimos relatórios.
 */

import { useState } from "react";

import { AdminCard } from "../admin-card";
import { AdminBadge } from "../admin-badge";
import { ReportDrawer } from "../report-drawer";
import { DemoOnlySection } from "../demo-only-section";
import {
  MOCK_INTENT_REPEATED,
  MOCK_REPORTS_LIST,
} from "@/lib/admin/mock-data";

/**
 * "Últimos relatórios" usa as primeiras 4 entradas de `MOCK_REPORTS_LIST`
 * para que cada linha tenha um id real reconhecido por `getMockReportDetail`
 * e permita abrir o `ReportDrawer` directamente.
 */
const RECENT_REPORTS = MOCK_REPORTS_LIST.slice(0, 4);

export function IntentSection() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  function openReport(id: string) {
    setSelectedReportId(id);
    setDrawerOpen(true);
  }

  return (
    <DemoOnlySection
      title="Sinais de intenção"
      subtitle="oportunidades quentes"
      accent="signal"
      info="Sinais comportamentais que indicam intenção de compra elevada. Pesquisas repetidas são leads quentes."
      pendingReason="Pesquisas repetidas e relatórios pagos requerem dedup de pesquisas anónimas e ciclo de checkout. A versão real chega na próxima fase — entretanto a tab Perfis já mostra perfis analisados reais."
    >
    <section>
      <div className="grid gap-3.5 grid-cols-1 lg:grid-cols-2">
        {/* Pesquisas repetidas */}
        <AdminCard>
          <CardHeader
            title="Pesquisas repetidas"
            eyebrowRight="leads quentes"
            subtitle="Mesmo perfil pesquisado várias vezes — sinal forte de intenção."
          />
          <ul className="m-0 mt-4 flex list-none flex-col gap-1.5 p-0">
            {MOCK_INTENT_REPEATED.map((row) => (
              <Row key={row.profile}>
                <div>
                  <p className="m-0 text-[13px] font-medium text-admin-text-primary">
                    {row.profile}
                  </p>
                  <p className="mt-px text-[11px] text-admin-text-secondary">
                    por{" "}
                    <span className="text-admin-text-primary">{row.lead}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="m-0 text-sm font-medium text-admin-signal-500">
                    {row.count}
                  </p>
                  <p className="mt-px text-[10px] text-admin-text-tertiary">
                    {row.time}
                  </p>
                </div>
              </Row>
            ))}
          </ul>
        </AdminCard>

        {/* Últimos relatórios */}
        <AdminCard>
          <CardHeader
            title="Últimos relatórios"
            eyebrowRight="clica para detalhe"
            subtitle="Pedidos pagos e seu estado de entrega."
          />
          <ul className="m-0 mt-4 flex list-none flex-col gap-1.5 p-0">
            {RECENT_REPORTS.map((row) => {
              const statusLabel =
                row.status === "delivered"
                  ? "entregue"
                  : row.status === "failed"
                    ? "falhou"
                    : row.status === "queued"
                      ? "em fila"
                      : "a processar";
              const statusVariant =
                row.status === "delivered"
                  ? "revenue"
                  : row.status === "failed"
                    ? "danger"
                    : "expense";
              return (
                <li key={row.id} className="list-none">
                  <button
                    type="button"
                    onClick={() => openReport(row.id)}
                    aria-label={`Ver detalhe do report ${row.id}`}
                    className="flex w-full items-center justify-between gap-3 rounded-lg bg-admin-neutral-50 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-admin-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-leads-500"
                  >
                    <div className="min-w-0">
                      <p className="m-0 truncate text-[13px] font-medium text-admin-text-primary">
                        {row.profile}
                      </p>
                      <p className="mt-px truncate text-[11px] text-admin-text-secondary">
                        <span className="text-admin-text-primary">
                          {row.customer}
                        </span>{" "}
                        ·{" "}
                        {row.origin === "subscription" ? "sub" : "avulso"}
                      </p>
                    </div>
                    <AdminBadge variant={statusVariant}>{statusLabel}</AdminBadge>
                  </button>
                </li>
              );
            })}
          </ul>
        </AdminCard>
      </div>

      <ReportDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        reportId={selectedReportId}
      />
    </section>
    </DemoOnlySection>
  );
}

function CardHeader({
  title,
  subtitle,
  eyebrowRight,
}: {
  title: string;
  subtitle: string;
  eyebrowRight: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between">
        <p className="m-0 text-sm font-medium text-admin-text-primary">
          {title}
        </p>
        <span className="text-[11px] text-admin-text-tertiary">
          {eyebrowRight}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-admin-text-tertiary">{subtitle}</p>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-admin-neutral-50 px-3 py-2.5">
      {children}
    </li>
  );
}