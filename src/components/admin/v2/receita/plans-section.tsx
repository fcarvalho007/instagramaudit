/**
 * Receita · Secção 3 — MRR por plano.
 *
 * Esquerda: distribuição (3 barras horizontais por plano + totais).
 * Direita: concentração (3 escalões com quadrado + texto + percentagem).
 */

import { AdminSectionHeader } from "../admin-section-header";
import { AdminCard } from "../admin-card";
import { ProgressBar } from "../progress-bar";
import { ACCENT_500 } from "../admin-tokens";
import {
  MOCK_CONCENTRATION,
  MOCK_PLAN_DISTRIBUTION,
  MOCK_PLAN_TOTALS,
} from "@/lib/admin/mock-data";

export function PlansSection() {
  return (
    <section>
      <AdminSectionHeader title="MRR por plano" accent="revenue" />

      <div className="grid gap-3.5 lg:grid-cols-[1.4fr_1fr]">
        {/* — Distribuição — */}
        <AdminCard>
          <h3 className="m-0 text-sm font-medium text-admin-text-primary">
            Distribuição
          </h3>

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
          <h3 className="m-0 text-sm font-medium text-admin-text-primary">
            Concentração
          </h3>
          <p className="mt-1 text-[11px] text-admin-text-tertiary">
            Receita por escalão de cliente
          </p>

          <ul className="mt-4 space-y-3">
            {MOCK_CONCENTRATION.map((tier) => (
              <li key={tier.title} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg font-mono text-[14px] font-medium"
                  style={{ backgroundColor: tier.bg, color: tier.fg }}
                >
                  {tier.label}
                </span>
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
  );
}