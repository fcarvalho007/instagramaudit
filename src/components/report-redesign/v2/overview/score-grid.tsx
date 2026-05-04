import type { ReactNode } from "react";

interface SummaryGridProps {
  children: ReactNode;
}

/**
 * Unified 6-card summary grid. Renders children in a 2-col (mobile)
 * / 3-col (sm+) grid with consistent spacing. No labels, legends
 * or dividers — the block title is handled by the parent.
 */
export function SummaryGrid({ children }: SummaryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
      {children}
    </div>
  );
}
