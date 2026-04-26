/**
 * Empty state for cockpit panels — used when a list/table has no rows.
 */

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border-subtle bg-surface-elevated/40 p-6 text-center">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
        Sem dados
      </p>
      <p className="mt-2 font-display text-base text-content-primary">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-content-secondary">{description}</p>
      ) : null}
    </div>
  );
}