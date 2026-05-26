/**
 * BetaConversionFunnel — funil operacional do beta na Visão Geral.
 *
 * 6 etapas (pedido → interesse comercial) com contagem real e drop-off
 * entre etapas. Lê dados em `/api/admin/beta-funnel`. Inspirado no padrão
 * visual do CRM Webinar (barras horizontais), mas adaptado: terminologia
 * beta AuditProfiles, tokens admin (`--admin-leads-*`), sem mocks.
 */

import { useQuery } from "@tanstack/react-query";
import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { adminFetch } from "@/lib/admin/fetch";

interface FunnelStage {
  key: string;
  label: string;
  description?: string;
  count: number;
  pctOfTotal: number;
  pctVsPrev: number;
  dropFromPrev: number;
  comparable?: boolean;
}

interface FunnelResponse {
  success: boolean;
  total: number;
  stages: FunnelStage[];
  error?: string;
}

function formatPct(n: number): string {
  if (!isFinite(n) || n <= 0) return "0%";
  return `${(n * 100).toFixed(n >= 0.1 ? 0 : 1)}%`;
}

async function fetchBetaFunnel(): Promise<FunnelResponse> {
  const res = await adminFetch("/api/admin/beta-funnel");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as FunnelResponse;
}

export function BetaConversionFunnel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "beta-funnel"],
    queryFn: fetchBetaFunnel,
    staleTime: 30_000,
  });

  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader
        title="Funil de conversão pública"
        subtitle="do report público à conversão"
        accent="leads"
        info="Percurso do visitante público: views → email → unlock → pedido → feedback → intenção → convertido. Etapas 1 e 2 são indicativas (sem identificador anónimo persistente); etapas 3-7 contam leads únicas (lead_id). Conversões só são comparáveis a partir de 3→4."
      />
      <AdminCard>
        {isLoading ? (
          <FunnelSkeleton />
        ) : error || !data?.success ? (
          <p className="text-[13px] text-admin-text-tertiary">
            Não foi possível carregar o funil de conversão.
          </p>
        ) : data.total === 0 && (data.stages[2]?.count ?? 0) === 0 ? (
          <p className="text-[13px] text-admin-text-tertiary">
            Ainda sem actividade pública — o funil aparece assim que houver
            visualizações ou leads.
          </p>
        ) : (
          <FunnelBars stages={data.stages} total={data.total} />
        )}
      </AdminCard>
    </section>
  );
}

function FunnelBars({
  stages,
  total,
}: {
  stages: FunnelStage[];
  total: number;
}) {
  const max = Math.max(total, ...stages.map((s) => s.count), 1);
  return (
    <div className="flex flex-col gap-3">
      {stages.map((s, i) => {
        const widthPct = Math.max((s.count / max) * 100, s.count > 0 ? 4 : 0);
        const isFirst = i === 0;
        return (
          <div key={s.key} className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="w-[160px] shrink-0 max-sm:w-[120px]">
                <p className="truncate text-[13px] text-admin-text-secondary max-sm:text-[12px] m-0">
                  {s.label}
                </p>
                {s.description && (
                  <p className="text-[11px] text-admin-text-tertiary leading-tight m-0 mt-0.5 line-clamp-2">
                    {s.description}
                  </p>
                )}
              </div>
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-admin-surface-elevated">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${widthPct}%`,
                    background: "rgb(var(--admin-leads-500))",
                  }}
                />
              </div>
              <div className="flex w-[88px] shrink-0 items-baseline justify-end gap-1.5 max-sm:w-[72px]">
                <span className="text-[14px] font-semibold tabular-nums text-admin-text-primary">
                  {s.count}
                </span>
                <span className="text-[11px] tabular-nums text-admin-text-tertiary">
                  {formatPct(s.pctOfTotal)}
                </span>
              </div>
            </div>
            {!isFirst && (
              <div className="ml-[160px] flex items-center gap-2 pl-2 text-[11px] text-admin-text-tertiary max-sm:ml-[120px]">
                <span aria-hidden="true">↓</span>
                <span className="tabular-nums">
                  {formatPct(s.pctVsPrev)}{" "}
                  {s.comparable ? "conversão" : "indicativo"}
                </span>
                {s.dropFromPrev > 0 && (
                  <span
                    className="tabular-nums"
                    style={{ color: "rgb(var(--admin-signal-500))" }}
                  >
                    · −{s.dropFromPrev}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FunnelSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-[160px] shrink-0 rounded bg-admin-surface-elevated max-sm:w-[120px]" />
          <div className="h-3 flex-1 rounded-full bg-admin-surface-elevated" />
          <div className="h-3 w-[88px] shrink-0 rounded bg-admin-surface-elevated max-sm:w-[72px]" />
        </div>
      ))}
    </div>
  );
}