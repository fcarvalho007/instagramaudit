/**
 * Clientes · Secção 3 — Ficha do cliente seleccionado.
 *
 * Header (avatar + nome + plano + acções) → grelha 4 KPIs (com barras de
 * saúde) → 2 colunas (timeline + perfis/notas).
 */

import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { AdminBadge } from "../admin-badge";
import { AdminAvatar } from "../admin-avatar";
import { AdminActionButton } from "../admin-action-button";
import { KPICard } from "../kpi-card";
import {
  MOCK_SELECTED_CUSTOMER,
  MOCK_CUSTOMER_ACTIVITY,
  MOCK_CUSTOMER_PROFILES,
  MOCK_CUSTOMER_NOTES,
  type CustomerActivityType,
} from "@/lib/admin/mock-data";

function dotStyle(type: CustomerActivityType): React.CSSProperties {
  switch (type) {
    case "payment":
      return { backgroundColor: "#1D9E75" };
    case "report":
      return { backgroundColor: "#534AB7" };
    case "subscription_started":
      return { backgroundColor: "#97C459" };
    case "free_analysis":
    default:
      return {
        backgroundColor: "rgb(var(--admin-neutral-50))",
        borderColor: "rgb(var(--admin-neutral-200))",
      };
  }
}

function HealthBars({
  filled,
  total,
}: {
  filled: number;
  total: number;
}) {
  return (
    <div
      className="flex items-center"
      style={{ gap: 3 }}
      aria-label={`Saúde ${filled} de ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="rounded-[1px]"
          style={{
            width: 16,
            height: 5,
            backgroundColor:
              i < filled
                ? "#1D9E75"
                : "rgb(var(--admin-neutral-200))",
          }}
        />
      ))}
    </div>
  );
}

export function CustomerCardSection() {
  const c = MOCK_SELECTED_CUSTOMER;

  return (
    <section>
      <AdminSectionHeader
        title={`Ficha · ${c.name}`}
        subtitle="selecionada na tabela acima"
        accent="leads"
        info="Vista detalhada do cliente seleccionado: KPIs de saúde, timeline de actividade, perfis analisados e notas internas."
      />
      <AdminCard className="!px-8 !py-7">
        {/* Header da ficha */}
        <div className="mb-7 flex flex-wrap items-center gap-5">
          <AdminAvatar
            initials={c.initials}
            variant="leads"
            size={64}
            ariaLabel={c.name}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-3">
              <h3
                className="m-0 font-medium text-admin-text-primary"
                style={{
                  fontSize: 22,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                {c.name}
              </h3>
              <AdminBadge variant="revenue">{c.planLabel}</AdminBadge>
              <span className="text-[12px] text-admin-text-tertiary">
                {c.since}
              </span>
            </div>
            <p className="mt-1.5 mb-0 text-[13px] text-admin-text-secondary">
              {c.email} · {c.location}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AdminActionButton>Enviar email</AdminActionButton>
            <AdminActionButton>Oferecer upgrade</AdminActionButton>
          </div>
        </div>

        {/* 4 KPIs do cliente — usa o primitivo KPICard size="md" */}
        <div className="mb-7 grid gap-3 grid-cols-2 lg:grid-cols-4">
          {c.kpis.map((k) => {
            const hasBars = "bars" in k && k.bars;
            return (
              <KPICard
                key={k.eyebrow}
                size="md"
                eyebrow={k.eyebrow}
                value={
                  hasBars ? (
                    <span className="inline-flex items-center gap-2.5">
                      <span>{k.value}</span>
                      <HealthBars
                        filled={k.bars!.filled}
                        total={k.bars!.total}
                      />
                    </span>
                  ) : (
                    k.value
                  )
                }
                sub={k.sub}
              />
            );
          })}
        </div>

        {/* 2 colunas: timeline + perfis/notas */}
        <div
          className="grid gap-8"
          style={{ gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)" }}
        >
          {/* Coluna esquerda — timeline */}
          <div>
            <h4 className="m-0 mb-4 text-[13px] font-medium text-admin-text-primary">
              Timeline de actividade
            </h4>
            <div className="relative" style={{ paddingLeft: 22 }}>
              <span
                aria-hidden="true"
                className="absolute"
                style={{
                  left: 6,
                  top: 8,
                  bottom: 8,
                  width: 1,
                  backgroundColor: "var(--color-admin-border)",
                }}
              />
              {MOCK_CUSTOMER_ACTIVITY.map((ev, i) => {
                const isLast = i === MOCK_CUSTOMER_ACTIVITY.length - 1;
                const baseDot: React.CSSProperties = {
                  position: "absolute",
                  left: -22,
                  top: 5,
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  boxShadow: "0 0 0 2px var(--admin-bg-canvas)",
                };
                return (
                  <div
                    key={i}
                    className="relative"
                    style={{ marginBottom: isLast ? 0 : 18 }}
                  >
                    <span
                      aria-hidden="true"
                      style={{ ...baseDot, ...dotStyle(ev.type) }}
                    />
                    <p className="m-0 text-[13px] text-admin-text-primary">
                      {ev.title}
                    </p>
                    <p className="m-0 mt-0.5 text-[11px] text-admin-text-secondary">
                      {ev.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna direita — perfis + notas */}
          <div>
            <div className="mb-6">
              <h4 className="m-0 mb-3 text-[13px] font-medium text-admin-text-primary">
                Perfis analisados
              </h4>
              <ul className="m-0 list-none p-0 flex flex-col gap-2">
                {MOCK_CUSTOMER_PROFILES.map((p) => (
                  <li
                    key={p.handle}
                    className="flex items-center justify-between gap-2 rounded-md"
                    style={{
                      padding: "12px 14px",
                      backgroundColor: "var(--admin-bg-subtle)",
                    }}
                  >
                    <div className="min-w-0">
                      <p className="m-0 text-[13px] text-admin-text-primary">
                        {p.handle}
                      </p>
                      <p className="m-0 mt-0.5 text-[11px] text-admin-text-secondary">
                        {p.classification}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`m-0 admin-num text-[13px] ${
                          p.countMuted
                            ? "text-admin-text-secondary"
                            : "font-medium text-admin-text-primary"
                        }`}
                      >
                        {p.count}
                      </p>
                      <p className="m-0 mt-0.5 text-[11px] text-admin-text-tertiary">
                        {p.when}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="m-0 mb-3 text-[13px] font-medium text-admin-text-primary">
                Notas internas
              </h4>
              {MOCK_CUSTOMER_NOTES.map((n) => (
                <div
                  key={n.title}
                  className="rounded-r-md"
                  style={{
                    borderLeft: "3px solid #D4537E",
                    backgroundColor: "#FBEAF0",
                    padding: "14px 16px",
                  }}
                >
                  <p
                    className="m-0 text-[12px] font-medium"
                    style={{ color: "#72243E" }}
                  >
                    {n.title}
                  </p>
                  <p
                    className="m-0 mt-1 text-[12px] leading-relaxed"
                    style={{ color: "#4B1528" }}
                  >
                    {n.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminCard>
    </section>
  );
}