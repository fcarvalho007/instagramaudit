/**
 * Clientes · Secção 2 — Lista de clientes.
 *
 * Header com título + 4 botões pill (filtros). Cartão branco contém uma
 * `<table>` semântica com avatar, badge de estado, LTV, reports, última
 * actividade e sinal por linha. Linha seleccionada (Ana Marques) destacada.
 */

import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { AdminBadge } from "../admin-badge";
import { AdminAvatar } from "../admin-avatar";
import { AdminActionButton } from "../admin-action-button";
import {
  MOCK_CUSTOMERS_LIST,
  MOCK_CUSTOMERS_TOTALS,
  type CustomerRow,
} from "@/lib/admin/mock-data";

function SignalCell({ signal }: { signal: CustomerRow["signal"] }) {
  if (signal.kind === "active") {
    return (
      <span
        className="text-[11px]"
        style={{ color: "#0F6E56" }}
      >
        activo
      </span>
    );
  }
  if (signal.kind === "sub_candidate") {
    return <AdminBadge variant="signal">{signal.label}</AdminBadge>;
  }
  if (signal.kind === "repeated_search" || signal.kind === "at_risk") {
    return <AdminBadge variant="danger">{signal.label}</AdminBadge>;
  }
  return <span className="text-admin-text-tertiary">—</span>;
}

export function CustomersTableSection() {
  return (
    <section>
      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="block w-[3px] h-4 rounded-sm shrink-0 bg-admin-revenue-500"
          />
          <h2 className="m-0 text-[13px] font-medium uppercase tracking-[0.06em] text-admin-text-primary">
            Lista de clientes
          </h2>
        </div>
        <div
          className="ml-auto flex items-center gap-1.5"
          role="group"
          aria-label="Filtros de cliente"
        >
          {MOCK_CUSTOMERS_TOTALS.map((f, i) => (
            <AdminActionButton
              key={f.key}
              size="sm"
              variant={i === 0 ? "active" : "default"}
              aria-pressed={i === 0}
            >
              {f.label} · {f.count}
            </AdminActionButton>
          ))}
        </div>
      </div>

      <AdminCard className="!px-5 !py-4">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="py-2 text-left text-[11px] font-normal uppercase tracking-[0.06em] text-admin-text-tertiary">
                Cliente
              </th>
              <th className="py-2 text-left text-[11px] font-normal uppercase tracking-[0.06em] text-admin-text-tertiary">
                Estado
              </th>
              <th className="py-2 text-right text-[11px] font-normal uppercase tracking-[0.06em] text-admin-text-tertiary">
                LTV
              </th>
              <th className="py-2 text-right text-[11px] font-normal uppercase tracking-[0.06em] text-admin-text-tertiary">
                Reports
              </th>
              <th className="py-2 text-right text-[11px] font-normal uppercase tracking-[0.06em] text-admin-text-tertiary">
                Última actividade
              </th>
              <th className="py-2 text-right text-[11px] font-normal uppercase tracking-[0.06em] text-admin-text-tertiary">
                Sinal
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CUSTOMERS_LIST.map((c) => (
              <tr
                key={c.id}
                className={`cursor-pointer border-t border-admin-border-strong transition-colors hover:bg-admin-neutral-50 ${
                  c.selected ? "bg-admin-neutral-50" : ""
                }`}
              >
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2.5">
                    <AdminAvatar
                      initials={c.initials}
                      variant={c.avatarVariant}
                      size={32}
                      ariaLabel={c.name}
                    />
                    <div className="min-w-0">
                      <p
                        className={`m-0 text-[13px] text-admin-text-primary ${
                          c.selected ? "font-medium" : ""
                        }`}
                      >
                        {c.name}
                      </p>
                      <p className="m-0 text-[11px] text-admin-text-secondary">
                        {c.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-3">
                  <AdminBadge variant={c.badgeVariant}>{c.badgeLabel}</AdminBadge>
                </td>
                <td
                  className={`py-3 pr-3 text-right font-medium ${
                    c.ltv === "—"
                      ? "text-admin-text-tertiary"
                      : "text-admin-text-primary"
                  }`}
                >
                  {c.ltv}
                </td>
                <td
                  className={`py-3 pr-3 text-right ${
                    c.reportsMuted
                      ? "text-admin-text-secondary"
                      : "text-admin-text-primary"
                  }`}
                >
                  {c.reports}
                </td>
                <td className="py-3 pr-3 text-right text-[12px] text-admin-text-secondary">
                  {c.lastActivity}
                </td>
                <td className="py-3 text-right">
                  <SignalCell signal={c.signal} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex items-center justify-between border-t border-admin-border-strong pt-3">
          <p className="m-0 text-[11px] text-admin-text-tertiary">
            A mostrar 7 de 312 · ordenado por última actividade
          </p>
          <div className="flex items-center gap-1.5">
            <AdminActionButton size="sm" aria-label="Página anterior">
              ←
            </AdminActionButton>
            <AdminActionButton size="sm" aria-label="Página seguinte">
              →
            </AdminActionButton>
          </div>
        </div>
      </AdminCard>
    </section>
  );
}