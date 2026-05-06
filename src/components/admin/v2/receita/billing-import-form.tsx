/**
 * Formulário para registar custos externos de billing.
 * Modo simples (1 linha) e modo batch (dashboard total + N linhas).
 */

import { useState } from "react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/admin/fetch";
import { AdminCard } from "../admin-card";

interface Props {
  onSuccess: () => void;
}

interface RowForm {
  actor_or_model: string;
  label: string;
  metric_name: string;
  quantity: string;
  unit_price_usd: string;
  raw_calculated_cost_usd: string;
  displayed_cost_usd: string;
  actual_cost_usd: string;
  notes: string;
}

const emptyRow = (): RowForm => ({
  actor_or_model: "",
  label: "",
  metric_name: "",
  quantity: "",
  unit_price_usd: "",
  raw_calculated_cost_usd: "",
  displayed_cost_usd: "",
  actual_cost_usd: "",
  notes: "",
});

export function BillingImportForm({ onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [batchMode, setBatchMode] = useState(true);

  // Batch header
  const [header, setHeader] = useState({
    provider: "apify",
    period_start: "",
    period_end: "",
    service_group: "",
    dashboard_total: "",
    source_note: "",
  });

  // Batch rows
  const [rows, setRows] = useState<RowForm[]>([emptyRow()]);

  function setH(key: keyof typeof header, value: string) {
    setHeader((prev) => ({ ...prev, [key]: value }));
  }

  function setRow(idx: number, key: keyof RowForm, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx]!, [key]: value };
      return next;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!header.period_start || !header.period_end) {
      toast.error("Preenche o período");
      return;
    }

    setSubmitting(true);
    try {
      if (batchMode) {
        if (!header.dashboard_total) {
          toast.error("Preenche o total do dashboard");
          setSubmitting(false);
          return;
        }
        const payload = {
          batch: true,
          provider: header.provider,
          period_start: new Date(header.period_start).toISOString(),
          period_end: new Date(header.period_end).toISOString(),
          service_group: header.service_group || undefined,
          dashboard_total_actual_cost_usd: Number(header.dashboard_total),
          source_note: header.source_note || undefined,
          rows: rows
            .filter((r) => r.actual_cost_usd)
            .map((r) => ({
              actor_or_model: r.actor_or_model || undefined,
              label: r.label || undefined,
              metric_name: r.metric_name || undefined,
              quantity: r.quantity ? Number(r.quantity) : undefined,
              unit_price_usd: r.unit_price_usd
                ? Number(r.unit_price_usd)
                : undefined,
              raw_calculated_cost_usd: r.raw_calculated_cost_usd
                ? Number(r.raw_calculated_cost_usd)
                : undefined,
              displayed_cost_usd: r.displayed_cost_usd
                ? Number(r.displayed_cost_usd)
                : undefined,
              actual_cost_usd: Number(r.actual_cost_usd),
              notes: r.notes || undefined,
            })),
        };
        const res = await adminFetch("/api/admin/billing-reconciliation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { message?: string }).message ?? "Erro",
          );
        }
        const result = await res.json();
        toast.success(
          `Batch criado — estado: ${(result as { reconciliation_status?: string }).reconciliation_status ?? "OK"}`,
        );
      } else {
        // Single row mode
        const r = rows[0]!;
        if (!r.actual_cost_usd) {
          toast.error("Preenche o custo real");
          setSubmitting(false);
          return;
        }
        const res = await adminFetch("/api/admin/billing-reconciliation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: header.provider,
            source: "manual",
            period_start: new Date(header.period_start).toISOString(),
            period_end: new Date(header.period_end).toISOString(),
            service_group: header.service_group || undefined,
            actor_or_model: r.actor_or_model || undefined,
            label: r.label || undefined,
            metric_name: r.metric_name || undefined,
            quantity: r.quantity ? Number(r.quantity) : undefined,
            unit_price_usd: r.unit_price_usd
              ? Number(r.unit_price_usd)
              : undefined,
            raw_calculated_cost_usd: r.raw_calculated_cost_usd
              ? Number(r.raw_calculated_cost_usd)
              : undefined,
            displayed_cost_usd: r.displayed_cost_usd
              ? Number(r.displayed_cost_usd)
              : undefined,
            actual_cost_usd: Number(r.actual_cost_usd),
            notes: r.notes || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { message?: string }).message ?? "Erro",
          );
        }
        toast.success("Custo registado");
      }
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao gravar");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded border border-border-subtle bg-admin-surface-muted/60 px-2 py-1.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-1 focus:ring-accent-cyan/40";
  const labelCls = "flex flex-col gap-1 text-xs text-foreground-muted";

  return (
    <AdminCard className="mt-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => setBatchMode(false)}
          className={`text-xs px-2 py-1 rounded ${!batchMode ? "bg-accent-cyan/20 text-accent-cyan" : "text-foreground-muted"}`}
        >
          Linha única
        </button>
        <button
          type="button"
          onClick={() => setBatchMode(true)}
          className={`text-xs px-2 py-1 rounded ${batchMode ? "bg-accent-cyan/20 text-accent-cyan" : "text-foreground-muted"}`}
        >
          Batch (dashboard)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header fields */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className={labelCls}>
            Provider
            <select
              value={header.provider}
              onChange={(e) => setH("provider", e.target.value)}
              className={inputCls}
            >
              <option value="apify">Apify</option>
              <option value="openai">OpenAI</option>
              <option value="dataforseo">DataForSEO</option>
            </select>
          </label>
          <label className={labelCls}>
            Período início
            <input
              type="date"
              value={header.period_start}
              onChange={(e) => setH("period_start", e.target.value)}
              className={inputCls}
              required
            />
          </label>
          <label className={labelCls}>
            Período fim
            <input
              type="date"
              value={header.period_end}
              onChange={(e) => setH("period_end", e.target.value)}
              className={inputCls}
              required
            />
          </label>
          <label className={labelCls}>
            Grupo de serviço
            <input
              type="text"
              placeholder="Actors, Completions..."
              value={header.service_group}
              onChange={(e) => setH("service_group", e.target.value)}
              className={inputCls}
            />
          </label>
        </div>

        {/* Batch-only: dashboard total */}
        {batchMode && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className={labelCls}>
              Total dashboard (USD)
              <input
                type="number"
                step="any"
                placeholder="0.66"
                value={header.dashboard_total}
                onChange={(e) => setH("dashboard_total", e.target.value)}
                className={inputCls}
                required
              />
            </label>
            <label className={`${labelCls} col-span-2`}>
              Nota de origem
              <input
                type="text"
                placeholder="Dashboard Apify maio 2026"
                value={header.source_note}
                onChange={(e) => setH("source_note", e.target.value)}
                className={inputCls}
              />
            </label>
          </div>
        )}

        {/* Rows */}
        <div className="space-y-3">
          <p className="text-eyebrow-sm text-foreground-muted">
            {batchMode ? "Linhas do dashboard" : "Detalhe"}
          </p>
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-2 md:grid-cols-5 gap-2 border border-border-subtle/40 rounded p-2"
            >
              <label className={labelCls}>
                Actor / modelo
                <input
                  type="text"
                  placeholder="apify/instagram-scraper"
                  value={row.actor_or_model}
                  onChange={(e) =>
                    setRow(idx, "actor_or_model", e.target.value)
                  }
                  className={inputCls}
                />
              </label>
              <label className={labelCls}>
                Label
                <input
                  type="text"
                  placeholder="Result, Comment..."
                  value={row.label}
                  onChange={(e) => setRow(idx, "label", e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className={labelCls}>
                Métrica
                <input
                  type="text"
                  placeholder="events"
                  value={row.metric_name}
                  onChange={(e) =>
                    setRow(idx, "metric_name", e.target.value)
                  }
                  className={inputCls}
                />
              </label>
              <label className={labelCls}>
                Quantidade
                <input
                  type="number"
                  step="any"
                  value={row.quantity}
                  onChange={(e) => setRow(idx, "quantity", e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className={labelCls}>
                Preço unit. (USD)
                <input
                  type="number"
                  step="any"
                  value={row.unit_price_usd}
                  onChange={(e) =>
                    setRow(idx, "unit_price_usd", e.target.value)
                  }
                  className={inputCls}
                />
              </label>
              <label className={labelCls}>
                Raw calc. (USD)
                <input
                  type="number"
                  step="any"
                  placeholder="0.0851"
                  value={row.raw_calculated_cost_usd}
                  onChange={(e) =>
                    setRow(idx, "raw_calculated_cost_usd", e.target.value)
                  }
                  className={inputCls}
                />
              </label>
              <label className={labelCls}>
                Displayed (USD)
                <input
                  type="number"
                  step="any"
                  placeholder="0.09"
                  value={row.displayed_cost_usd}
                  onChange={(e) =>
                    setRow(idx, "displayed_cost_usd", e.target.value)
                  }
                  className={inputCls}
                />
              </label>
              <label className={labelCls}>
                Custo real (USD)
                <input
                  type="number"
                  step="any"
                  value={row.actual_cost_usd}
                  onChange={(e) =>
                    setRow(idx, "actual_cost_usd", e.target.value)
                  }
                  className={inputCls}
                  required
                />
              </label>
              <label className={labelCls}>
                Notas
                <input
                  type="text"
                  value={row.notes}
                  onChange={(e) => setRow(idx, "notes", e.target.value)}
                  className={inputCls}
                />
              </label>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="self-end text-xs text-red-400 hover:underline py-1.5"
                >
                  Remover
                </button>
              )}
            </div>
          ))}
          {batchMode && (
            <button
              type="button"
              onClick={addRow}
              className="text-xs text-accent-cyan hover:underline"
            >
              + Adicionar linha
            </button>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-accent-cyan/90 px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-cyan disabled:opacity-50"
          >
            {submitting
              ? "A gravar..."
              : batchMode
                ? "Criar batch"
                : "Gravar"}
          </button>
        </div>
      </form>
    </AdminCard>
  );
}
