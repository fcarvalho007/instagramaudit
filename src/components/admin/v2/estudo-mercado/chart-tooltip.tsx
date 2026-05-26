/**
 * Tooltip Recharts partilhado para os gráficos do /admin/estudo-mercado.
 * Fundo branco, borda admin-border, sombra subtil, Inter tabular-nums.
 */

import type { TooltipProps } from "recharts";

export function ChartTooltip({
  active,
  payload,
  label,
  valueSuffix = "",
}: TooltipProps<number, string> & { valueSuffix?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-md border bg-white px-3 py-2 text-[12px] shadow-sm"
      style={{ borderColor: "rgb(var(--admin-border))" }}
    >
      {label !== undefined && label !== null ? (
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-admin-text-secondary">
          {label}
        </div>
      ) : null}
      <ul className="m-0 list-none p-0 space-y-0.5">
        {payload.map((p, idx) => (
          <li
            key={`${p.dataKey ?? "k"}-${idx}`}
            className="flex items-center gap-2 text-admin-text-primary"
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: (p.color ?? p.fill ?? "#888") as string }}
            />
            <span className="text-admin-text-secondary">{p.name ?? p.dataKey}</span>
            <span className="ml-auto tabular-nums font-semibold">
              {p.value === null || p.value === undefined ? "—" : `${p.value}${valueSuffix}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}