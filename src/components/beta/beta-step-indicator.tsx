/**
 * Step indicator for the beta request form.
 * Shows 3 steps with active/completed states.
 */

import { Check } from "lucide-react";

const STEPS = [
  { label: "Perfil", num: 1 },
  { label: "Contexto", num: 2 },
  { label: "Submeter", num: 3 },
];

export function BetaStepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, i) => {
        const isCompleted = step.num < current;
        const isActive = step.num === current;
        return (
          <div key={step.num} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-8 transition-colors ${
                  isCompleted ? "bg-accent-primary" : "bg-border-subtle"
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all ${
                  isCompleted
                    ? "bg-accent-primary text-surface-base"
                    : isActive
                      ? "border-2 border-accent-primary text-accent-primary"
                      : "border border-border-subtle text-text-muted"
                }`}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.num}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  isActive ? "text-text-primary" : "text-text-muted"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}