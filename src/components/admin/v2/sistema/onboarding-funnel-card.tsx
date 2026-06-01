/**
 * Funil de onboarding (3-step) — Sistema tab.
 *
 * Mostra agregado dos últimos 7 dias (modal iniciado, steps, sucesso,
 * abandono, erros, taxa de conclusão) e as últimas 20 onboarding events
 * registadas em `product_events`.
 */

import { useQuery } from "@tanstack/react-query";
import { AdminCard } from "@/components/admin/v2/admin-card";
import {
  SectionError,
  SectionSkeleton,
} from "@/components/admin/v2/section-state";
import { adminFetch } from "@/lib/admin/fetch";

interface RecentEvent {
  id: string;
  created_at: string;
  event_type: string;
  handle: string | null;
  lead_id: string | null;
  step: number | null;
  error_code: string | null;
}

interface FunnelResponse {
  success: true;
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
  recent: RecentEvent[];
}

async function fetchData(): Promise<FunnelResponse> {
  const res = await adminFetch("/api/admin/onboarding-funnel");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as FunnelResponse;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

function shortEventLabel(type: string): string {
  switch (type) {
    case "onboarding_step_view":
      return "step_view";
    case "onboarding_step_complete":
      return "step_complete";
    case "onboarding_success":
      return "success";
    case "onboarding_abandon":
      return "abandon";
    case "onboarding_error":
      return "error";
    default:
      return type.replace(/^onboarding_/, "");
  }
}

export function OnboardingFunnelCard() {
  const q = useQuery({
    queryKey: ["admin", "onboarding-funnel"],
    queryFn: fetchData,
    refetchOnWindowFocus: false,
  });

  return (
    <AdminCard accent="info">
      <h3 className="text-eyebrow text-admin-text-tertiary mb-3">
        Funil de onboarding
      </h3>

      {q.isLoading && <SectionSkeleton rows={4} rowHeight={28} />}
      {q.error && <SectionError error={q.error} onRetry={() => q.refetch()} />}

      {q.data && (
        <div className="space-y-4">
          {/* Agregado 7d */}
          <div className="rounded-lg border border-admin-border bg-admin-surface-muted/40 p-3">
            <p className="text-eyebrow-sm text-admin-text-tertiary mb-2">
              Últimos {q.data.window_days} dias · {q.data.aggregate.total_events} events
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[12px]">
              {(
                [
                  ["Modal iniciado", q.data.aggregate.modal_started, false],
                  ["Step 1", q.data.aggregate.step1_viewed, false],
                  ["Step 2", q.data.aggregate.step2_viewed, false],
                  ["Step 3", q.data.aggregate.step3_viewed, false],
                  ["Sucesso", q.data.aggregate.successful, false],
                  ["Abandono", q.data.aggregate.abandon, false],
                  ["Erros", q.data.aggregate.errors, q.data.aggregate.errors > 0],
                  [
                    "Taxa conclusão",
                    q.data.aggregate.completion_rate_pct != null
                      ? `${q.data.aggregate.completion_rate_pct}%`
                      : "—",
                    false,
                  ],
                ] as Array<[string, number | string, boolean]>
              ).map(([label, value, danger]) => (
                <div key={label} className="flex flex-col">
                  <span className="text-admin-text-tertiary">{label}</span>
                  <span
                    className={
                      danger
                        ? "text-admin-danger-700 font-medium tabular-nums"
                        : "text-admin-text-primary font-medium tabular-nums"
                    }
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Últimas 20 events */}
          <div className="rounded-lg border border-admin-border bg-admin-surface-muted/40 p-3">
            <p className="text-eyebrow-sm text-admin-text-tertiary mb-2">
              Últimas 20 events
            </p>
            {q.data.recent.length === 0 ? (
              <p className="text-[12px] text-admin-text-tertiary italic">
                Sem events registadas.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-admin-text-tertiary text-left">
                      <th className="font-normal py-1 pr-3">Quando</th>
                      <th className="font-normal py-1 pr-3">Evento</th>
                      <th className="font-normal py-1 pr-3 text-right">Step</th>
                      <th className="font-normal py-1 pr-3">Handle</th>
                      <th className="font-normal py-1 pr-3">Lead</th>
                      <th className="font-normal py-1">Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.recent.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-admin-border/60"
                      >
                        <td className="py-1 pr-3 text-admin-text-secondary admin-code">
                          {relativeTime(r.created_at)}
                        </td>
                        <td className="py-1 pr-3 text-admin-text-primary admin-code">
                          {shortEventLabel(r.event_type)}
                        </td>
                        <td className="py-1 pr-3 text-right tabular-nums text-admin-text-primary">
                          {r.step ?? "—"}
                        </td>
                        <td className="py-1 pr-3 text-admin-text-secondary truncate max-w-[140px]">
                          {r.handle ?? "—"}
                        </td>
                        <td className="py-1 pr-3 text-admin-text-tertiary admin-code truncate max-w-[120px]">
                          {r.lead_id ? r.lead_id.slice(0, 8) : "—"}
                        </td>
                        <td
                          className={
                            r.error_code
                              ? "py-1 text-admin-danger-700 admin-code"
                              : "py-1 text-admin-text-tertiary"
                          }
                        >
                          {r.error_code ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminCard>
  );
}