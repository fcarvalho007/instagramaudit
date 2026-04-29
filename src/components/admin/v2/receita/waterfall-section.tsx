/**
 * Receita · Secção 2 — Anatomia do MRR (waterfall).
 *
 * Truque do "floating bar" em Recharts:
 *   - `base` (transparente) empurra a barra para o offset correcto.
 *   - `delta` (colorida) representa a variação visível.
 * Para barras âncora ("MRR inicial" / "MRR final"): base=0, delta=valor.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DemoOnlySection } from "../demo-only-section";
import { AdminCard } from "../admin-card";
import {
  MOCK_MRR_WATERFALL,
  MOCK_MRR_WATERFALL_DETAIL,
} from "@/lib/admin/mock-data";

const COLOR_TOTAL = "rgb(var(--admin-neutral-600))";
const COLOR_POSITIVE = "rgb(var(--admin-revenue-500))";
const COLOR_NEGATIVE = "rgb(var(--admin-danger-500))";

function colorFor(type: "total" | "positive" | "negative"): string {
  if (type === "total") return COLOR_TOTAL;
  return type === "positive" ? COLOR_POSITIVE : COLOR_NEGATIVE;
}

/** Constrói as séries `base` e `delta` para empilhar em Recharts. */
function buildChartData() {
  let cumulative = 0;
  return MOCK_MRR_WATERFALL.map((item) => {
    if (item.type === "total") {
      cumulative = item.value;
      return {
        label: item.label,
        type: item.type,
        value: item.value,
        base: 0,
        delta: item.value,
        color: colorFor(item.type),
      };
    }
    const start = cumulative;
    cumulative += item.value;
    // Para barras descendentes, queremos base = nível final, delta = |valor|.
    const base = item.value >= 0 ? start : cumulative;
    const delta = Math.abs(item.value);
    return {
      label: item.label,
      type: item.type,
      value: item.value,
      base,
      delta,
      color: colorFor(item.type),
    };
  });
}

const TONE_BG: Record<"neutral" | "positive" | "negative", string> = {
  neutral: "transparent",
  positive: "rgb(var(--admin-revenue-50))",
  negative: "rgb(var(--admin-danger-50))",
};

const TONE_EYEBROW: Record<"neutral" | "positive" | "negative", string> = {
  neutral: "rgb(var(--admin-neutral-600))",
  positive: "rgb(var(--admin-revenue-alt-700))",
  negative: "rgb(var(--admin-danger-700))",
};

const TONE_VALUE: Record<"neutral" | "positive" | "negative", string> = {
  neutral: "rgb(var(--admin-text-primary))",
  positive: "rgb(var(--admin-revenue-alt-900))",
  negative: "rgb(var(--admin-danger-900))",
};

export function WaterfallSection() {
  const data = buildChartData();

  return (
    <DemoOnlySection
      title="Anatomia do MRR"
      subtitle="como €612 se tornaram €684"
      accent="leads"
      info={"Decomposição do crescimento do MRR: novos subscritores, expansões (upgrades), contracções (downgrades) e churn."}
      pendingReason={"O waterfall MRR (new + expansion - contraction - churn) só faz sentido com histórico mensal de subscrições. Disponível após integração de checkout."}
    >
      <section>
      <AdminCard className="!px-7 !py-6">
        <div
          role="img"
          aria-label="Waterfall: MRR evoluiu de €612 para €684 com €144 de novos/expansão e €72 de contracção/churn."
          className="w-full h-[220px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              barCategoryGap="20%"
            >
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="rgba(136,135,128,0.18)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "rgb(var(--admin-neutral-600))" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(136,135,128,0.2)" }}
                interval={0}
              />
              <YAxis
                domain={[0, 800]}
                tick={{
                  fontSize: 10,
                  fill: "#888780",
                  fontFamily: "JetBrains Mono, monospace",
                }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `€${v}`}
                width={44}
              />
              <Tooltip
                cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0]?.payload as (typeof data)[number] | undefined;
                  if (!p) return null;
                  let line: string;
                  if (p.type === "total") {
                    line = `${p.label}: €${p.value}`;
                  } else {
                    const sign = p.value >= 0 ? "+" : "−";
                    line = `${p.label}: ${sign}€${Math.abs(p.value)}`;
                  }
                  return (
                    <div
                      className="rounded-lg px-3.5 py-2.5 text-[11px]"
                      style={{
                        background: "#1F1E1B",
                        color: "#FAF9F5",
                        fontFamily: "JetBrains Mono, monospace",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      }}
                    >
                      {line}
                    </div>
                  );
                }}
              />
              {/* Barra base invisível — empurra `delta` para o offset correcto. */}
              <Bar dataKey="base" stackId="w" fill="transparent" />
              <Bar dataKey="delta" stackId="w" radius={3} barSize={42}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grelha 5 colunas — explicação por baixo do gráfico */}
        <div
          className="mt-[18px] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px overflow-hidden rounded-md bg-admin-border-strong"
        >
          {MOCK_MRR_WATERFALL_DETAIL.map((cell) => (
            <div
              key={cell.label}
              className="px-3.5 py-3"
              style={{ backgroundColor: TONE_BG[cell.tone] || "var(--color-admin-surface)" }}
            >
              <p
                className="admin-eyebrow mb-1.5"
                style={{ color: TONE_EYEBROW[cell.tone] }}
              >
                {cell.label}
              </p>
              <p
                className="font-mono text-[15px] font-medium leading-none"
                style={{ color: TONE_VALUE[cell.tone] }}
              >
                {cell.value}
              </p>
              <p className="mt-1.5 text-[10px] text-admin-text-tertiary">
                {cell.sub}
              </p>
            </div>
          ))}
        </div>
      </AdminCard>
    </section>
    </DemoOnlySection>
  );
}