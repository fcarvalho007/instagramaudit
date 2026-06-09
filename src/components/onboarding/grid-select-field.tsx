import type { LucideIcon } from "lucide-react";

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
}: {
  legend: string;
  name: string;
  options: GridSelectOption[];
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <fieldset className="space-y-2">
      {legend ? (
        <legend className="text-[13.5px] font-medium text-content-primary">
          {legend}
        </legend>
      ) : null}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          const Icon = opt.Icon;
          return (
            <label
              key={opt.value}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-1.5 min-h-[84px] px-2 py-3 rounded-xl border cursor-pointer transition-colors duration-150 text-center",
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
                  "size-5 transition-colors",
                  selected ? "text-primary" : "text-content-secondary",
                )}
                strokeWidth={1.75}
              />
              <span
                className={cn(
                  "text-[12.5px] leading-tight transition-colors",
                  selected
                    ? "text-primary font-medium"
                    : "text-content-secondary",
                )}
              >
                {opt.label}
              </span>
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