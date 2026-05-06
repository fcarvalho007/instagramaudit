/**
 * Formulário compacto para registar manualmente custos externos de billing.
 */

import { useState } from "react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/admin/fetch";
import { AdminCard } from "../admin-card";

interface Props {
  onSuccess: () => void;
}

export function BillingImportForm({ onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    provider: "apify",
    period_start: "",
    period_end: "",
    service: "",
    actor_or_model: "",
    metric_name: "",
    quantity: "",
    unit_price_usd: "",
    actual_cost_usd: "",
    notes: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.period_start || !form.period_end || !form.actual_cost_usd) {
      toast.error("Preenche período e custo real");
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminFetch("/api/admin/billing-reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: form.provider,
          source: "manual",
          period_start: new Date(form.period_start).toISOString(),
          period_end: new Date(form.period_end).toISOString(),
          service: form.service || undefined,
          actor_or_model: form.actor_or_model || undefined,
          metric_name: form.metric_name || undefined,
          quantity: form.quantity ? Number(form.quantity) : undefined,
          unit_price_usd: form.unit_price_usd ? Number(form.unit_price_usd) : undefined,
          actual_cost_usd: Number(form.actual_cost_usd),
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Erro");
      }
      toast.success("Custo registado");
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao gravar");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded border border-border-subtle bg-admin-surface-muted/60 px-2 py-1.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-1 focus:ring-accent-cyan/40";

  return (
    <AdminCard className="mt-4">
      <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Provider */}
        <label className="flex flex-col gap-1 text-xs text-foreground-muted">
          Provider
          <select
            value={form.provider}
            onChange={(e) => set("provider", e.target.value)}
            className={inputCls}
          >
            <option value="apify">Apify</option>
            <option value="openai">OpenAI</option>
            <option value="dataforseo">DataForSEO</option>
          </select>
        </label>

        {/* Period start */}
        <label className="flex flex-col gap-1 text-xs text-foreground-muted">
          Período início
          <input
            type="date"
            value={form.period_start}
            onChange={(e) => set("period_start", e.target.value)}
            className={inputCls}
            required
          />
        </label>

        {/* Period end */}
        <label className="flex flex-col gap-1 text-xs text-foreground-muted">
          Período fim
          <input
            type="date"
            value={form.period_end}
            onChange={(e) => set("period_end", e.target.value)}
            className={inputCls}
            required
          />
        </label>

        {/* Service */}
        <label className="flex flex-col gap-1 text-xs text-foreground-muted">
          Serviço
          <input
            type="text"
            placeholder="Actors, Completions..."
            value={form.service}
            onChange={(e) => set("service", e.target.value)}
            className={inputCls}
          />
        </label>

        {/* Actor/model */}
        <label className="flex flex-col gap-1 text-xs text-foreground-muted">
          Actor / modelo
          <input
            type="text"
            placeholder="apify/instagram-scraper"
            value={form.actor_or_model}
            onChange={(e) => set("actor_or_model", e.target.value)}
            className={inputCls}
          />
        </label>

        {/* Metric */}
        <label className="flex flex-col gap-1 text-xs text-foreground-muted">
          Métrica
          <input
            type="text"
            placeholder="events, tokens..."
            value={form.metric_name}
            onChange={(e) => set("metric_name", e.target.value)}
            className={inputCls}
          />
        </label>

        {/* Quantity */}
        <label className="flex flex-col gap-1 text-xs text-foreground-muted">
          Quantidade
          <input
            type="number"
            step="any"
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
            className={inputCls}
          />
        </label>

        {/* Unit price */}
        <label className="flex flex-col gap-1 text-xs text-foreground-muted">
          Preço unitário (USD)
          <input
            type="number"
            step="any"
            value={form.unit_price_usd}
            onChange={(e) => set("unit_price_usd", e.target.value)}
            className={inputCls}
          />
        </label>

        {/* Actual cost */}
        <label className="flex flex-col gap-1 text-xs text-foreground-muted">
          Custo real (USD)
          <input
            type="number"
            step="any"
            value={form.actual_cost_usd}
            onChange={(e) => set("actual_cost_usd", e.target.value)}
            className={inputCls}
            required
          />
        </label>

        {/* Notes */}
        <label className="flex flex-col gap-1 text-xs text-foreground-muted col-span-2">
          Notas
          <input
            type="text"
            placeholder="Dashboard Apify maio 2026"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className={inputCls}
          />
        </label>

        {/* Submit */}
        <div className="col-span-2 md:col-span-4 flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-accent-cyan/90 px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-cyan disabled:opacity-50"
          >
            {submitting ? "A gravar..." : "Gravar"}
          </button>
        </div>
      </form>
    </AdminCard>
  );
}
