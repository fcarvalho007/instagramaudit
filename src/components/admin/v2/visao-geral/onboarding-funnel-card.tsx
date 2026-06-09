/**
 * OnboardingFunnelCard — janela de 7 dias do funil de onboarding (3 passos)
 * lendo `/api/admin/onboarding-funnel`. Mede a qualidade do MODAL público:
 * quem o abriu, em que passo parou, taxa de conclusão e erros.
 *
 * Complementa o `AcquisitionFunnel` (que olha para o pipeline macro report→pago).
 */

import { useQuery } from "@tanstack/react-query";
import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { SectionError, SectionSkeleton } from "../section-state";
import { adminFetch } from "@/lib/admin/fetch";

interface FunnelResponse {
  success: boolean;
  window_days: number;
  aggregate: {
    total_events: number;
    modal_started: number;
    step1_viewed: number;
    step2_viewed: number;
    step3_viewed: number;
    successful: number;
    abandon: number;
    errors: number;
    completion_rate_pct: number | null;
  };
  error_code?: string;
  message?: string;
}

export function OnboardingFunnelCard() {
  const { data, isLoading, error, refetch } = useQuery<FunnelResponse>({
    queryKey: ["admin", "onboarding-funnel"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/onboarding-funnel");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  return (
    <AdminCard>
      <AdminSectionHeader
        title="Modal de onboarding"
        subtitle={`últimos ${data?.window_days ?? 7} dias`}
        accent="leads"
      />
      {isLoading ? (
        <SectionSkeleton rows={4} rowHeight={28} />
      ) : error || !data?.success ? (
        <SectionError
          error={(error as Error) ?? data?.message ?? data?.error_code}
          onRetry={() => refetch()}
        />
      ) : (
        <Body agg={data.aggregate} />
      )}
    </AdminCard>
  );
}

function Body({ agg }: { agg: FunnelResponse["aggregate"] }) {
  const { modal_started, step1_viewed, step2_viewed, step3_viewed, successful, abandon, errors, completion_rate_pct } = agg;

  if (modal_started === 0 && step1_viewed === 0 && successful === 0) {
    return (
      <p className="m-0 text-[13px] text-admin-text-tertiary">
        Sem actividade do modal de onboarding nesta janela.
      </p>
    );
  }

  const base = Math.max(
    modal_started,
    step1_viewed,
    step2_viewed,
    step3_viewed,
    successful,
    1,
  );

  const rows = [
    { label: "Modal aberto", count: modal_started },
    { label: "Passo 1 — email", count: step1_viewed },
    { label: "Passo 2 — contexto", count: step2_viewed },
    { label: "Passo 3 — conta", count: step3_viewed },
    { label: "Concluído", count: successful },
  ];

  return (
    <>
      <div className="flex flex-col gap-4">
        {rows.map((r) => (
          <Row key={r.label} label={r.label} count={r.count} pct={r.count / base} />
        ))}
      </div>
      <p className="mt-5 pt-4 border-t border-admin-border text-[12px] text-admin-text-tertiary leading-relaxed m-0 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Taxa de conclusão:{" "}
          <span className="text-admin-text-primary font-medium tabular-nums">
            {completion_rate_pct === null ? "—" : `${completion_rate_pct}%`}
          </span>
        </span>
        {abandon > 0 ? (
          <span>· abandono: <span className="tabular-nums">{abandon}</span></span>
        ) : null}
        {errors > 0 ? (
          <span className="text-admin-warning-700">
            · erros: <span className="tabular-nums font-medium">{errors}</span>
          </span>
        ) : null}
      </p>
    </>
  );
}

function Row({ label, count, pct }: { label: string; count: number; pct: number }) {
  const widthPct = Math.min(100, Math.max(0, pct * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[13px] font-medium text-admin-text-primary">{label}</span>
        <span className="font-mono text-[13px] tabular-nums text-admin-text-secondary">
          <span className="text-admin-text-primary font-medium">{count}</span>
          <span className="ml-2 text-admin-text-tertiary">
            {count === 0 ? "0%" : pct >= 0.999 ? "100%" : `${(pct * 100).toFixed(0)}%`}
          </span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-admin-neutral-50 overflow-hidden">
        {count > 0 ? (
          <div
            className="h-full rounded-full"
            style={{ width: `${widthPct}%`, backgroundColor: "#534AB7" }}
          />
        ) : (
          <div className="h-full w-[8%] rounded-full bg-admin-border" />
        )}
      </div>
    </div>
  );
}