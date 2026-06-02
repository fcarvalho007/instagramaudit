/**
 * Admin card — Backfill `actual_cost_usd` da Apify a partir do run metadata.
 * Permite pré-visualizar (dry-run) e aplicar. Não arranca novos actor runs.
 */

import { useState } from "react";
import { DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { adminFetch } from "@/lib/admin/fetch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScopeStats {
  scope: "provider_call_logs" | "apify_lab_runs";
  scanned: number;
  updated: number;
  skipped_missing_usage: number;
  skipped_missing_remote: number;
  errors: number;
  drift_flagged: number;
  sum_estimated_before: number;
  sum_actual_before: number;
  sum_actual_after: number;
  missing_run_ids: string[];
}

interface BackfillResponse {
  success: boolean;
  result: {
    ok: boolean;
    dry_run: boolean;
    drift_threshold_pct: number;
    scopes: ScopeStats[];
    totals: {
      scanned: number;
      updated: number;
      drift_flagged: number;
      sum_estimated_before: number;
      sum_actual_before: number;
      sum_actual_after: number;
    };
    aborted_reason?: string;
  };
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(4)}`;
}

export function ApifyActualCostBackfillCard() {
  const [loading, setLoading] = useState<null | "preview" | "apply">(null);
  const [result, setResult] = useState<BackfillResponse["result"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showMissing, setShowMissing] = useState(false);

  const run = async (dryRun: boolean) => {
    setLoading(dryRun ? "preview" : "apply");
    setError(null);
    try {
      const res = await adminFetch("/api/admin/apify-backfill-actual-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "both",
          limit: 500,
          driftThresholdPct: 30,
          dryRun,
        }),
      });
      const json = (await res.json()) as BackfillResponse;
      if (!res.ok || !json.success) {
        setError(json.result?.aborted_reason ?? `HTTP ${res.status}`);
      }
      setResult(json.result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const totals = result?.totals;
  const allMissing =
    result?.scopes.flatMap((s) =>
      s.missing_run_ids.map((id) => `${s.scope}:${id}`),
    ) ?? [];

  return (
    <>
      <div
        className="rounded-2xl border p-6"
        style={{ borderColor: "#E5E3D9", backgroundColor: "#FAFAF7" }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex items-center justify-center shrink-0 rounded-lg"
            style={{ width: 36, height: 36, backgroundColor: "#EEF2FF" }}
          >
            <DollarSign size={16} style={{ color: "#3772E5" }} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold text-admin-text-primary">
              Backfill custo real Apify
            </span>
            <p className="text-[12px] text-admin-text-tertiary leading-snug">
              Lê <span className="font-mono">usageTotalUsd</span> de cada{" "}
              <span className="font-mono">apify_run_id</span> existente e
              preenche <span className="font-mono">actual_cost_usd</span>.{" "}
              <strong className="text-admin-text-secondary">
                Não arranca novos runs
              </strong>{" "}
              — só leituras de metadata. Drift &gt;30% gera alerta.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => run(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "transparent",
              color: "#3772E5",
              border: "1px solid #C7D2FE",
            }}
          >
            {loading === "preview" ? "A pré-visualizar…" : "Pré-visualizar"}
          </button>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "#3772E5",
              color: "white",
              border: "1px solid #3772E5",
            }}
          >
            {loading === "apply" ? "A aplicar…" : "Aplicar backfill"}
          </button>
        </div>

        {error && (
          <p className="mt-3 text-[12px] text-admin-text-secondary bg-white/80 rounded-md px-3 py-2 border" style={{ borderColor: "#FECACA" }}>
            Erro: {error}
          </p>
        )}

        {result && totals && (
          <div className="mt-4 rounded-md border bg-white px-4 py-3 text-[12px]" style={{ borderColor: "#E5E3D9" }}>
            <p className="font-semibold text-admin-text-primary mb-2">
              {result.dry_run ? "Pré-visualização" : "Aplicado"} ·{" "}
              {result.scopes.length} scope(s)
              {result.aborted_reason ? ` · abortado: ${result.aborted_reason}` : ""}
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-admin-text-secondary">
              <span>Scanned</span><span>{totals.scanned}</span>
              <span>{result.dry_run ? "Would update" : "Updated"}</span><span>{totals.updated}</span>
              <span>Drift ≥{result.drift_threshold_pct}%</span><span>{totals.drift_flagged}</span>
              <span>Σ estimated</span><span>{fmtUsd(totals.sum_estimated_before)}</span>
              <span>Σ actual (antes)</span><span>{fmtUsd(totals.sum_actual_before)}</span>
              <span>Σ actual (depois)</span><span>{fmtUsd(totals.sum_actual_after)}</span>
            </div>
            {result.scopes.map((s) => (
              <div key={s.scope} className="mt-3 pt-2 border-t" style={{ borderColor: "#F1F4F9" }}>
                <p className="font-mono text-admin-text-tertiary text-[11px]">
                  {s.scope}: scanned {s.scanned} · updated {s.updated} · drift {s.drift_flagged} · missing usage {s.skipped_missing_usage} · missing remote {s.skipped_missing_remote} · errors {s.errors} · sem run_id {s.missing_run_ids.length}
                </p>
              </div>
            ))}

            {allMissing.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowMissing((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] text-admin-text-tertiary hover:text-admin-text-secondary"
                >
                  {showMissing ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {allMissing.length} row(s) sem apify_run_id
                </button>
                {showMissing && (
                  <ul className="mt-2 font-mono text-[11px] text-admin-text-tertiary max-h-40 overflow-y-auto">
                    {allMissing.map((id) => (
                      <li key={id}>{id}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar backfill de actual_cost_usd?</AlertDialogTitle>
            <AlertDialogDescription>
              Vai chamar <span className="font-mono">GET /v2/actor-runs/&#123;id&#125;</span> por cada row pendente (até 500 por scope), actualizar <span className="font-mono">provider_call_logs</span> e <span className="font-mono">apify_lab_runs</span>, gerar alertas para drift &gt;30% e registar um batch em <span className="font-mono">provider_billing_import_batches</span>. Sem actor runs novos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                void run(false);
              }}
            >
              Aplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}