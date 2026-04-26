/**
 * Secção 5 — Sinais de intenção.
 *
 * Grelha 2 colunas iguais.
 *   - Esquerda: pesquisas repetidas (perfil + lead + contador coral + tempo).
 *   - Direita: últimos relatórios (perfil + cliente + plano + badge estado).
 */

import { AdminSectionHeader } from "../admin-section-header";
import { AdminBadge } from "../admin-badge";
import { ADMIN_BORDER } from "../admin-tokens";
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
        }}
      >
        {/* Pesquisas repetidas */}
        <Card>
          <CardHeader
            title="Pesquisas repetidas"
            eyebrowRight="leads quentes"
            subtitle="Mesmo perfil pesquisado várias vezes — sinal forte de intenção."
          />
          <div className="flex flex-col gap-1.5">
            {MOCK_INTENT_REPEATED.map((row) => (
              <Row key={row.profile}>
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "rgb(var(--admin-neutral-900))",
                      margin: 0,
                    }}
                  >
                    {row.profile}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgb(var(--admin-neutral-600))",
                      marginTop: 1,
                    }}
                  >
                    por{" "}
                    <span style={{ color: "rgb(var(--admin-neutral-900))" }}>
                      {row.lead}
                    </span>
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "rgb(var(--admin-signal-500))",
                      margin: 0,
                    }}
                  >
                    {row.count}
                  </p>
                  <p
                    style={{
                      fontSize: 10,
                      color: "rgb(var(--admin-neutral-400))",
                      marginTop: 1,
                    }}
                  >
                    {row.time}
                  </p>
                </div>
              </Row>
            ))}
          </div>
        </Card>

        {/* Últimos relatórios */}
        <Card>
          <CardHeader
            title="Últimos relatórios"
            eyebrowRight="todos ↗"
            subtitle="Pedidos pagos e seu estado de entrega."
          />
          <div className="flex flex-col gap-1.5">
            {MOCK_RECENT_REPORTS.map((row) => (
              <Row key={row.profile}>
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "rgb(var(--admin-neutral-900))",
                      margin: 0,
                    }}
                  >
                    {row.profile}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgb(var(--admin-neutral-600))",
                      marginTop: 1,
                    }}
                  >
                    <span style={{ color: "rgb(var(--admin-neutral-900))" }}>
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
          </div>
        </Card>
      </div>
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: ADMIN_BORDER,
        borderRadius: 12,
        padding: "1.25rem 1.5rem",
      }}
    >
      {children}
    </div>
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
    <div style={{ marginBottom: 12 }}>
      <div className="flex items-center justify-between">
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "rgb(var(--admin-neutral-900))",
            margin: 0,
          }}
        >
          {title}
        </p>
        <span
          style={{
            fontSize: 11,
            color: "rgb(var(--admin-neutral-400))",
          }}
        >
          {eyebrowRight}
        </span>
      </div>
      <p
        style={{
          fontSize: 11,
          color: "rgb(var(--admin-neutral-400))",
          marginTop: 4,
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between gap-3"
      style={{
        backgroundColor: "rgb(var(--admin-neutral-50))",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      {children}
    </div>
  );
}