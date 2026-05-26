/**
 * Secção 3 — Volume e timing diário (dados reais).
 */

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { ADMIN_LITERAL } from "../admin-tokens";
import { adminFetch } from "@/lib/admin/fetch";
import type { AdminPeriod } from "@/components/admin/v2/period-select";

interface DailyApi {
  success: boolean;
  volume: Array<{
    day: string;
    analyses: number;
    with_unlock: number;
    delivered: number;
    failed: number;
  }>;
  timing: Array<{ day: string; avgSeconds: number | null }>;
}

const PERIOD_LABEL: Record<AdminPeriod, string> = {
  "7d": "últimos 7 dias",
  "30d": "últimos 30 dias",
  "90d": "últimos 90 dias",
  ytd: "desde 1 Jan",
};

export function ChartsSection({ period }: { period: AdminPeriod }) {
  const { data } = useQuery<DailyApi>({
    queryKey: ["admin", "report-requests", "daily", period],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/report-requests/daily?period=${period}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
  });

  const rawVolume = data?.volume ?? [];
  // Derive "in_progress" per day: with_unlock - delivered - failed (clamped ≥ 0).
  const volume = rawVolume.map((d) => ({
    ...d,
    in_progress: Math.max(0, d.with_unlock - d.delivered - d.failed),
  }));

  const totalAnalyses = volume.reduce((s, d) => s + d.analyses, 0);
  const totalDelivered = volume.reduce((s, d) => s + d.delivered, 0);
  const days = volume.length || 1;
  const avgPerDay = totalAnalyses / days;
  const peak = volume.reduce(
    (acc, d) => (d.analyses > acc.value ? { value: d.analyses, day: d.day } : acc),
    { value: 0, day: "—" },
  );

  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader
        title="Volume de relatórios gerados"
        subtitle={PERIOD_LABEL[period]}
        accent="signal"
        info="Barras empilhadas: estado dos relatórios unlocked por email (entregues, em curso, falhados). Linha: total de análises geradas (com ou sem unlock)."
      />
      <AdminCard>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
          <div className="flex flex-col gap-4 lg:border-r lg:border-admin-border lg:pr-6">
            <MiniStat eyebrow="Total na janela" value={String(totalAnalyses)} sub="análises geradas" />
            <MiniStat eyebrow="Reports entregues" value={String(totalDelivered)} sub="PDF + email enviado" />
            <MiniStat
              eyebrow="Média / dia"
              value={avgPerDay.toFixed(1)}
              sub={`${days} ${days === 1 ? "dia" : "dias"} na janela`}
            />
            <MiniStat eyebrow="Pico diário" value={String(peak.value)} sub={peak.day} />
          </div>
          <div>
            <p className="m-0 mb-3 text-[15px] font-medium text-admin-text-primary">
              Volume diário
            </p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={volume} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(136,135,128,0.18)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                  <Bar dataKey="delivered" name="Entregues" stackId="a" fill={ADMIN_LITERAL.chartDelivered} />
                  <Bar dataKey="in_progress" name="Em curso" stackId="a" fill="#7664E4" />
                  <Bar dataKey="failed" name="Falhados" stackId="a" fill={ADMIN_LITERAL.chartFailed} />
                  <Line
                    type="monotone"
                    dataKey="analyses"
                    name="Análises geradas"
                    stroke={ADMIN_LITERAL.chartTiming}
                    strokeWidth={1.75}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </AdminCard>
    </section>
  );
}

function MiniStat({
  eyebrow,
  value,
  sub,
}: {
  eyebrow: string;
  value: string;
  sub: string;
}) {
  return (
    <div>
      <p className="admin-eyebrow mb-1.5">{eyebrow}</p>
      <p
        className="m-0 font-mono font-medium leading-none text-admin-text-primary"
        style={{ fontSize: "24px", letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[12px] text-admin-text-tertiary">{sub}</p>
    </div>
  );
}