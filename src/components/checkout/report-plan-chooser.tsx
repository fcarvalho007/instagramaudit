import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { PUBLIC_PRODUCTS, type ProductCode } from "@/lib/payments/products";

/**
 * Selector de plano para o checkout do relatório completo.
 * Três opções: 1 relatório · Pack 5 · Pack 10. Default = 1.
 * Não decide preço — apenas o `ProductCode` final, que o servidor valida
 * e mapeia para `SERVER_PRODUCTS.amountCents`.
 */

export type ReportPlanCode = Extract<
  ProductCode,
  "report_full_9" | "report_pack_5" | "report_pack_10"
>;

interface PlanOption {
  code: ReportPlanCode;
  title: string;
  unitCount: number;
  totalLabel: string;
  perReportLabel: string;
  strike?: string;
  badge?: string;
  bullets: string[];
}

const PLANS: PlanOption[] = [
  {
    code: "report_full_9",
    title: "1 relatório",
    unitCount: 1,
    totalLabel: "9€",
    perReportLabel: "9€ por relatório",
    bullets: ["Desbloqueio único", "Para um perfil"],
  },
  {
    code: "report_pack_5",
    title: "Pack 5 relatórios",
    unitCount: 5,
    totalLabel: "40€",
    perReportLabel: "8€ por relatório",
    strike: "45€",
    bullets: ["5 desbloqueios", "Perfis à escolha", "Sem expiração"],
  },
  {
    code: "report_pack_10",
    title: "Pack 10 relatórios",
    unitCount: 10,
    totalLabel: "72€",
    perReportLabel: "7,20€ por relatório",
    strike: "90€",
    badge: "Melhor valor",
    bullets: ["10 desbloqueios", "Perfis à escolha", "Sem expiração"],
  },
];

interface Props {
  value: ReportPlanCode;
  onChange: (code: ReportPlanCode) => void;
}

export function ReportPlanChooser({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Escolhe o plano"
      className="grid gap-3 sm:grid-cols-3"
    >
      {PLANS.map((plan) => {
        const selected = plan.code === value;
        return (
          <button
            key={plan.code}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(plan.code)}
            className={cn(
              "relative text-left rounded-xl border bg-white p-4 transition shadow-[0_18px_48px_-32px_rgba(15,23,42,0.18)]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40",
              selected
                ? "border-accent-primary ring-1 ring-accent-primary/30"
                : "border-border-default hover:border-content-tertiary/40",
            )}
          >
            {plan.badge ? (
              <span className="absolute -top-2 right-3 rounded-full bg-accent-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                {plan.badge}
              </span>
            ) : null}
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-content-primary">
                {plan.title}
              </p>
              {selected ? (
                <Check
                  aria-hidden="true"
                  className="size-4 text-accent-primary"
                />
              ) : null}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              {plan.strike ? (
                <span className="text-xs text-content-tertiary line-through tabular-nums">
                  {plan.strike}
                </span>
              ) : null}
              <span className="text-2xl font-bold text-content-primary tabular-nums leading-none">
                {plan.totalLabel}
              </span>
            </div>
            <p className="mt-1 text-xs text-content-tertiary">
              {plan.perReportLabel}
            </p>
            <ul className="mt-3 space-y-1">
              {plan.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-1.5 text-xs text-content-secondary"
                >
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-3 shrink-0 text-accent-primary"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}