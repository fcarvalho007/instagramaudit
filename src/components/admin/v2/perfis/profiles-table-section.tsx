/**
 * Tab Perfis · Secção 4 — Tabela de perfis (dados reais).
 *
 * Lê `/api/admin/profiles/list` (social_profiles + count de report_requests).
 * Filtros pill client-side + pesquisa por handle.
 */

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AdminCard } from "../admin-card";
import { AdminBadge } from "../admin-badge";
import { AdminAvatar } from "../admin-avatar";
import { AdminActionButton } from "../admin-action-button";
import { AdminSectionHeader } from "../admin-section-header";
import { FilterPills, type FilterOption } from "../filter-pills";
import { AdminSearchInput, type AdminSearchInputHandle } from "../admin-search-input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCmdK } from "@/hooks/use-cmd-k";
import { ADMIN_LITERAL } from "../admin-tokens";
import { adminFetch } from "@/lib/admin/fetch";

type ProfileFilter = "all" | "with_reports" | "repeated" | "no_conversion";

interface ProfileRow {
  handle: string;
  network: string;
  display_name: string | null;
  analyses: number;
  analyses_fresh: number;
  analyses_cache: number;
  followers_last_seen: number | null;
  last_analyzed_at: string | null;
  last_outcome: string | null;
  reports: number;
  conversion_pct: number;
}

interface ListApi {
  success: boolean;
  rows: ProfileRow[];
  total: number;
  counts: {
    all: number;
    with_reports: number;
    repeated: number;
    no_conversion: number;
  };
}

const PAGE_SIZE = 25;

function matchesFilter(filter: ProfileFilter, row: ProfileRow): boolean {
  if (filter === "all") return true;
  if (filter === "with_reports") return row.reports > 0;
  if (filter === "no_conversion") return row.reports === 0;
  return row.analyses >= 2;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

export function ProfilesTableSection() {
  const [filter, setFilter] = useState<ProfileFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 200);
  const searchRef = useRef<AdminSearchInputHandle>(null);
  useCmdK(() => searchRef.current?.focus());

  const { data, isLoading } = useQuery<ListApi>({
    queryKey: ["admin", "profiles", "list"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/profiles/list");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  const allRows = data?.rows ?? [];
  const counts = data?.counts ?? { all: 0, with_reports: 0, repeated: 0, no_conversion: 0 };

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return allRows.filter((r) => {
      if (!matchesFilter(filter, r)) return false;
      if (!q) return true;
      return (
        r.handle.toLowerCase().includes(q) ||
        (r.display_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [allRows, filter, debouncedQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const filterOptions: ReadonlyArray<FilterOption<ProfileFilter>> = [
    { value: "all", label: "Todos", count: counts.all },
    { value: "with_reports", label: "Com reports", count: counts.with_reports },
    { value: "repeated", label: "Repetidos", count: counts.repeated },
    { value: "no_conversion", label: "Sem conversão", count: counts.no_conversion },
  ];

  const maxAnalyses = allRows.reduce((m, r) => (r.analyses > m ? r.analyses : m), 0);

  return (
    <section>
      <AdminSectionHeader
        title="Tabela de perfis"
        subtitle={`${allRows.length} perfis no histórico`}
        accent="expense"
        info="Lista completa de perfis analisados (de `social_profiles`) com agregação de relatórios por handle."
      />
      <div className="mb-3.5 flex flex-wrap items-end justify-end gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AdminSearchInput
            ref={searchRef}
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            placeholder="Pesquisar handle ou nome…"
            ariaLabel="Pesquisar perfis"
          />
          <FilterPills
            options={filterOptions}
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setPage(1);
            }}
            ariaLabel="Filtros de perfil"
          />
        </div>
      </div>

      <AdminCard className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[12px]">
            <thead>
              <tr className="text-admin-text-tertiary">
                <Th>Perfil</Th>
                <Th>Rede</Th>
                <Th align="right">Análises</Th>
                <Th align="right">Cache</Th>
                <Th align="right">Reports</Th>
                <Th align="right">Conversão</Th>
                <Th>Última actividade</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-[12px] text-admin-text-tertiary">
                    A carregar…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-[12px] text-admin-text-tertiary">
                    {debouncedQuery
                      ? `Sem resultados para «${debouncedQuery}».`
                      : "Sem perfis para este filtro."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <ProfileRowView key={row.handle} row={row} maxAnalyses={maxAnalyses} />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-admin-border px-6 py-3.5">
          <p className="m-0 text-[12px] text-admin-text-tertiary">
            A mostrar {rows.length} de {filtered.length} · página {safePage}/{totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <AdminActionButton
              size="sm"
              aria-label="Página anterior"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              <ChevronLeft size={14} strokeWidth={1.75} />
            </AdminActionButton>
            <AdminActionButton
              size="sm"
              aria-label="Página seguinte"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              <ChevronRight size={14} strokeWidth={1.75} />
            </AdminActionButton>
          </div>
        </div>
      </AdminCard>
    </section>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`admin-eyebrow px-6 py-3 font-normal ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function ProfileRowView({ row, maxAnalyses }: { row: ProfileRow; maxAnalyses: number }) {
  const initial = row.handle.charAt(0).toUpperCase();
  const analysesPct = maxAnalyses > 0 ? Math.round((row.analyses / maxAnalyses) * 100) : 0;
  const conv = row.conversion_pct;
  const convCls =
    conv > 30
      ? "text-admin-revenue-700"
      : conv >= 15
        ? "text-admin-expense-700"
        : "text-admin-danger-500";

  return (
    <tr className="border-t border-admin-border transition-colors hover:bg-[var(--color-admin-surface-muted)]">
      <td className="px-6 py-3.5 align-middle">
        <div className="flex items-center gap-3">
          <AdminAvatar
            initials={initial}
            variant="signal"
            size={32}
            ariaLabel={row.handle}
            seed={row.handle}
          />
          <div className="min-w-0">
            <p className="m-0 truncate text-[13px] text-admin-text-primary">
              @{row.handle}
            </p>
            {row.display_name ? (
              <p className="m-0 text-[12px] text-admin-text-secondary">
                {row.display_name}
              </p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-6 py-3.5 align-middle">
        <AdminBadge variant="info">{row.network}</AdminBadge>
      </td>
      <td className="px-6 py-3.5 text-right align-middle">
        <div className="flex items-center justify-end gap-2">
          <span className="admin-code tabular-nums text-admin-text-primary">
            {row.analyses}
          </span>
          <span
            aria-hidden="true"
            className="block h-1 w-16 rounded-full"
            style={{ backgroundColor: ADMIN_LITERAL.profileFunnelBase }}
          >
            <span
              className="block h-1 rounded-full"
              style={{
                width: `${analysesPct}%`,
                backgroundColor: ADMIN_LITERAL.profileBarAnalyses,
              }}
            />
          </span>
        </div>
      </td>
      <td className="px-6 py-3.5 text-right align-middle admin-code tabular-nums text-admin-text-tertiary">
        {row.analyses_cache}
      </td>
      <td
        className={`px-6 py-3.5 text-right align-middle admin-code tabular-nums ${
          row.reports > 0 ? "" : "text-admin-text-tertiary"
        }`}
        style={row.reports > 0 ? { color: ADMIN_LITERAL.profileBarReports } : undefined}
      >
        {row.reports}
      </td>
      <td
        className={`px-6 py-3.5 text-right align-middle admin-code tabular-nums ${
          row.reports === 0 ? "text-admin-text-tertiary" : convCls
        }`}
      >
        {row.reports === 0 ? "—" : `${conv.toFixed(1)}%`}
      </td>
      <td className="px-6 py-3.5 align-middle text-[12px] text-admin-text-secondary">
        {formatRelative(row.last_analyzed_at)}
      </td>
    </tr>
  );
}