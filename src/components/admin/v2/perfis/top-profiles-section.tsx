/**
 * Tab Perfis · Secção 2 — Top perfis.
 *
 * Cartão único com 2 colunas:
 *   - Esquerda: ranking top 10 perfis com avatar, barras horizontais duplas
 *     (cinza = análises, coral = reports proporcionais ao mesmo eixo).
 *   - Direita: donut Recharts com distribuição de 284 perfis por categoria.
 */

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from "recharts";

import { DemoOnlySection } from "../demo-only-section";
import { AdminCard } from "../admin-card";
import { AdminAvatar } from "../admin-avatar";
import { ADMIN_LITERAL } from "../admin-tokens";
import {
  MOCK_PROFILES_BY_CATEGORY,
  MOCK_TOP_PROFILES,
  PROFILE_CATEGORY_META,
  type MockTopProfile,
} from "@/lib/admin/mock-data";

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
      <span className="w-6 shrink-0 text-right font-mono text-[11px] tabular-nums tracking-[0.04em] text-admin-text-tertiary">
        {String(profile.rank).padStart(2, "0")}
      </span>
      <AdminAvatar
        initials={initial}
        variant={meta.avatar}
        size={32}
        ariaLabel={profile.handle}
      />
      <div className="min-w-0 flex-1">
        <p className="m-0 flex items-baseline gap-2 truncate">
          <span className="text-[13px] font-medium text-admin-text-primary">
            {profile.handle}
          </span>
          <span className="text-[11px] text-admin-text-tertiary">
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
        <p className="m-0 font-mono text-[12px] text-admin-text-primary">
          {profile.analyses} análises
        </p>
        <p
          className="m-0 font-mono text-[12px]"
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
          <span className="mt-1 text-[10px] uppercase tracking-[0.08em] text-admin-text-tertiary">
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
            <span className="w-10 text-right font-mono text-[12px] tabular-nums text-admin-text-primary">
              {c.pct}%
            </span>
            <span className="w-10 text-right font-mono text-[11px] tabular-nums text-admin-text-tertiary">
              {c.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}