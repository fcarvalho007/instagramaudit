/**
 * Secção 4 — Clientes kanban.
 *
 * 4 colunas. Cada coluna tem border-top colorida (única portadora de
 * cor temática) + lista semântica `<ul>/<li>`.
 */

import { AdminSectionHeader } from "../admin-section-header";
import { AdminBadge } from "../admin-badge";
import {
  ACCENT_500,
  type AdminAccent,
} from "../admin-tokens";
import { MOCK_KANBAN } from "@/lib/admin/mock-data";

export function KanbanSection() {
  return (
    <section>
      <AdminSectionHeader
        title="Clientes — kanban"
        subtitle="pipeline de relação"
        accent="leads"
        info="Pipeline de relação com cada utilizador. Move-se da esquerda (lead) para a direita (subscritor)."
      />

      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {MOCK_KANBAN.map((col) => (
          <KanbanColumn key={col.id} col={col} />
        ))}
      </div>
    </section>
  );
}

function KanbanColumn({ col }: { col: (typeof MOCK_KANBAN)[number] }) {
  const accent = col.accent as AdminAccent;
  return (
    <article
      className="rounded-b-xl border border-t-0 border-admin-border bg-admin-surface p-3"
      style={{ borderTop: `2px solid ${ACCENT_500[accent]}` }}
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="m-0 text-[13px] font-medium text-admin-text-primary">
            {col.title}
          </p>
          <p className="mt-0.5 text-[11px] text-admin-text-tertiary">
            {col.subtitle}
          </p>
        </div>
        <AdminBadge variant={accent}>{col.count}</AdminBadge>
      </header>

      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {col.items.map((item) => (
          <li
            key={item.name}
            className="rounded-md bg-admin-neutral-50 px-2.5 py-2"
          >
            <p className="m-0 text-xs font-medium text-admin-text-primary">
              {item.name}
            </p>
            <p className="mt-px text-[11px] text-admin-text-secondary">
              {item.meta}
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}