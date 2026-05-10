/**
 * StageConnector — seta vertical entre `StageGroup`s.
 */

export function StageConnector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1.5" aria-hidden>
      <span
        className="block w-px h-4"
        style={{ background: "rgb(var(--admin-border-default))" }}
      />
      {label && (
        <span className="my-1 rounded-full border bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-admin-text-tertiary"
          style={{ borderColor: "rgb(var(--admin-border-default))" }}
        >
          {label}
        </span>
      )}
      <span
        className="block w-px h-4"
        style={{ background: "rgb(var(--admin-border-default))" }}
      />
    </div>
  );
}