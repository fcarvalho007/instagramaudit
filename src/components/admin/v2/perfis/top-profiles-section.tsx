/**
 * Tab Perfis · Secção 2 — Top perfis.
 *
 * Ranking simples por análises totais lido de `/api/admin/profiles/list`.
 */

import { useQuery } from "@tanstack/react-query";
import { AdminCard } from "../admin-card";
import { AdminAvatar } from "../admin-avatar";
import { AdminSectionHeader } from "../admin-section-header";
import { ADMIN_LITERAL } from "../admin-tokens";
import { adminFetch } from "@/lib/admin/fetch";

interface ProfileRow {
  handle: string;
  network: string;
  analyses: number;
  reports: number;
}

interface ListApi {
  success: boolean;
  rows: ProfileRow[];
}

export function TopProfilesSection() {
  const { data, isLoading } = useQuery<ListApi>({
    queryKey: ["admin", "profiles", "top"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/profiles/list");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  const top = (data?.rows ?? []).slice(0, 10);
  const maxAnalyses = top.reduce((m, p) => (p.analyses > m ? p.analyses : m), 0);

  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader
        title="Top perfis"
        subtitle="ranking por análises totais"
        accent="signal"
        info="Perfis ordenados por análises totais em `social_profiles`."
      />
      <AdminCard className="!p-7">
        {isLoading ? (
          <p className="text-[12px] text-admin-text-tertiary">A carregar…</p>
        ) : top.length === 0 ? (
          <p className="text-[12px] text-admin-text-tertiary">
            Ainda não existem perfis analisados.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {top.map((p, i) => {
              const initial = p.handle.charAt(0).toUpperCase();
              const pct = maxAnalyses > 0 ? Math.round((p.analyses / maxAnalyses) * 100) : 0;
              const reportsFillPct =
                p.analyses > 0 ? Math.round((p.reports / p.analyses) * 100) : 0;
              return (
                <li key={p.handle} className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-right admin-code tabular-nums tracking-[0.04em] text-admin-text-tertiary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <AdminAvatar
                    initials={initial}
                    variant="signal"
                    size={32}
                    ariaLabel={p.handle}
                    seed={p.handle}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 flex items-baseline gap-2 truncate">
                      <span className="text-[13px] font-medium text-admin-text-primary">
                        @{p.handle}
                      </span>
                      <span className="text-[12px] text-admin-text-tertiary">
                        {p.network}
                      </span>
                    </p>
                    <div
                      className="mt-2 h-1.5 overflow-hidden rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: ADMIN_LITERAL.profileBarAnalyses,
                        minWidth: 8,
                      }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${reportsFillPct}%`,
                          backgroundColor: ADMIN_LITERAL.profileBarReports,
                        }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="m-0 admin-code text-admin-text-primary">
                      {p.analyses} análises
                    </p>
                    <p
                      className="m-0 admin-code"
                      style={{ color: ADMIN_LITERAL.profileBarReports }}
                    >
                      {p.reports} reports
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>
    </section>
  );
}