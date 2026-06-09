/**
 * AcquisitionFunnel — funil condensado de 5 etapas para a Visão Geral.
 *
 * Substitui `FunnelSection` + `BetaConversionFunnel` nesta página.
 * Mostra barras horizontais proporcionais com a contagem real:
 *   1. Report público visto    (placeholder — sem tracker hoje)
 *   2. Email submetido
 *   3. Conta criada (lead)
 *   4. Feedback recebido
 *   5. Convertido (pago)
 *
 * Lê `/api/admin/beta-funnel` (já existente). Stages mapeados:
 *   beta.stages[0] → report_visto
 *   beta.stages[1] → unlock_iniciado
 *   beta.stages[2] → unlock_concluido  (= conta criada)
 *   beta.stages[4] → feedback_recebido
 *   beta.stages[6] → convertido
 */

import { useQuery } from "@tanstack/react-query";
import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { SectionError, SectionSkeleton } from "../section-state";
import { adminFetch } from "@/lib/admin/fetch";

interface BetaStage {
  key: string;
  label: string;
  count: number;
  comparable?: boolean;
}
interface BetaResponse {
  success: boolean;
  total: number;
  stages: BetaStage[];
  error?: string;
}

interface DisplayStage {
  label: string;
  count: number;
  pct: number;
  note?: string;
  unavailable?: boolean;
}

function pctLabel(pct: number, count: number): string {
  if (count === 0) return "0%";
  if (pct >= 0.999) return "100%";
  return `${(pct * 100).toFixed(0)}%`;
}

export function AcquisitionFunnel() {
  const { data, isLoading, error, refetch } = useQuery<BetaResponse>({
    queryKey: ["admin", "acquisition-funnel"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/beta-funnel");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  return (
    <AdminCard>
      <AdminSectionHeader
        title="Funil de conversão"
        subtitle="últimos 30 dias"
        accent="leads"
      />
      {isLoading ? (
        <SectionSkeleton rows={5} rowHeight={32} />
      ) : error || !data?.success ? (
        <SectionError error={(error as Error) ?? data?.error} onRetry={() => refetch()} />
      ) : (
        <FunnelBody data={data} />
      )}
    </AdminCard>
  );
}

function FunnelBody({ data }: { data: BetaResponse }) {
  const stages = data.stages ?? [];
  const get = (key: string) => stages.find((s) => s.key === key)?.count ?? 0;

  const viewCount = get("report_visto");
  const emailCount = get("unlock_iniciado");
  const leadCount = get("unlock_concluido");
  const feedbackCount = get("feedback_recebido");
  const convertedCount = get("convertido");

  // Base de % do funil = topo do funil (views), com fallback para a etapa
  // máxima conhecida se ainda não houver views.
  const base = Math.max(
    viewCount,
    emailCount,
    leadCount,
    feedbackCount,
    convertedCount,
    1,
  );

  const display: DisplayStage[] = [
    { label: "Report público visto", count: viewCount, pct: viewCount / base },
    { label: "Email submetido", count: emailCount, pct: emailCount / base },
    { label: "Conta criada (lead)", count: leadCount, pct: leadCount / base },
    { label: "Feedback recebido", count: feedbackCount, pct: feedbackCount / base },
    {
      label: "Convertido (pago)",
      count: convertedCount,
      pct: convertedCount / base,
    },
  ];

  const zeroStages = display.filter(
    (s) => !s.unavailable && s.count === 0,
  ).length;

  return (
    <>
      <div className="flex flex-col gap-4">
        {display.map((s) => (
          <FunnelRow key={s.label} stage={s} />
        ))}
      </div>
      <p className="mt-5 pt-4 border-t border-admin-border text-[12px] text-admin-text-tertiary leading-relaxed m-0">
        {zeroStages > 0
          ? `${zeroStages} etapa${zeroStages > 1 ? "s" : ""} a 0 nesta janela.`
          : "Todas as etapas com actividade nesta janela."}
      </p>
    </>
  );
}

function FunnelRow({ stage }: { stage: DisplayStage }) {
  const widthPct = Math.min(100, Math.max(0, stage.pct * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[13px] font-medium text-admin-text-primary">
          {stage.label}
        </span>
        <span className="font-mono text-[13px] tabular-nums text-admin-text-secondary">
          {stage.unavailable ? (
            <span className="text-admin-text-tertiary">— {stage.note}</span>
          ) : (
            <>
              <span className="text-admin-text-primary font-medium">{stage.count}</span>
              <span className="ml-2 text-admin-text-tertiary">
                {pctLabel(stage.pct, stage.count)}
              </span>
            </>
          )}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-admin-neutral-50 overflow-hidden">
        {!stage.unavailable && stage.count > 0 ? (
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