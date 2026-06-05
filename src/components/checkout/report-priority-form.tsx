import { cn } from "@/lib/utils";

export type ReportPriority =
  | "content"
  | "frequency"
  | "formats"
  | "comparison"
  | "recommendations";

const OPTIONS: { value: ReportPriority; label: string }[] = [
  { value: "content", label: "Conteúdo" },
  { value: "frequency", label: "Frequência" },
  { value: "formats", label: "Formatos" },
  { value: "comparison", label: "Comparação" },
  { value: "recommendations", label: "Recomendações" },
];

interface Props {
  value: ReportPriority | null;
  onChange: (v: ReportPriority) => void;
}

/**
 * Lightweight single-question qualification for the 9€ report checkout.
 * Renders 5 chip-style radios. Selection stored in payment metadata as
 * `report_priority` for downstream analytics.
 */
export function ReportPriorityForm({ value, onChange }: Props) {
  return (
    <fieldset className="rounded-xl border border-border-default bg-white p-5">
      <legend className="text-sm font-semibold text-content-primary px-1">
        O que queres perceber primeiro no relatório completo?
      </legend>
      <p className="mt-1 text-xs text-content-tertiary">
        Escolhe uma opção. Usamos para destacar essa secção primeiro.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors",
                checked
                  ? "border-accent-primary bg-accent-primary/10 text-content-primary ring-1 ring-accent-primary/30"
                  : "border-border-default bg-white text-content-secondary hover:border-content-tertiary",
              )}
            >
              <input
                type="radio"
                name="report_priority"
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}