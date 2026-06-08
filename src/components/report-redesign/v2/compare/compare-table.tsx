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
  /**
   * Visual shell variant:
   * - "card" (default): self-contained `surface-secondary` shell with
   *   eyebrow header. Back-compat.
   * - "bare": no outer shell, no eyebrow, no caption. The parent
   *   `CompareCardShell` provides chrome, title, handle row and footer.
   */
  variant?: "card" | "bare";
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
  variant = "card",
}: CompareTableProps) {
  const body = (
    <>
      {/* Desktop: real table */}
      <table className="hidden sm:table w-full text-sm">
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
              className={cn(i > 0 && "border-t border-border-subtle/60")}
            >
              <th
                scope="row"
                className="py-3 pr-3 align-top text-sm text-content-secondary font-normal"
              >
                {row.label}
              </th>
              <td className="py-3 pr-3 align-top text-sm sm:text-base font-semibold tabular-nums text-content-primary">
                {row.primary}
              </td>
              <td className="py-3 align-top text-sm sm:text-base font-semibold tabular-nums text-content-primary">
                {row.competitor}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: stacked cards per row */}
      <ul className="space-y-3 sm:hidden">
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
    </>
  );

  if (variant === "bare") {
    return <div className="min-w-0">{body}</div>;
  }

  return (
    <section
      className="rounded-xl border border-border-default bg-surface-secondary p-4 sm:p-5"
      aria-label={`${label}: comparação com concorrente`}
    >
      <header className="flex flex-col gap-0.5">
        <span className="text-eyebrow-sm text-content-tertiary">{label}</span>
      </header>
      <div className="mt-3">{body}</div>
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
      <span
        className={cn(
          "inline-block pb-1.5 border-b-2 truncate max-w-full",
          accent === "primary"
            ? "border-accent-primary text-accent-primary"
            : "border-compare-competitor text-compare-competitor",
        )}
      >
        {children}
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
            accent === "primary" ? "bg-accent-primary" : "bg-compare-competitor",
          )}
        />
        @{handle}
      </dt>
      <dd className="text-sm text-content-primary min-w-0 flex-1">{value}</dd>
    </div>
  );
}