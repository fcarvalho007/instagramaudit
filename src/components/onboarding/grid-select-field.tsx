import { Check, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface GridSelectOption {
  value: string;
  label: string;
  Icon: LucideIcon;
}

export function GridSelectField({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  compact = false,
  gridClassName,
  describedBy,
}: {
  legend: string;
  name: string;
  options: GridSelectOption[];
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
  /** Variante leve (loading, superfícies secundárias). */
  compact?: boolean;
  /** Sobrepõe a grelha de colunas por omissão. */
  gridClassName?: string;
  describedBy?: string;
}) {
  return (
    <fieldset className="space-y-2" aria-describedby={describedBy}>
      {legend ? (
        <legend
          className={cn(
            "font-medium text-content-primary",
            compact ? "text-[13px]" : "text-[13.5px]",
          )}
        >
          {legend}
        </legend>
      ) : null}
      <div
        className={cn(
          "grid gap-2",
          gridClassName ?? "grid-cols-2 sm:grid-cols-4",
        )}
      >
        {options.map((opt) => {
          const selected = value === opt.value;
          const Icon = opt.Icon;
          return (
            <label
              key={opt.value}
              className={cn(
                "group relative flex cursor-pointer rounded-xl border text-center transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.99]",
                compact
                  ? "flex-col items-center justify-center gap-1 min-h-[62px] px-2 py-2"
                  : "flex-col items-center justify-center gap-1.5 min-h-[84px] px-2 py-3",
                selected
                  ? "border-primary bg-primary/[0.08]"
                  : "border-border-default/60 bg-surface-base hover:border-border-default hover:bg-surface-muted/40",
              )}
            >

              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="sr-only peer"
              />
              <Icon
                aria-hidden
                className={cn(
                  "transition-colors",
                  compact ? "size-4" : "size-5",
                  selected ? "text-primary" : "text-content-secondary",
                )}
                strokeWidth={1.75}
              />
              <span
                className={cn(
                  "leading-tight transition-colors",
                  compact ? "text-xs" : "text-[12.5px]",
                  selected
                    ? "text-primary font-medium"
                    : "text-content-secondary",
                )}
              >
                {opt.label}
              </span>

              {selected ? (
                <Check
                  aria-hidden
                  className="pointer-events-none absolute right-1.5 top-1.5 size-3.5 text-primary"
                  strokeWidth={2.5}
                />
              ) : null}

              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-primary/40 ring-offset-2 ring-offset-surface-base opacity-0 peer-focus-visible:opacity-100"
              />
            </label>
          );
        })}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </fieldset>
  );
}