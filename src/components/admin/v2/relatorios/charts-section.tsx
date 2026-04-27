/**
 * Secção 3 — Volume e timing diário.
 *
 * Cartão único com 2 gráficos lado a lado:
 *   1. BarChart empilhado: entregues / falhados / em fila (30d)
 *   2. LineChart: tempo médio de entrega (30d) com ReferenceLine SLA 5min
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminSectionHeader } from "../admin-section-header";
import { AdminCard } from "../admin-card";
import { ADMIN_LITERAL } from "../admin-tokens";
import {
  MOCK_DAILY_TIMING,
  MOCK_DAILY_VOLUME,
  REPORT_SLA_SECONDS,
} from "@/lib/admin/mock-data";

function formatSeconds(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.round(s % 60);
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

const VOLUME_COLORS = {
  delivered: ADMIN_LITERAL.chartDelivered,
  failed: ADMIN_LITERAL.chartFailed,
  queued: ADMIN_LITERAL.chartQueued,
};

export function ChartsSection() {
  const volumeData = MOCK_DAILY_VOLUME.map((d) => ({ ...d }));
  const timingData = MOCK_DAILY_TIMING.map((d) => ({ ...d }));

  return (
    <section>
      <AdminSectionHeader
        title="Volume e timing diário"
        subtitle="distribuição e SLA"
        accent="signal"
      />

      <AdminCard>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Volume diário (empilhado) */}
          <div>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="m-0 text-sm font-medium text-admin-text-primary">
                  Volume diário
                </p>
                <p className="mt-0.5 text-[11px] text-admin-text-tertiary">
                  Relatórios entregues, falhados e em fila · últimos 30 dias
                </p>
              </div>
              <Legend
                items={[
                  { color: VOLUME_COLORS.delivered, label: "Entregues" },
                  { color: VOLUME_COLORS.failed, label: "Falhados" },
                  { color: VOLUME_COLORS.queued, label: "Em fila" },
                ]}
              />
            </div>

            <div
              role="img"
              aria-label="Volume diário de relatórios entregues, falhados e em fila nos últimos 30 dias."
              className="relative h-44 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={volumeData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="rgba(136,135,128,0.18)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "rgb(var(--admin-neutral-400))" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(136,135,128,0.2)" }}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "rgb(var(--admin-neutral-400))" }}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(136,135,128,0.06)" }}
                    contentStyle={{
                      border: "1px solid rgb(44 44 42 / 0.14)",
                      borderRadius: 8,
                      fontSize: 11,
                      padding: "6px 10px",
                      boxShadow: "none",
                    }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        delivered: "Entregues",
                        failed: "Falhados",
                        queued: "Em fila",
                      };
                      return [String(value), labels[name] ?? name];
                    }}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Bar dataKey="delivered" stackId="v" fill={VOLUME_COLORS.delivered} />
                  <Bar dataKey="failed" stackId="v" fill={VOLUME_COLORS.failed} />
                  <Bar
                    dataKey="queued"
                    stackId="v"
                    fill={VOLUME_COLORS.queued}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tempo médio · diário */}
          <div>
            <div className="mb-3">
              <p className="m-0 text-sm font-medium text-admin-text-primary">
                Tempo médio · diário
              </p>
              <p className="mt-0.5 text-[11px] text-admin-text-tertiary">
                Pedido → email entregue · linha tracejada = SLA {Math.round(
                  REPORT_SLA_SECONDS / 60,
                )} min
              </p>
            </div>

            <div
              role="img"
              aria-label={`Tempo médio diário de entrega de relatórios, com linha de SLA em ${Math.round(
                REPORT_SLA_SECONDS / 60,
              )} minutos.`}
              className="relative h-44 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={timingData}
                  margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="rgba(136,135,128,0.18)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "rgb(var(--admin-neutral-400))" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(136,135,128,0.2)" }}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "rgb(var(--admin-neutral-400))" }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v) => formatSeconds(Number(v))}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(136,135,128,0.2)", strokeWidth: 1 }}
                    contentStyle={{
                      border: "1px solid rgb(44 44 42 / 0.14)",
                      borderRadius: 8,
                      fontSize: 11,
                      padding: "6px 10px",
                      boxShadow: "none",
                    }}
                    formatter={(value: number) => [
                      formatSeconds(value),
                      "Tempo médio",
                    ]}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <ReferenceLine
                    y={REPORT_SLA_SECONDS}
                    stroke={ADMIN_LITERAL.slaLine}
                    strokeDasharray="5 4"
                    strokeWidth={1.2}
                    label={{
                      value: `SLA · ${Math.round(REPORT_SLA_SECONDS / 60)}min`,
                      position: "insideTopRight",
                      fill: ADMIN_LITERAL.slaLine,
                      fontSize: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgSeconds"
                    stroke={ADMIN_LITERAL.chartTiming}
                    strokeWidth={1.75}
                    dot={false}
                    activeDot={{ r: 3, fill: ADMIN_LITERAL.chartTiming }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </AdminCard>
    </section>
  );
}

function Legend({
  items,
}: {
  items: ReadonlyArray<{ color: string; label: string }>;
}) {
  return (
    <ul className="m-0 flex flex-wrap items-center gap-3 p-0">
      {items.map((it) => (
        <li
          key={it.label}
          className="inline-flex items-center gap-1.5 text-[11px] text-admin-text-secondary"
        >
          <span
            aria-hidden="true"
            className="block h-2 w-2 rounded-sm"
            style={{ backgroundColor: it.color }}
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}