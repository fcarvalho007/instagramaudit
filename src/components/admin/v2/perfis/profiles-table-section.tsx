/**
 * Tab Perfis · Secção 4 — Tabela completa de perfis.
 *
 * Header com `AdminSectionHeader` + filtros pill (Todos / Com reports /
 * Repetidos / Sem conversão) + tabela 8 colunas + rodapé com paginação mock.
 *
 * Conversão semaforizada:
 *   > 30% → verde
 *   15-30% → âmbar
 *   < 15% → vermelho
 */

import { useMemo, useRef, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Send,
} from "lucide-react";

import { DemoOnlySection } from "../demo-only-section";
import { AdminCard } from "../admin-card";
import { AdminBadge } from "../admin-badge";
import { AdminAvatar } from "../admin-avatar";
import { AdminActionButton } from "../admin-action-button";
import { FilterPills, type FilterOption } from "../filter-pills";
import { AdminSearchInput, type AdminSearchInputHandle } from "../admin-search-input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCmdK } from "@/hooks/use-cmd-k";
import { ADMIN_LITERAL } from "../admin-tokens";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MOCK_PROFILES_COUNTS,
  MOCK_PROFILES_LIST,
  PROFILE_CATEGORY_META,
  type MockProfileRow,
} from "@/lib/admin/mock-data";

type ProfileFilter = "all" | "with_reports" | "repeated" | "no_conversion";

function matchesFilter(filter: ProfileFilter, row: MockProfileRow): boolean {
  if (filter === "all") return true;
  if (filter === "with_reports") return row.reports > 0;
  if (filter === "no_conversion") return row.reports === 0;
  // "repeated" — sinal mockado: análises >= 18 (proxy)
  return row.analyses >= 18;
}

const MAX_ANALYSES = MOCK_PROFILES_LIST.reduce(
  (m, r) => (r.analyses > m ? r.analyses : m),
  0,
);

export function ProfilesTableSection() {
  const [filter, setFilter] = useState<ProfileFilter>("all");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 200);
  const searchRef = useRef<AdminSearchInputHandle>(null);
  useCmdK(() => searchRef.current?.focus());

  const counts = MOCK_PROFILES_COUNTS;
  const filterCounts: Record<ProfileFilter, number> = {
    all: counts.all,
    with_reports: counts.withReports,
    repeated: counts.repeated,
    no_conversion: counts.noConversion,
  };

  const rows = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return MOCK_PROFILES_LIST.filter((r) => {
      if (!matchesFilter(filter, r)) return false;
      if (!q) return true;
      return (
        r.handle.toLowerCase().includes(q) ||
        r.sub.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });
  }, [filter, debouncedQuery]);

  const filterOptions: ReadonlyArray<FilterOption<ProfileFilter>> = [
    { value: "all", label: "Todos", count: filterCounts.all },
    { value: "with_reports", label: "Com reports", count: filterCounts.with_reports },
    { value: "repeated", label: "Repetidos", count: filterCounts.repeated },
    { value: "no_conversion", label: "Sem conversão", count: filterCounts.no_conversion },
  ];

  return (
    <DemoOnlySection
      title="Tabela de perfis"
      subtitle="284 perfis · 30 dias"
      accent="expense"
      info={"Lista completa de perfis Instagram analisados. Usa os filtros para isolar perfis que já converteram, repetidos sem report ou outros segmentos."}
      pendingReason={"Tabela detalhada de perfis com filtros e ordenação será ligada a `social_profiles`. Entretanto, a tab Sistema mostra perfis analisados via logs reais."}
    >
      <section>
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
        <div className="-mb-3.5">
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminSearchInput
            ref={searchRef}
            value={query}
            onChange={setQuery}
            placeholder="Pesquisar perfil ou categoria…"
            ariaLabel="Pesquisar perfis"
          />
          <FilterPills
            options={filterOptions}
            value={filter}
            onChange={setFilter}
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
                <Th>Tipo</Th>
                <Th>Análises</Th>
                <Th align="right">Reports</Th>
                <Th align="right">Conversão</Th>
                <Th align="right">Receita</Th>
                <Th>Última actividade</Th>
                <Th align="right">Acções</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ProfileRow key={row.handle} row={row} />
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-[12px] text-admin-text-tertiary"
                  >
                    {debouncedQuery
                      ? `Sem resultados para «${debouncedQuery}».`
                      : "Sem perfis para este filtro."}
                    {debouncedQuery ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          onClick={() => setQuery("")}
                          className="underline underline-offset-2 hover:text-admin-text-primary"
                        >
                          Limpar pesquisa
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-admin-border px-6 py-3.5">
          <p className="m-0 text-[11px] text-admin-text-tertiary">
            A mostrar {rows.length} de {counts.all} · ordenado por análises
          </p>
          <div className="flex items-center gap-1.5">
            <AdminActionButton size="sm" aria-label="Página anterior">
              <ChevronLeft size={14} strokeWidth={1.75} />
            </AdminActionButton>
            <AdminActionButton size="sm" aria-label="Página seguinte">
              <ChevronRight size={14} strokeWidth={1.75} />
            </AdminActionButton>
          </div>
        </div>
      </AdminCard>
    </section>
    </DemoOnlySection>
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

function ProfileRow({ row }: { row: MockProfileRow }) {
  const meta = PROFILE_CATEGORY_META[row.category];
  const initial = row.handle.replace("@", "").charAt(0).toUpperCase();
  const analysesPct = Math.round((row.analyses / MAX_ANALYSES) * 100);

  // Semáforo da conversão.
  const conv = row.conversionPct;
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
            variant={meta.avatar}
            size={32}
            ariaLabel={row.handle}
          />
          <div className="min-w-0">
            <p className="m-0 truncate text-[13px] text-admin-text-primary">
              {row.handle}
            </p>
            <p className="m-0 text-[11px] text-admin-text-secondary">
              {row.sub}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-3.5 align-middle">
        <AdminBadge variant={meta.badge}>{meta.label}</AdminBadge>
      </td>
      <td className="px-6 py-3.5 align-middle">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] tabular-nums text-admin-text-primary">
            {row.analyses}
          </span>
          <span
            aria-hidden="true"
            className="block h-1 w-16 rounded-full"
            style={{
              backgroundColor: ADMIN_LITERAL.profileFunnelBase,
            }}
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
      <td
        className={`px-6 py-3.5 text-right align-middle font-mono text-[12px] tabular-nums ${
          row.reports > 0
            ? ""
            : "text-admin-text-tertiary"
        }`}
        style={
          row.reports > 0
            ? { color: ADMIN_LITERAL.profileBarReports }
            : undefined
        }
      >
        {row.reports}
      </td>
      <td
        className={`px-6 py-3.5 text-right align-middle font-mono text-[12px] tabular-nums ${
          row.reports === 0 ? "text-admin-text-tertiary" : convCls
        }`}
      >
        {row.reports === 0 ? "—" : `${row.conversionPct.toFixed(1)}%`}
      </td>
      <td className="px-6 py-3.5 text-right align-middle font-mono text-[12px] tabular-nums text-admin-text-primary">
        {row.revenue ?? "—"}
      </td>
      <td className="px-6 py-3.5 align-middle text-[12px] text-admin-text-secondary">
        {row.lastActivity}
      </td>
      <td className="px-6 py-3.5 align-middle">
        <ProfileActions hasReports={row.reports > 0} handle={row.handle} />
      </td>
    </tr>
  );
}

function ProfileActions({
  hasReports,
  handle,
}: {
  hasReports: boolean;
  handle: string;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center justify-end gap-2 text-admin-text-tertiary">
        <ActionIcon
          label="Ver detalhes do perfil"
          icon={<BarChart3 size={16} strokeWidth={1.75} />}
        />
        {hasReports ? (
          <ActionIcon
            label="Enviar para utilizadores recorrentes"
            icon={<Send size={16} strokeWidth={1.75} />}
          />
        ) : null}
        <ActionIcon
          label={`Abrir ${handle} no Instagram`}
          icon={<ExternalLink size={16} strokeWidth={1.75} />}
        />
      </div>
    </TooltipProvider>
  );
}

function ActionIcon({
  label,
  icon,
}: {
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--color-admin-surface-muted)] hover:text-admin-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-revenue-500"
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="bg-admin-neutral-900 text-[11px] text-white"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}