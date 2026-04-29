/**
 * Secção 3 — Volume e timing diário.
 *
 * Dois cartões lado a lado, cada um envolvendo um gráfico Recharts:
 *   1. BarChart empilhado: entregues / falhados / em fila (30d)
 *   2. LineChart: tempo médio de entrega (30d) com ReferenceLine SLA 5min
 *
 * Tooltips dos gráficos usam o mesmo padrão "dark cinematográfico" do
 * waterfall (bg #1F1E1B, texto #FAF9F5, mono).
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

import { DemoOnlySection } from "../demo-only-section";
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

const DARK_TOOLTIP_STYLE: React.CSSProperties = {
  background: "#1F1E1B",
  color: "#FAF9F5",
  fontFamily: "JetBrains Mono, monospace",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
};

export function ChartsSection() {
  const volumeData = MOCK_DAILY_VOLUME.map((d) => ({ ...d }));
  const timingData = MOCK_DAILY_TIMING.map((d) => ({ ...d }));

  return (
    <DemoOnlySection
      title="Volume e timing diário"
      subtitle="distribuição e SLA"
      accent="signal"
      info={"Volume diário de relatórios e tempo médio de entrega. Picos no tempo indicam congestionamento."}
      pendingReason={"Os gráficos de volume diário e SLA serão gerados a partir de `report_requests` reais. Esperam a primeira geração de relatórios pagos para terem dados significativos."}
    >
      <section>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Volume diário (empilhado) */}
        <AdminCard>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="m-0 text-[15px] font-medium text-admin-text-primary">
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
                  cursor={{ fill: "rgba(31, 30, 27, 0.04)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const labels: Record<string, string> = {
                      delivered: "Entregues",
                      failed: "Falhados",
                      queued: "Em fila",
                    };
                    return (
                      <div
                        className="rounded-lg px-3.5 py-2.5 text-[11px]"
                        style={DARK_TOOLTIP_STYLE}
                      >
                        <p className="m-0 mb-1 opacity-70">Dia {label}</p>
                        {payload.map((p) => (
                          <p
                            key={String(p.dataKey)}
                            className="m-0 leading-snug"
                          >
                            {labels[String(p.dataKey)] ?? String(p.dataKey)}:{" "}
                            {String(p.value)}
                          </p>
                        ))}
                      </div>
                    );
                  }}
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
        </AdminCard>

        {/* Tempo médio · diário */}
        <AdminCard>
          <div className="mb-3">
            <p className="m-0 text-[15px] font-medium text-admin-text-primary">
              Tempo médio · diário
            </p>
            <p className="mt-0.5 text-[11px] text-admin-text-tertiary">
              Pedido → email entregue · linha tracejada cinza = SLA{" "}
              {Math.round(REPORT_SLA_SECONDS / 60)} min
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
                  cursor={{ stroke: "rgba(136,135,128,0.25)", strokeWidth: 1 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const v = payload[0]?.value;
                    const seconds = typeof v === "number" ? v : Number(v);
                    return (
                      <div
                        className="rounded-lg px-3.5 py-2.5 text-[11px]"
                        style={DARK_TOOLTIP_STYLE}
                      >
                        <p className="m-0 mb-1 opacity-70">Dia {label}</p>
                        <p className="m-0 leading-snug">
                          Tempo médio: {formatSeconds(seconds)}
                        </p>
                      </div>
                    );
                  }}
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
        </AdminCard>
      </div>
    </section>
    </DemoOnlySection>
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
