/**
 * Receita · Secção 5 — Últimas faturas.
 *
 * Tabela financeira simples — 6 movimentos recentes.
 */

import { AdminSectionHeader } from "../admin-section-header";
import { AdminCard } from "../admin-card";
import { AdminBadge } from "../admin-badge";
import { MOCK_INVOICES } from "@/lib/admin/mock-data";

export function InvoicesSection() {
  return (
    <section>
      <AdminSectionHeader
        title="Últimas faturas"
        subtitle="fluxo financeiro recente"
        accent="revenue"
        info="Movimentos financeiros recentes (subscrições renovadas + reports avulsos vendidos)."
      />

      <AdminCard className="!px-6 !py-5">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="admin-eyebrow text-left font-normal pb-3 pr-3">Data</th>
                <th className="admin-eyebrow text-left font-normal pb-3 px-3">Cliente</th>
                <th className="admin-eyebrow text-left font-normal pb-3 px-3">Tipo</th>
                <th className="admin-eyebrow text-left font-normal pb-3 px-3">Plano / Item</th>
                <th className="admin-eyebrow text-right font-normal pb-3 px-3">Valor</th>
                <th className="admin-eyebrow text-left font-normal pb-3 pl-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_INVOICES.map((row, i) => (
                <tr key={i} className="border-t border-admin-border">
                  <td className="py-3.5 pr-3 font-mono text-admin-text-secondary whitespace-nowrap">
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
                  <td className="py-3.5 px-3 text-right admin-num font-medium text-admin-text-primary whitespace-nowrap">
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
  );
}