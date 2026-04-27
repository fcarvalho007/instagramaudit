/**
 * Secção 5 — Sinais de intenção.
 * Duas colunas: pesquisas repetidas + últimos relatórios.
 */

import { AdminSectionHeader } from "../admin-section-header";
import { AdminCard } from "../admin-card";
import { AdminBadge } from "../admin-badge";
import {
  MOCK_INTENT_REPEATED,
  MOCK_RECENT_REPORTS,
} from "@/lib/admin/mock-data";

export function IntentSection() {
  return (
    <section>
      <AdminSectionHeader
        title="Sinais de intenção"
        subtitle="oportunidades quentes"
        accent="signal"
      />

      <div className="grid gap-3.5 grid-cols-1 lg:grid-cols-2">
        {/* Pesquisas repetidas */}
        <AdminCard>
          <CardHeader
            title="Pesquisas repetidas"
            eyebrowRight="leads quentes"
            subtitle="Mesmo perfil pesquisado várias vezes — sinal forte de intenção."
          />
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {MOCK_INTENT_REPEATED.map((row) => (
              <Row key={row.profile}>
                <div>
                  <p className="m-0 text-[13px] font-medium text-admin-text-primary">
                    {row.profile}
                  </p>
                  <p className="mt-px text-[11px] text-admin-text-secondary">
                    por{" "}
                    <span className="text-admin-text-primary">{row.lead}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="m-0 text-sm font-medium text-admin-signal-500">
                    {row.count}
                  </p>
                  <p className="mt-px text-[10px] text-admin-text-tertiary">
                    {row.time}
                  </p>
                </div>
              </Row>
            ))}
          </ul>
        </AdminCard>

        {/* Últimos relatórios */}
        <AdminCard>
          <CardHeader
            title="Últimos relatórios"
            eyebrowRight="todos ↗"
            subtitle="Pedidos pagos e seu estado de entrega."
          />
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {MOCK_RECENT_REPORTS.map((row) => (
              <Row key={row.profile}>
                <div>
                  <p className="m-0 text-[13px] font-medium text-admin-text-primary">
                    {row.profile}
                  </p>
                  <p className="mt-px text-[11px] text-admin-text-secondary">
                    <span className="text-admin-text-primary">
                      {row.customer}
                    </span>{" "}
                    · {row.plan}
                  </p>
                </div>
                <AdminBadge
                  variant={row.status === "entregue" ? "revenue" : "expense"}
                >
                  {row.status}
                </AdminBadge>
              </Row>
            ))}
          </ul>
        </AdminCard>
      </div>
    </section>
  );
}

function CardHeader({
  title,
  subtitle,
  eyebrowRight,
}: {
  title: string;
  subtitle: string;
  eyebrowRight: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between">
        <p className="m-0 text-sm font-medium text-admin-text-primary">
          {title}
        </p>
        <span className="text-[11px] text-admin-text-tertiary">
          {eyebrowRight}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-admin-text-tertiary">{subtitle}</p>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-admin-neutral-50 px-3 py-2.5">
      {children}
    </li>
  );
}