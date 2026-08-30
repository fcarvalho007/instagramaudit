/**
 * ScrapeCreatorsCostsCard — provider primário, contabilizado em CRÉDITOS.
 *
 * Não faz nenhuma chamada ao ScrapeCreators: lê apenas `provider_call_logs`.
 * O botão "Sincronizar saldo" é a única acção que contacta o provider e
 * consome 1 crédito — exige confirmação explícita.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { SectionError, SectionSkeleton } from "../section-state";
import { adminFetch } from "@/lib/admin/fetch";
import type { ScrapeCreatorsCostSummary } from "@/lib/admin/scrapecreators-costs";

type Payload = ScrapeCreatorsCostSummary & { configured: boolean };

function fmtAge(seconds: number): string {
  if (seconds < 60) return `há ${seconds}s`;
  if (seconds < 3600) return `há ${Math.round(seconds / 60)} min`;
  if (seconds < 86_400) return `há ${Math.round(seconds / 3600)} h`;
  return `há ${Math.round(seconds / 86_400)} dias`;
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="m-0 text-[11px] uppercase tracking-wider text-admin-text-tertiary font-medium">
        {label}
      </p>
      <p className="m-0 mt-1 text-[18px] font-medium tabular-nums text-admin-text-primary">
        {value}
      </p>
      {hint ? <p className="m-0 mt-0.5 text-[11px] text-admin-text-tertiary">{hint}</p> : null}
    </div>
  );
}

export function ScrapeCreatorsCostsCard() {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<Payload>({
    queryKey: ["admin", "sistema", "scrapecreators"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/sistema/scrapecreators");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const onSyncBalance = async () => {
    if (syncing) return;
    const ok = window.confirm(
      "Esta consulta ao ScrapeCreators consome 1 crédito. Continuar?",
    );
    if (!ok) return;
    setSyncing(true);
    try {
      const res = await adminFetch("/api/admin/sistema/scrapecreators-sync-balance", {
        method: "POST",
      });
      const json = (await res.json()) as { ok: boolean; message: string };
      if (json.ok) toast.success(json.message);
      else toast.error(json.message);
      qc.invalidateQueries({ queryKey: ["admin", "sistema", "scrapecreators"] });
    } catch (err) {
      toast.error(`Erro a sincronizar saldo: ${(err as Error).message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AdminCard>
      <AdminSectionHeader
        title="ScrapeCreators · provider primário"
        subtitle="contabilizado em créditos, não em dólares"
        accent="expense"
      />

      {isLoading ? (
        <SectionSkeleton rows={4} rowHeight={28} />
      ) : error || !data ? (
        <SectionError error={error as Error} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <Metric
              label="Créditos 24h"
              value={String(data.windows.last_24h.credits)}
              hint={`${data.windows.last_24h.calls} chamadas`}
            />
            <Metric
              label="Créditos 7d"
              value={String(data.windows.last_7d.credits)}
              hint={`${data.windows.last_7d.calls} chamadas`}
            />
            <Metric
              label="Créditos 30d"
              value={String(data.windows.last_30d.credits)}
              hint={`${data.windows.last_30d.calls} chamadas`}
            />
            <Metric
              label="Saldo conhecido"
              value={
                data.last_known_balance
                  ? String(data.last_known_balance.credits_remaining)
                  : "—"
              }
              hint={
                data.last_known_balance
                  ? `actualizado ${fmtAge(data.last_known_balance.age_seconds)}`
                  : "sem leitura registada"
              }
            />
          </div>

          <div className="mt-5 pt-4 border-t border-admin-border grid grid-cols-2 md:grid-cols-3 gap-5">
            <Metric
              label="Custo efectivo 30d"
              value={`$${data.production_30d.actual_cash_cost_usd.toFixed(2)}`}
              hint={data.promotional ? "promocional — sem custo em dinheiro" : "pack pago"}
            />
            <Metric
              label="Equivalente ao tarifário"
              value={`$${data.windows.last_30d.equivalent_cost_usd.toFixed(4)}`}
              hint={`$${data.cost_per_credit_usd.toFixed(5)} / crédito`}
            />
            <Metric
              label="Sucesso 30d"
              value={
                data.windows.last_30d.calls > 0
                  ? `${((data.windows.last_30d.success_calls / data.windows.last_30d.calls) * 100).toFixed(0)}%`
                  : "—"
              }
              hint={`${data.windows.last_30d.cached_calls} em cache · ${data.windows.last_30d.error_calls} erros`}
            />
          </div>

          <div className="mt-5 pt-4 border-t border-admin-border grid grid-cols-2 md:grid-cols-3 gap-5">
            <Metric
              label="Créditos / auditoria fresh"
              value={
                data.unit_economics_30d.credits_per_fresh_audit !== null
                  ? String(data.unit_economics_30d.credits_per_fresh_audit)
                  : "—"
              }
              hint="exclui lab/QA"
            />
            <Metric
              label="Créditos / unlock comentários"
              value={
                data.unit_economics_30d.credits_per_comment_unlock !== null
                  ? String(data.unit_economics_30d.credits_per_comment_unlock)
                  : "—"
              }
            />
            <Metric
              label="Lab / QA 30d"
              value={`${data.lab_30d.credits} créditos`}
              hint={`produção ${data.production_30d.credits} créditos`}
            />
          </div>

          {data.by_endpoint_30d.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-admin-text-tertiary text-left">
                    <th className="py-1 font-medium">Endpoint</th>
                    <th className="py-1 font-medium text-right">Calls</th>
                    <th className="py-1 font-medium text-right">Créditos</th>
                    <th className="py-1 font-medium text-right">Erros</th>
                    <th className="py-1 font-medium text-right">Duração média</th>
                    <th className="py-1 font-medium text-right">Última</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_endpoint_30d.map((row) => (
                    <tr key={row.endpoint} className="border-t border-admin-border">
                      <td className="py-1.5 font-mono text-admin-text-secondary">
                        {row.endpoint}
                        {row.deprecated ? (
                          <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-admin-neutral-50 text-admin-text-tertiary">
                            deprecated
                          </span>
                        ) : null}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{row.calls}</td>
                      <td className="py-1.5 text-right tabular-nums">{row.credits}</td>
                      <td className="py-1.5 text-right tabular-nums">{row.error_calls}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {row.avg_duration_ms !== null ? `${row.avg_duration_ms} ms` : "—"}
                      </td>
                      <td className="py-1.5 text-right text-admin-text-tertiary">
                        {row.last_call_at
                          ? new Date(row.last_call_at).toLocaleString("pt-PT")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.deprecated_endpoint_calls_30d > 0 && (
            <p className="mt-3 flex items-start gap-2 text-[12px] text-admin-text-secondary">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {data.deprecated_endpoint_calls_30d} chamadas a endpoints deprecated nos
              últimos 30 dias — verificar adapters e scripts.
            </p>
          )}

          <p className="mt-4 text-[11px] text-admin-text-tertiary">
            Reconciliação: saldo esperado{" "}
            {data.reconciliation.expected_credits_remaining ?? "—"} créditos (
            {data.reconciliation.status === "green"
              ? "alinhado"
              : data.reconciliation.status === "amber"
                ? "desvio pequeno"
                : data.reconciliation.status === "red"
                  ? "desvio relevante"
                  : "sem leitura"}
            ). Diferenças face ao painel do provider podem resultar de chamadas
            feitas fora da aplicação (scripts, probes e QA).
          </p>

          <div className="mt-4">
            <button
              type="button"
              onClick={onSyncBalance}
              disabled={syncing || !data.configured}
              className="inline-flex items-center gap-2 rounded-lg border border-admin-border px-3 py-1.5 text-[12px] text-admin-text-secondary disabled:opacity-50"
            >
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
              {syncing ? "A sincronizar…" : "Sincronizar saldo (1 crédito)"}
            </button>
          </div>
        </>
      )}
    </AdminCard>
  );
}
