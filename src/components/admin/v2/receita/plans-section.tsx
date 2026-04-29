/**
 * Receita · Secção 3 — MRR por plano.
 *
 * Esquerda: distribuição (3 barras horizontais por plano + totais).
 * Direita: concentração (3 escalões com quadrado + texto + percentagem).
 */

import { DemoOnlySection } from "../demo-only-section";
import { AdminCard } from "../admin-card";
import { AdminInfoTooltip } from "../admin-info-tooltip";
import { ProgressBar } from "../progress-bar";
import { ACCENT_500 } from "../admin-tokens";
import {
  MOCK_CONCENTRATION,
  MOCK_PLAN_DISTRIBUTION,
  MOCK_PLAN_TOTALS,
} from "@/lib/admin/mock-data";

/**
 * Mini-donut SVG (56×56) que representa proporcionalmente a percentagem
 * de receita concentrada num escalão. Label central em mono.
 */
function MiniDonut({
  pct,
  color,
  label,
}: {
  pct: number;
  color: string;
  label: string;
}) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: 56, height: 56 }}
    >
      <svg width={56} height={56} viewBox="0 0 56 56">
        <circle
          cx={28}
          cy={28}
          r={radius}
          fill="none"
          stroke="#F0EFEA"
          strokeWidth={5}
        />
        <circle
          cx={28}
          cy={28}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 28 28)"
        />
      </svg>
      <span
        className="absolute font-mono text-[11px] font-medium"
        style={{ color }}
      >
        {label}
      </span>
    </span>
  );
}

/** Cores por ordem dos tiers em MOCK_CONCENTRATION (Top 10% / Top 25% / Bottom 50%). */
const TIER_DONUT_COLORS = ["#04342C", "#1D9E75", "#97C459"];

/** Extrai a percentagem (0–100) do label do tier (ex.: "10%" → 10). Fallback para 0. */
function tierPct(label: string): number {
  const m = label.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

export function PlansSection() {
  return (
    <DemoOnlySection
      title="MRR por plano"
      accent="revenue"
      info={"Distribuição da receita recorrente pelos diferentes planos disponíveis."}
      pendingReason={"Distribuição por plano requer subscrições activas. Esperar pela integração de pagamentos."}
    >
      <section>
      <div className="grid gap-3.5 lg:grid-cols-[1.4fr_1fr]">
        {/* — Distribuição — */}
        <AdminCard>
          <div className="flex items-center gap-2">
            <h3 className="m-0 text-[15px] font-medium text-admin-text-primary">
              Distribuição
            </h3>
            <AdminInfoTooltip label="Repartição do MRR pelos três planos: Starter, Pro e Agency. Mostra o peso real de cada plano na receita recorrente." />
          </div>

          <ul className="mt-4 space-y-3.5">
            {MOCK_PLAN_DISTRIBUTION.map((plan) => {
              // Plano "dark" (Agency) usa o tom 800 do esmeralda.
              const fillStyle = plan.dark
                ? { color: undefined }
                : { color: undefined };
              const accentColor = plan.dark
                ? "rgb(var(--admin-revenue-800))"
                : ACCENT_500[plan.accent];
              return (
                <li key={plan.name} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                      <span
                        aria-hidden="true"
                        className="block h-2 w-2 rounded-full"
                        style={{ backgroundColor: accentColor }}
                      />
                      <span className="text-[13px] font-medium text-admin-text-primary">
                        {plan.name}
                      </span>
                      <span className="text-[11px] text-admin-text-tertiary">
                        {plan.price}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[13px] font-medium text-admin-text-primary">
                        €{plan.mrr}
                      </span>
                      <span className="ml-2 text-[11px] text-admin-text-tertiary">
                        {plan.subs} subs · {plan.pct}%
                      </span>
                    </div>
                  </div>
                  {/* Barra horizontal: usa accent normal; para Agency aplicamos override visual. */}
                  {plan.dark ? (
                    <div
                      role="progressbar"
                      aria-valuenow={plan.pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="relative h-2 rounded"
                      style={{
                        backgroundColor:
                          "color-mix(in oklab, rgb(var(--admin-revenue-800)) 12%, transparent)",
                      }}
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded"
                        style={{
                          width: `${plan.pct}%`,
                          backgroundColor: "rgb(var(--admin-revenue-800))",
                        }}
                      />
                    </div>
                  ) : (
                    <ProgressBar
                      value={plan.pct}
                      max={100}
                      color={plan.accent}
                    />
                  )}
                  <span className="sr-only" {...fillStyle} />
                </li>
              );
            })}
          </ul>

          <div
            className="mt-5 flex items-end justify-between gap-4 border-t border-admin-border pt-4"
          >
            <div>
              <p className="admin-eyebrow">Total MRR</p>
              <p className="mt-1 font-mono text-[20px] font-medium text-admin-text-primary leading-none">
                {MOCK_PLAN_TOTALS.mrr}
              </p>
            </div>
            <div className="text-right">
              <p className="admin-eyebrow">Subscritores</p>
              <p className="mt-1 font-mono text-[20px] font-medium text-admin-text-primary leading-none">
                {MOCK_PLAN_TOTALS.subs}
              </p>
            </div>
          </div>
        </AdminCard>

        {/* — Concentração — */}
        <AdminCard>
          <div className="flex items-center gap-2">
            <h3 className="m-0 text-[15px] font-medium text-admin-text-primary">
              Concentração
            </h3>
            <AdminInfoTooltip label="Concentração de receita em escalões de clientes. Permite identificar dependência de poucos clientes grandes." />
          </div>
          <p className="mt-1 text-[11px] text-admin-text-tertiary">
            Receita por escalão de cliente
          </p>

          <ul className="mt-4 space-y-3">
            {MOCK_CONCENTRATION.map((tier, idx) => (
              <li key={tier.title} className="flex items-center gap-3">
                <MiniDonut
                  pct={tierPct(tier.label)}
                  color={TIER_DONUT_COLORS[idx] ?? TIER_DONUT_COLORS[0]}
                  label={tier.label}
                />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[13px] font-medium text-admin-text-primary">
                    {tier.title}
                  </p>
                  <p className="m-0 text-[11px] text-admin-text-tertiary">
                    {tier.sub}
                  </p>
                </div>
                <span className="font-mono text-[14px] font-medium text-admin-text-primary">
                  {tier.revenue}
                </span>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>
    </section>
    </DemoOnlySection>
  );
}