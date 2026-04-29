/**
 * Receita · Secção 5 — Últimas faturas.
 *
 * Tabela financeira simples — 6 movimentos recentes.
 */

import { DemoOnlySection } from "../demo-only-section";
import { AdminCard } from "../admin-card";
import { AdminBadge } from "../admin-badge";
import { MOCK_INVOICES } from "@/lib/admin/mock-data";

export function InvoicesSection() {
  return (
    <DemoOnlySection
      title="Últimas faturas"
      subtitle="fluxo financeiro recente"
      accent="revenue"
      info={"Movimentos financeiros recentes (subscrições renovadas + reports avulsos vendidos)."}
      pendingReason={"A lista de faturas vem da integração com o gateway de pagamento (EuPago/Stripe). Será preenchida quando houver pagamentos reais."}
    >
      <section>
      <AdminCard className="!px-5 !py-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="admin-eyebrow text-left font-normal pb-2 pr-3">Data</th>
                <th className="admin-eyebrow text-left font-normal pb-2 px-3">Cliente</th>
                <th className="admin-eyebrow text-left font-normal pb-2 px-3">Tipo</th>
                <th className="admin-eyebrow text-left font-normal pb-2 px-3">Plano / Item</th>
                <th className="admin-eyebrow text-right font-normal pb-2 px-3">Valor</th>
                <th className="admin-eyebrow text-left font-normal pb-2 pl-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_INVOICES.map((row, i) => (
                <tr
                  key={i}
                  className="border-t border-admin-border-soft transition-colors hover:bg-admin-bg-subtle"
                >
                  <td
                    className="py-3.5 pr-3 font-mono text-admin-text-secondary whitespace-nowrap"
                    style={{ fontFeatureSettings: "'tnum'" }}
                  >
                    {row.date}
                  </td>
                  <td className="py-3.5 px-3 text-admin-text-primary whitespace-nowrap">
                    {row.customer}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <AdminBadge
                      variant={row.type === "subscrição" ? "revenue" : "expense"}
                    >
                      {row.type}
                    </AdminBadge>
                  </td>
                  <td className="py-3.5 px-3 text-admin-text-secondary">
                    {row.item}
                  </td>
                  <td
                    className="py-3.5 px-3 text-right font-mono font-medium text-admin-text-primary whitespace-nowrap"
                    style={{ fontFeatureSettings: "'tnum'" }}
                  >
                    {row.amount}
                  </td>
                  <td className="py-3.5 pl-3 whitespace-nowrap">
                    <AdminBadge
                      variant={row.status === "paga" ? "revenue" : "danger"}
                    >
                      {row.status}
                    </AdminBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </section>
    </DemoOnlySection>
  );
}