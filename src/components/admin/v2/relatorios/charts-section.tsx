/**
 * Secção 3 — Volume e timing diário (dados reais).
 */

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { ADMIN_LITERAL } from "../admin-tokens";
import { adminFetch } from "@/lib/admin/fetch";
import type { AdminPeriod } from "@/lib/admin/period";

interface DailyApi {
  success: boolean;
  volume: Array<{ day: string; delivered: number; failed: number; queued: number }>;
  timing: Array<{ day: string; avgSeconds: number | null }>;
}

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

  const volume = data?.volume ?? [];
  const timing = data?.timing ?? [];

  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader
        title="Volume e timing diário"
        subtitle="últimos 30 dias"
        accent="signal"
        info="Volume diário de relatórios (entregues/falhados/em fila) e tempo médio de entrega."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminCard>
          <p className="m-0 mb-3 text-[15px] font-medium text-admin-text-primary">
            Volume diário
          </p>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volume} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(136,135,128,0.18)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="delivered" stackId="a" fill={ADMIN_LITERAL.chartDelivered} />
                <Bar dataKey="failed" stackId="a" fill={ADMIN_LITERAL.chartFailed} />
                <Bar dataKey="queued" stackId="a" fill={ADMIN_LITERAL.chartQueued} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
        <AdminCard>
          <p className="m-0 mb-3 text-[15px] font-medium text-admin-text-primary">
            Tempo médio de entrega
          </p>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timing} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(136,135,128,0.18)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
                <Tooltip formatter={(v: number) => `${v}s`} />
                <Line type="monotone" dataKey="avgSeconds" stroke={ADMIN_LITERAL.chartTiming} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      </div>
    </section>
  );
}