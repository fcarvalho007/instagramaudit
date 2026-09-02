import { BarChart3, Check, Lightbulb, Presentation, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/** Legacy single-value enum kept for backward-compat with payment metadata. */
export type ReportPriority =
  | "content"
  | "frequency"
  | "formats"
  | "comparison"
  | "recommendations";

/** New multi-select goals collected at checkout step 2. */
export type ReportGoal =
  | "compare_competitors"
  | "what_to_publish"
  | "what_works"
  | "present_to_client";

/**
 * Map each new goal to the closest legacy priority value so the existing
 * `report_priority` metadata field keeps working without enum changes.
 */
export const GOAL_TO_LEGACY_PRIORITY: Record<ReportGoal, ReportPriority> = {
  compare_competitors: "comparison",
  what_to_publish: "content",
  what_works: "formats",
  present_to_client: "recommendations",
};

type Option = {
  value: ReportGoal;
  label: string;
  description: string;
  Icon: typeof BarChart3;
};

const OPTIONS: Option[] = [
  {
    value: "compare_competitors",
    label: "Comparar-me com concorrentes",
    description: "Ver onde estou em relação ao mercado",
    Icon: BarChart3,
  },
  {
    value: "what_to_publish",
    label: "Saber o que publicar a seguir",
    description: "Ideias e formatos a testar",
    Icon: Lightbulb,
  },
  {
    value: "what_works",
    label: "Perceber o que está a funcionar",
    description: "Posts e formatos com melhor retorno",
    Icon: Sparkles,
  },
  {
    value: "present_to_client",
    label: "Mostrar a um cliente ou chefe",
    description: "Argumentos com dados",
    Icon: Presentation,
  },
];

interface Props {
  goals: ReportGoal[];
  onChange: (next: ReportGoal[]) => void;
}

/**
 * Multi-select goals for the 9€ report checkout (step 2).
 * Order is preserved by click order — first selected goal is treated as the
 * "principal" downstream (drives the legacy `report_priority` field and the
 * highlighted section in the generated report).
 */
export function ReportPriorityForm({ goals, onChange }: Props) {
  const toggle = (value: ReportGoal) => {
    if (goals.includes(value)) {
      onChange(goals.filter((g) => g !== value));
    } else {
      onChange([...goals, value]);
    }
  };

  return (
    <fieldset className="rounded-xl border border-border-default bg-white p-4 sm:p-5">
      <legend className="sr-only">Objectivos para o relatório</legend>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const checked = goals.includes(opt.value);
          const isPrimary = checked && goals[0] === opt.value;
          const Icon = opt.Icon;
          return (
            <label
              key={opt.value}
              className={cn(
                "group relative flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3.5 transition duration-150 ease-out active:scale-[0.99]",
                checked
                  ? "border-accent-primary ring-1 ring-accent-primary/30 shadow-sm"
                  : "border-border-default hover:border-content-tertiary hover:bg-surface-muted/40",
              )}
            >
              <input
                type="checkbox"
                name="report_goals"
                value={opt.value}
                checked={checked}
                onChange={() => toggle(opt.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-xl opacity-0 ring-2 ring-accent-primary/40 ring-offset-2 ring-offset-surface-base peer-focus-visible:opacity-100"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                  checked
                    ? "bg-accent-primary/10 text-accent-primary"
                    : "bg-surface-muted text-content-tertiary",
                )}
              >
                {checked ? <Check className="size-4" /> : <Icon className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-content-primary leading-snug">
                    {opt.label}
                  </span>
                  {isPrimary ? (
                    <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-eyebrow-sm text-accent-primary">
                      Principal
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-content-tertiary leading-relaxed">
                  {opt.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-content-tertiary">
        Podes escolher mais do que um. A primeira escolha conta como principal.
      </p>
    </fieldset>
  );
}