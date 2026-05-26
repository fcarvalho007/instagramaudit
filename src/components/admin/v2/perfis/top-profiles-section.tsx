/**
 * Tab Perfis · Secção 2 — Top perfis.
 *
 * Ranking simples por análises totais lido de `/api/admin/profiles/list`.
 * Sem categorias editoriais (não existem em DB).
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
        info="Perfis ordenados por análises totais em `social_profiles`. Barra cinza = volume de análises, fill coral = reports gerados."
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
              const reportsFillPct = p.analyses > 0
                ? Math.round((p.reports / p.analyses) * 100)
                : 0;
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

const TOTAL_PROFILES = MOCK_PROFILES_BY_CATEGORY.reduce(
  (acc, c) => acc + c.count,
  0,
);

/** Máximo de análises usado como denominador comum das barras horizontais. */
const MAX_ANALYSES = MOCK_TOP_PROFILES.reduce(
  (max, p) => (p.analyses > max ? p.analyses : max),
  0,
);

export function TopProfilesSection() {
  return (
    <DemoOnlySection
      title="Top perfis"
      subtitle="ranking por volume"
      accent="signal"
      info={"Perfis com maior volume de análises e relatórios. As barras horizontais comparam volume de pesquisa (cinza) com relatórios pagos gerados (coral)."}
      pendingReason={"Ranking de perfis mais analisados será ligado a `social_profiles.analyses_total`. Requer pequena agregação adicional (próxima iteração)."}
    >
      <section>
      <AdminCard className="!p-7">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[2fr_1fr]">
          <RankingColumn />
          <CategoryColumn />
        </div>
      </AdminCard>
    </section>
    </DemoOnlySection>
  );
}

function RankingColumn() {
  return (
    <div>
      <header className="mb-4">
        <h3 className="m-0 text-[16px] font-medium text-admin-text-primary">
          Volume vs reports pagos
        </h3>
        <p className="mt-1 text-[12px] text-admin-text-tertiary">
          Top 10 perfis · barra cinza = análises totais, fill coral = reports pagos
        </p>
      </header>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {MOCK_TOP_PROFILES.map((p) => (
          <li key={p.handle}>
            <RankingRow profile={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RankingRow({ profile }: { profile: MockTopProfile }) {
  const initial = profile.handle.replace("@", "").charAt(0).toUpperCase();
  const meta = PROFILE_CATEGORY_META[profile.category];
  const analysesPct = Math.round((profile.analyses / MAX_ANALYSES) * 100);
  // Reports renderizam como fill DENTRO da barra de análises (mesmo eixo).
  const reportsFillPct =
    profile.analyses > 0
      ? Math.round((profile.reports / profile.analyses) * 100)
      : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-6 shrink-0 text-right admin-code tabular-nums tracking-[0.04em] text-admin-text-tertiary">
        {String(profile.rank).padStart(2, "0")}
      </span>
      <AdminAvatar
        initials={initial}
        variant={meta.avatar}
        size={32}
        ariaLabel={profile.handle}
        seed={profile.handle}
      />
      <div className="min-w-0 flex-1">
        <p className="m-0 flex items-baseline gap-2 truncate">
          <span className="text-[13px] font-medium text-admin-text-primary">
            {profile.handle}
          </span>
          <span className="text-[12px] text-admin-text-tertiary">
            {meta.label} · {profile.sub}
          </span>
        </p>
        {/*
         * Barra única "stacked": track cinza com largura proporcional às
         * análises e fill coral interno proporcional aos reports / análises.
         * Lê-se como "deste volume, isto converteu".
         */}
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full"
          style={{
            width: `${analysesPct}%`,
            backgroundColor: ADMIN_LITERAL.profileBarAnalyses,
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
          {profile.analyses} análises
        </p>
        <p
          className="m-0 admin-code"
          style={{ color: ADMIN_LITERAL.profileBarReports }}
        >
          {profile.reports} reports
        </p>
      </div>
    </div>
  );
}

function CategoryColumn() {
  return (
    <div>
      <header className="mb-4">
        <h3 className="m-0 text-[16px] font-medium text-admin-text-primary">
          Por categoria
        </h3>
        <p className="mt-1 text-[12px] text-admin-text-tertiary">
          Distribuição de perfis analisados
        </p>
      </header>

      <div className="relative mb-5 h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[...MOCK_PROFILES_BY_CATEGORY]}
              dataKey="count"
              nameKey="category"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              cornerRadius={3}
              stroke="rgb(var(--admin-surface-rgb))"
              strokeWidth={1.5}
            >
              {MOCK_PROFILES_BY_CATEGORY.map((entry) => (
                <Cell key={entry.category} fill={entry.color} />
              ))}
            </Pie>
            <RTooltip
              cursor={false}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid rgb(var(--admin-border-rgb) / 0.16)",
                background: "rgb(var(--admin-surface-rgb))",
                fontSize: 12,
                color: "rgb(var(--admin-text-primary-rgb))",
              }}
              formatter={(value: number, _name, item) => [
                `${value} perfis`,
                item?.payload?.category ?? "",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono font-medium tabular-nums text-admin-text-primary"
            style={{ fontSize: "1.875rem", lineHeight: 1, letterSpacing: "-0.02em" }}
          >
            {TOTAL_PROFILES}
          </span>
          <span className="mt-1 text-[12px] uppercase tracking-[0.08em] text-admin-text-tertiary">
            perfis
          </span>
        </div>
      </div>

      <ul className="m-0 flex list-none flex-col gap-2 border-t border-admin-border p-0 pt-4">
        {MOCK_PROFILES_BY_CATEGORY.map((c) => (
          <li
            key={c.category}
            className="flex items-center gap-3"
          >
            <span
              aria-hidden="true"
              className="block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: c.color }}
            />
            <span className="flex-1 text-[12px] text-admin-text-primary">
              {c.category}
            </span>
            <span className="w-10 text-right admin-code tabular-nums text-admin-text-primary">
              {c.pct}%
            </span>
            <span className="w-10 text-right admin-code tabular-nums text-admin-text-tertiary">
              {c.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}