/**
 * Cartão de edição dos planos de preços usado em /admin/estudo-mercado.
 * Lê e grava em `public.pricing_plans` via /api/admin/pricing-plans
 * (gate admin via X-Admin-Email). Sem hardcode: a UI pública lê desta
 * mesma tabela através do hook `usePricing`.
 */

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { AdminCard } from "@/components/admin/v2/admin-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminFetch } from "@/lib/admin/fetch";
import { formatPrice } from "@/lib/pricing/pricing-types";

interface PlanRow {
  key: "single_report" | "pack_5_reports";
  label: string;
  price_cents: number;
  currency: string;
  unit_label: string | null;
  sort_order: number;
  active: boolean;
  updated_at: string;
  updated_by_email: string | null;
}

export function PricingEditorCard() {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "pricing-plans"],
    queryFn: async (): Promise<PlanRow[]> => {
      const res = await adminFetch("/api/admin/pricing-plans");
      if (!res.ok) throw new Error("Falha a carregar planos");
      const body = (await res.json()) as { ok: boolean; plans: PlanRow[] };
      return body.plans ?? [];
    },
  });

  return (
    <AdminCard>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="m-0 text-[14px] font-semibold text-admin-text-primary">
            Preços ativos
          </h3>
          <p className="m-0 mt-0.5 text-[12px] text-admin-text-secondary">
            Estes valores são lidos pelo modal de interesse, pela página de preços
            e por todos os cartões públicos. Editar aqui atualiza tudo.
          </p>
        </div>
      </div>
      {isLoading || !data ? (
        <div className="text-[13px] text-admin-text-secondary">A carregar planos…</div>
      ) : (
        <div className="space-y-3">
          {data.map((plan) => (
            <PlanRowEditor
              key={plan.key}
              plan={plan}
              onSaved={async () => {
                await refetch();
                await qc.invalidateQueries({ queryKey: ["public-pricing"] });
              }}
            />
          ))}
        </div>
      )}
    </AdminCard>
  );
}

function PlanRowEditor({
  plan,
  onSaved,
}: {
  plan: PlanRow;
  onSaved: () => Promise<void> | void;
}) {
  const [label, setLabel] = useState(plan.label);
  const [priceCents, setPriceCents] = useState<number>(plan.price_cents);
  const [unitLabel, setUnitLabel] = useState(plan.unit_label ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setLabel(plan.label);
    setPriceCents(plan.price_cents);
    setUnitLabel(plan.unit_label ?? "");
  }, [plan.key, plan.label, plan.price_cents, plan.unit_label]);

  const dirty =
    label !== plan.label ||
    priceCents !== plan.price_cents ||
    (unitLabel || null) !== (plan.unit_label || null);

  const onSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await adminFetch("/api/admin/pricing-plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: plan.key,
          label: label.trim(),
          price_cents: priceCents,
          unit_label: unitLabel.trim() ? unitLabel.trim() : null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !body.ok) {
        setFeedback({ tone: "err", text: "Não foi possível guardar." });
      } else {
        setFeedback({ tone: "ok", text: "Guardado." });
        await onSaved();
      }
    } catch {
      setFeedback({ tone: "err", text: "Erro de rede." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-admin-border bg-white px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wide font-semibold text-admin-text-secondary">
          {plan.key}
        </span>
        <span className="text-[12px] text-admin-text-secondary tabular-nums">
          Atual: {formatPrice(plan.price_cents, plan.currency)}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_1fr_auto] gap-2 items-end">
        <div>
          <Label htmlFor={`label-${plan.key}`} className="text-[12px]">Etiqueta</Label>
          <Input
            id={`label-${plan.key}`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={120}
          />
        </div>
        <div>
          <Label htmlFor={`price-${plan.key}`} className="text-[12px]">Preço (cêntimos)</Label>
          <Input
            id={`price-${plan.key}`}
            type="number"
            inputMode="numeric"
            min={0}
            value={priceCents}
            onChange={(e) => setPriceCents(Number(e.target.value) || 0)}
            className="tabular-nums"
          />
        </div>
        <div>
          <Label htmlFor={`unit-${plan.key}`} className="text-[12px]">Unidade (opcional)</Label>
          <Input
            id={`unit-${plan.key}`}
            value={unitLabel}
            onChange={(e) => setUnitLabel(e.target.value)}
            placeholder="ex.: 5,60€/relatório"
            maxLength={120}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            disabled={!dirty || saving || label.trim().length === 0}
            onClick={onSave}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Guardar"}
          </Button>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-admin-text-secondary tabular-nums">
          Novo: {formatPrice(priceCents, plan.currency)}
          {plan.updated_by_email ? ` · por ${plan.updated_by_email}` : ""}
        </span>
        {feedback ? (
          <span
            className={
              feedback.tone === "ok"
                ? "text-signal-success"
                : "text-signal-danger"
            }
          >
            {feedback.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}