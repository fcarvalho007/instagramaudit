/**
 * Minimal responsive table for the admin cockpit.
 *
 * Wraps a native <table> with horizontal scroll on small viewports and
 * uses border tokens so it inherits the editorial dark theme. Adiciona
 * uma sombra subtil à direita para sinalizar overflow horizontal em
 * mobile sem precisar de scroll para descobrir.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  className?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
}

export function DataTable<T>({ columns, rows, rowKey, empty }: DataTableProps<T>) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-elevated">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-base/30">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "text-eyebrow-sm px-3.5 py-3 text-[0.6875rem] text-content-secondary",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.align !== "right" && col.align !== "center" && "text-left",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-surface-base/40">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3.5 py-3 text-content-secondary",
                      col.align === "right" && "text-right tabular-nums",
                      col.align === "center" && "text-center",
                      col.className,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Sombra à direita: sinaliza scroll horizontal em mobile. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-6 rounded-r-lg bg-gradient-to-l from-surface-base/60 to-transparent sm:hidden"
      />
    </div>
  );
}
