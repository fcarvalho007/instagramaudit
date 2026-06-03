import { cn } from "@/lib/utils";

interface Props {
  step: number;
  total: number;
  labels: string[];
}

export function StepProgress({ step, total, labels }: Props) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 text-xs text-content-tertiary mb-2">
        <span className="font-semibold text-content-secondary tabular-nums">
          Passo {step} de {total}
        </span>
        <span aria-hidden="true">·</span>
        <span className="truncate">{labels[step - 1]}</span>
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i + 1 <= step ? "bg-accent-primary" : "bg-surface-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}