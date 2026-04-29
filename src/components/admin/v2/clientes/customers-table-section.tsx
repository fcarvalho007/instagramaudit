/**
 * Clientes · Secção 2 — Lista de clientes.
 *
 * Header com título + 4 botões pill (filtros). Cartão branco contém uma
 * `<table>` semântica com avatar, badge de estado, LTV, reports, última
 * actividade e sinal por linha. Linha seleccionada (Ana Marques) destacada.
 */

import { useMemo, useRef, useState } from "react";

import { AdminCard } from "../admin-card";
import { DemoOnlySection } from "../demo-only-section";
import { AdminBadge } from "../admin-badge";
import { AdminAvatar } from "../admin-avatar";
import { AdminActionButton } from "../admin-action-button";
import { FilterPills, type FilterOption } from "../filter-pills";
import {
  AdminSearchInput,
  type AdminSearchInputHandle,
} from "../admin-search-input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCmdK } from "@/hooks/use-cmd-k";
import {
  MOCK_CUSTOMERS_LIST,
  MOCK_CUSTOMERS_TOTALS,
  type CustomerRow,
} from "@/lib/admin/mock-data";

type CustomerFilter = "all" | "subscribers" | "one_off" | "at_risk";

function matchesCustomerFilter(filter: CustomerFilter, row: CustomerRow): boolean {
  if (filter === "all") return true;
  if (filter === "subscribers") return row.badgeLabel.toLowerCase().includes("pro") ||
    row.badgeLabel.toLowerCase().includes("agency") ||
    row.badgeLabel.toLowerCase().includes("starter");
  if (filter === "one_off") return row.badgeLabel.toLowerCase().includes("avulso");
  return row.signal.kind === "at_risk";
}

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
  const [filter, setFilter] = useState<CustomerFilter>("all");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 200);
  const searchRef = useRef<AdminSearchInputHandle>(null);
  useCmdK(() => searchRef.current?.focus());

  const totalsByKey = MOCK_CUSTOMERS_TOTALS.reduce<Record<string, number>>(
    (acc, t) => {
      acc[t.key] = t.count;
      return acc;
    },
    {},
  );

  const filterOptions: ReadonlyArray<FilterOption<CustomerFilter>> = [
    { value: "all", label: "Todos", count: totalsByKey.all ?? MOCK_CUSTOMERS_LIST.length },
    { value: "subscribers", label: "Subscritores", count: totalsByKey.subscribers ?? 0 },
    { value: "one_off", label: "Avulso", count: totalsByKey.one_off ?? 0 },
    { value: "at_risk", label: "Em risco", count: totalsByKey.at_risk ?? 0 },
  ];

  const rows = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return MOCK_CUSTOMERS_LIST.filter((c) => {
      if (!matchesCustomerFilter(filter, c)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    });
  }, [filter, debouncedQuery]);

  return (
    <DemoOnlySection
      title="Lista de clientes"
      accent="revenue"
      info={"Todos os clientes ordenados por última actividade. Os filtros pill permitem ver subscritores, avulsos ou contas em risco."}
      pendingReason={"A lista unificada de clientes (free, trial, ativo, churned) depende do ciclo de vida de subscrições. Para já só temos leads — vê a tab Perfis para perfis analisados reais."}
    >
      <section>
      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <AdminSearchInput
            ref={searchRef}
            value={query}
            onChange={setQuery}
            placeholder="Pesquisar nome ou email…"
            ariaLabel="Pesquisar clientes"
          />
          <FilterPills
            options={filterOptions}
            value={filter}
            onChange={setFilter}
            ariaLabel="Filtros de cliente"
          />
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
            {rows.map((c) => (
              <tr
                key={c.id}
                className={`cursor-pointer border-t border-admin-border-strong transition-colors hover:bg-[var(--admin-bg-subtle)] ${
                  c.selected ? "bg-[var(--admin-bg-subtle)]" : ""
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
                  className={`py-3 pr-3 text-right font-mono font-medium ${
                    c.ltv === "—"
                      ? "text-admin-text-tertiary"
                      : "text-admin-text-primary"
                  }`}
                  style={{ fontFeatureSettings: '"tnum"' }}
                >
                  {c.ltv}
                </td>
                <td
                  className={`py-3 pr-3 text-right font-mono ${
                    c.reportsMuted
                      ? "text-admin-text-secondary"
                      : "text-admin-text-primary"
                  }`}
                  style={{ fontFeatureSettings: '"tnum"' }}
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
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-[12px] text-admin-text-tertiary"
                >
                  {debouncedQuery
                    ? `Sem resultados para «${debouncedQuery}». `
                    : "Sem clientes para este filtro."}
                  {debouncedQuery ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="underline underline-offset-2 hover:text-admin-text-primary"
                    >
                      Limpar pesquisa
                    </button>
                  ) : null}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div className="mt-3 flex items-center justify-between border-t border-admin-border-strong pt-3">
          <p className="m-0 text-[11px] text-admin-text-tertiary">
            A mostrar {rows.length} de {totalsByKey.all ?? MOCK_CUSTOMERS_LIST.length} · ordenado por última actividade
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
    </DemoOnlySection>
  );
}