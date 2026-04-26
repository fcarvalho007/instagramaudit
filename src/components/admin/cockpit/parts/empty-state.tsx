/**
 * Empty state for cockpit panels — used when a list/table has no rows.
 *
 * Editorial Tech Noir: borda tracejada subtil, kicker mono, título display,
 * descrição operacional. Suporta um ícone opcional para reforçar a leitura
 * "isto é esperado" vs "isto é um problema".
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** "neutral" (defeito) — sem dados, sem juízo. "ok" — verde, reforça que é esperado. */
  tone?: "neutral" | "ok";
}

export function EmptyState({
  title,
  description,
  icon,
  tone = "neutral",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed bg-surface-elevated/40 px-6 py-5 text-center",
        tone === "ok" ? "border-signal-success/30" : "border-border-subtle",
      )}
    >
      {icon ? (
        <div
          className={cn(
            "mx-auto mb-3 flex size-9 items-center justify-center rounded-full",
            tone === "ok"
              ? "bg-signal-success/10 text-signal-success"
              : "bg-surface-base text-content-tertiary",
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-content-tertiary">
        Sem dados
      </p>
      <p className="mt-1.5 font-display text-base text-content-primary">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm text-content-secondary">
          {description}
        </p>
      ) : null}
    </div>
  );
}
