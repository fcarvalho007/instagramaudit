/**
 * LeadsConversionBanner — 3 KPI cards no topo de `/admin/leads` com as
 * taxas de conversão Reports → LM, LM → Checkout, Checkout → Pago.
 *
 * Dados reais via `/api/admin/leads-funnel` (janela 30 dias).
 */

import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin/fetch";

interface FunnelRate {
  rate: number;
  numerator: number;
  denominator: number;
}

interface FunnelResponse {
  success: boolean;
  windowDays: number;
  reportsToLm: FunnelRate;
  lmToCheckout: FunnelRate;
  checkoutToPaid: FunnelRate;
}

async function fetchFunnel(): Promise<FunnelResponse> {
  const res = await adminFetch("/api/admin/leads-funnel");
  if (!res.ok) throw new Error("Falha ao carregar funil");
  return res.json();
}

function formatRate(r: FunnelRate): string {
  if (r.denominator === 0) return "—";
  return `${Math.round(r.rate * 1000) / 10}%`;
}

interface KpiCardProps {
  label: string;
  hint: string;
  data: FunnelRate | null;
  isLoading: boolean;
}

function KpiCard({ label, hint, data, isLoading }: KpiCardProps) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg border border-[var(--color-admin-border)] bg-admin-surface px-4 py-3.5"
    >
      <p className="text-eyebrow-sm text-admin-text-tertiary">{label}</p>
      {isLoading ? (
        <div className="h-7 w-16 rounded bg-admin-surface-muted animate-pulse" />
      ) : (
        <p className="text-[26px] font-semibold leading-none text-admin-text-primary tabular-nums">
          {data ? formatRate(data) : "—"}
        </p>
      )}
      <p className="text-[11px] text-admin-text-tertiary tabular-nums">
        {data && data.denominator > 0
          ? `${data.numerator} / ${data.denominator} · ${hint}`
          : hint}
      </p>
    </div>
  );
}

export function LeadsConversionBanner() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "leads-funnel"],
    queryFn: fetchFunnel,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  if (error) {
    return (
      <div className="mb-4 rounded-lg border border-[var(--color-admin-border)] bg-admin-surface px-4 py-3">
        <p className="text-[12px] text-admin-text-tertiary">
          Não foi possível carregar o funil de conversão.
        </p>
      </div>
    );
  }

  const windowLabel = data ? `últimos ${data.windowDays} dias` : "últimos 30 dias";

  return (
    <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
      <KpiCard
        label="Reports → LM"
        hint={windowLabel}
        data={data?.reportsToLm ?? null}
        isLoading={isLoading}
      />
      <KpiCard
        label="LM → Checkout"
        hint={windowLabel}
        data={data?.lmToCheckout ?? null}
        isLoading={isLoading}
      />
      <KpiCard
        label="Checkout → Pago"
        hint={windowLabel}
        data={data?.checkoutToPaid ?? null}
        isLoading={isLoading}
      />
    </div>
  );
}