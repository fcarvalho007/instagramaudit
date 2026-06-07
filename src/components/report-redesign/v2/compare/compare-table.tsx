import { cn } from "@/lib/utils";
import type { CompareTableRow } from "./compare-types";

interface CompareTableProps {
  /** Eyebrow / label above the table (e.g. "Estilo de comunicação"). */
  label: string;
  primaryHandle: string;
  competitorHandle: string;
  rows: CompareTableRow[];
  /** Optional caption shown under the table for context / limitations. */
  caption?: string;
}

/**
 * Padrão 3 — qualitative comparison.
 *
 * Compact 3-column table: deterministic row label + one column per
 * profile. Mobile collapses each row into a stacked card so the layout
 * stays readable at ≤360 px without horizontal scroll.
 */
export function CompareTable({
  label,
  primaryHandle,
  competitorHandle,
  rows,
  caption,
}: CompareTableProps) {
  return (
    <section
      className="rounded-xl border border-border-default bg-surface-secondary p-4 sm:p-5"
      aria-label={`${label}: comparação com concorrente`}
    >
      <header className="flex flex-col gap-0.5">
        <span className="text-eyebrow-sm text-content-tertiary">{label}</span>
      </header>

      {/* Desktop: real table */}
      <table className="mt-3 hidden sm:table w-full text-sm">
        <thead>
          <tr className="text-left text-eyebrow-sm text-content-tertiary border-b border-border-subtle">
            <th scope="col" className="py-2 pr-3 w-1/3 font-normal">
              Critério
            </th>
            <Th accent="primary">@{primaryHandle}</Th>
            <Th accent="secondary">@{competitorHandle}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.label}
              className={cn(
                i > 0 && "border-t border-border-subtle/60",
              )}
            >
              <th
                scope="row"
                className="py-2.5 pr-3 align-top text-xs text-content-secondary font-normal"
              >
                {row.label}
              </th>
              <td className="py-2.5 pr-3 align-top text-content-primary">
                {row.primary}
              </td>
              <td className="py-2.5 align-top text-content-primary">
                {row.competitor}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: stacked cards per row */}
      <ul className="mt-3 space-y-3 sm:hidden">
        {rows.map((row) => (
          <li
            key={row.label}
            className="rounded-lg border border-border-subtle bg-surface-primary p-3"
          >
            <span className="text-eyebrow-sm text-content-tertiary">
              {row.label}
            </span>
            <dl className="mt-2 grid grid-cols-1 gap-2">
              <MobileCell
                accent="primary"
                handle={primaryHandle}
                value={row.primary}
              />
              <MobileCell
                accent="secondary"
                handle={competitorHandle}
                value={row.competitor}
              />
            </dl>
          </li>
        ))}
      </ul>

      {caption ? (
        <p className="mt-3 text-xs text-content-tertiary leading-relaxed">
          {caption}
        </p>
      ) : null}
    </section>
  );
}

function Th({
  accent,
  children,
}: {
  accent: "primary" | "secondary";
  children: React.ReactNode;
}) {
  return (
    <th scope="col" className="py-2 pr-3 font-normal text-content-secondary">
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            accent === "primary" ? "bg-accent-primary" : "bg-accent-secondary",
          )}
        />
        <span className="truncate">{children}</span>
      </span>
    </th>
  );
}

function MobileCell({
  accent,
  handle,
  value,
}: {
  accent: "primary" | "secondary";
  handle: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="flex items-center gap-1.5 text-xs text-content-secondary shrink-0">
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            accent === "primary" ? "bg-accent-primary" : "bg-accent-secondary",
          )}
        />
        @{handle}
      </dt>
      <dd className="text-sm text-content-primary min-w-0 flex-1">{value}</dd>
    </div>
  );
}