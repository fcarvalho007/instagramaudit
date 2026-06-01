/**
 * Diagnóstico de persistência de thumbnails — Sistema tab.
 *
 * Mostra agregado dos últimos 7 dias (taxa de sucesso média + breakdown
 * de falhas por razão) e a tabela das últimas 10 runs registadas em
 * `thumbnail_persistence_runs`.
 */

import { useQuery } from "@tanstack/react-query";
import { AdminCard } from "@/components/admin/v2/admin-card";
import {
  SectionError,
  SectionSkeleton,
} from "@/components/admin/v2/section-state";
import { adminFetch } from "@/lib/admin/fetch";

interface Run {
  id: string;
  created_at: string;
  cache_key: string;
  handle: string;
  attempted: number;
  stored: number;
  failed_403: number;
  failed_timeout: number;
  failed_invalid_content_type: number;
  failed_upload: number;
  failed_other: number;
  avatar: string;
  duration_ms: number | null;
}

interface Response {
  success: true;
  window_days: number;
  recent: Run[];
  aggregate: {
    runs: number;
    total_attempted: number;
    total_stored: number;
    success_rate_pct: number | null;
    failures_by_reason: {
      failed_403: number;
      failed_timeout: number;
      failed_invalid_content_type: number;
      failed_upload: number;
      failed_other: number;
    };
  };
}

async function fetchData(): Promise<Response> {
  const res = await adminFetch("/api/admin/thumbnail-persistence");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Response;
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

function dominantFailure(r: Run): string {
  const entries: Array<[string, number]> = [
    ["403", r.failed_403],
    ["timeout", r.failed_timeout],
    ["bad type", r.failed_invalid_content_type],
    ["upload", r.failed_upload],
    ["other", r.failed_other],
  ];
  const top = entries
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])[0];
  return top ? `${top[0]} (${top[1]})` : "—";
}

export function ThumbnailPersistenceCard() {
  const q = useQuery({
    queryKey: ["admin", "thumbnail-persistence"],
    queryFn: fetchData,
    refetchOnWindowFocus: false,
  });

  return (
    <AdminCard accent="info">
      <h3 className="text-eyebrow text-admin-text-tertiary mb-3">
        Persistência de thumbnails
      </h3>

      {q.isLoading && <SectionSkeleton rows={4} rowHeight={28} />}
      {q.error && <SectionError error={q.error} onRetry={() => q.refetch()} />}

      {q.data && (
        <div className="space-y-4">
          {/* Agregado 7d */}
          <div className="rounded-lg border border-admin-border bg-admin-surface-muted/40 p-3">
            <p className="text-eyebrow-sm text-admin-text-tertiary mb-2">
              Últimos {q.data.window_days} dias · {q.data.aggregate.runs} runs
            </p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[12px]">
              <span className="text-admin-text-tertiary">Taxa de sucesso</span>
              <span className="text-admin-text-primary font-medium tabular-nums col-span-2">
                {q.data.aggregate.success_rate_pct != null
                  ? `${q.data.aggregate.success_rate_pct}%`
                  : "—"}
              </span>
              <span className="text-admin-text-tertiary">Tentados</span>
              <span className="text-admin-text-primary tabular-nums col-span-2">
                {q.data.aggregate.total_attempted}
              </span>
              <span className="text-admin-text-tertiary">Armazenados</span>
              <span className="text-admin-text-primary tabular-nums col-span-2">
                {q.data.aggregate.total_stored}
              </span>
            </div>
          </div>

          {/* Falhas por razão */}
          <div className="rounded-lg border border-admin-border bg-admin-surface-muted/40 p-3">
            <p className="text-eyebrow-sm text-admin-text-tertiary mb-2">
              Falhas por razão (7d)
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
              {(
                [
                  ["failed_403", "403 Forbidden (CDN)"],
                  ["failed_timeout", "Timeout"],
                  ["failed_invalid_content_type", "Tipo inválido"],
                  ["failed_upload", "Upload Storage"],
                  ["failed_other", "Outros"],
                ] as const
              ).map(([k, label]) => {
                const v = q.data!.aggregate.failures_by_reason[k];
                return (
                  <span
                    key={k}
                    className="contents text-[12px]"
                  >
                    <span className="text-admin-text-tertiary">{label}</span>
                    <span
                      className={
                        v > 0
                          ? "text-admin-danger-700 font-medium tabular-nums"
                          : "text-admin-text-primary tabular-nums"
                      }
                    >
                      {v}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Últimas 10 runs */}
          <div className="rounded-lg border border-admin-border bg-admin-surface-muted/40 p-3">
            <p className="text-eyebrow-sm text-admin-text-tertiary mb-2">
              Últimas 10 runs
            </p>
            {q.data.recent.length === 0 ? (
              <p className="text-[12px] text-admin-text-tertiary italic">
                Sem runs registadas.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-admin-text-tertiary text-left">
                      <th className="font-normal py-1 pr-3">Quando</th>
                      <th className="font-normal py-1 pr-3">Handle</th>
                      <th className="font-normal py-1 pr-3 text-right">Tent.</th>
                      <th className="font-normal py-1 pr-3 text-right">Arm.</th>
                      <th className="font-normal py-1 pr-3">Falha dom.</th>
                      <th className="font-normal py-1 pr-3">Avatar</th>
                      <th className="font-normal py-1 text-right">ms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.recent.map((r) => {
                      const allOk = r.attempted > 0 && r.stored === r.attempted;
                      return (
                        <tr
                          key={r.id}
                          className="border-t border-admin-border/60"
                        >
                          <td className="py-1 pr-3 text-admin-text-secondary admin-code">
                            {relativeTime(r.created_at)}
                          </td>
                          <td className="py-1 pr-3 text-admin-text-primary truncate max-w-[140px]">
                            {r.handle}
                          </td>
                          <td className="py-1 pr-3 text-right tabular-nums text-admin-text-primary">
                            {r.attempted}
                          </td>
                          <td
                            className={`py-1 pr-3 text-right tabular-nums ${
                              allOk
                                ? "text-admin-revenue-700"
                                : "text-admin-text-primary"
                            }`}
                          >
                            {r.stored}
                          </td>
                          <td className="py-1 pr-3 text-admin-text-secondary">
                            {dominantFailure(r)}
                          </td>
                          <td className="py-1 pr-3 text-admin-text-secondary">
                            {r.avatar}
                          </td>
                          <td className="py-1 text-right tabular-nums text-admin-text-tertiary admin-code">
                            {r.duration_ms ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
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