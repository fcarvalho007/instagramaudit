/**
 * Secção 4 — Clientes kanban.
 *
 * Grelha 4 colunas. Cada coluna é um cartão branco com border-top 2px
 * colorida + radius só nos cantos inferiores. Header com título + subtítulo
 * + AdminBadge (contador). 3 cartões mock por coluna em fundo neutro.
 */

import { AdminSectionHeader } from "../admin-section-header";
import { AdminBadge } from "../admin-badge";
import {
  ACCENT_500,
  ADMIN_BORDER,
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
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {MOCK_KANBAN.map((col) => (
          <KanbanColumn key={col.id} col={col} />
        ))}
      </div>
    </section>
  );
}

function KanbanColumn({
  col,
}: {
  col: (typeof MOCK_KANBAN)[number];
}) {
  const accent = col.accent as AdminAccent;
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: ADMIN_BORDER,
        borderTop: `2px solid ${ACCENT_500[accent]}`,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        padding: 12,
      }}
    >
      <div
        className="flex items-start justify-between gap-2"
        style={{ marginBottom: 12 }}
      >
        <div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "rgb(var(--admin-neutral-900))",
              margin: 0,
            }}
          >
            {col.title}
          </p>
          <p
            style={{
              fontSize: 11,
              color: "rgb(var(--admin-neutral-400))",
              marginTop: 2,
            }}
          >
            {col.subtitle}
          </p>
        </div>
        <AdminBadge variant={accent}>{col.count}</AdminBadge>
      </div>

      <div className="flex flex-col gap-1.5">
        {col.items.map((item) => (
          <div
            key={item.name}
            style={{
              backgroundColor: "rgb(var(--admin-neutral-50))",
              borderRadius: 6,
              padding: "8px 10px",
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "rgb(var(--admin-neutral-900))",
                margin: 0,
              }}
            >
              {item.name}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "rgb(var(--admin-neutral-600))",
                marginTop: 1,
              }}
            >
              {item.meta}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}