/**
 * Visão Geral · Secção 1 — Funil de conversão.
 *
 * Refinamento prompt 4: layout 2 colunas (gap 48).
 *   - Esquerda: SVG 400×280 com 3 trapézios e valores grandes em mono.
 *   - Direita: 3 stages em lista vertical (marker + label + valor + badge).
 *   - Linha-resumo abaixo (3 colunas com border-right).
 */

import { AdminSectionHeader } from "../admin-section-header";
import { AdminCard } from "../admin-card";
import { AdminInfoTooltip } from "../admin-info-tooltip";
import { MOCK_FUNNEL } from "@/lib/admin/mock-data";

const FUNNEL_TOOLTIP =
  "Mostra o percurso desde visitante anónimo até cliente pagante. As percentagens indicam a conversão entre cada etapa.";

const TOTALS_TOOLTIPS: Record<string, string> = {
  "Conversão total":
    "Percentagem de visitantes anónimos que se tornam clientes pagantes.",
  "Receita por lead":
    "Receita total dividida pelo número de leads. Mede o valor médio gerado por cada registo.",
  "Valor médio cliente":
    "Receita média gerada por cada cliente pagante nos últimos 30 dias.",
};

const STAGES = [
  {
    key: "visitors",
    label: "Visitantes anónimos",
    value: MOCK_FUNNEL.visitors.value,
    sub: "2.314 análises grátis feitas",
    markerColor: "#EEEDFE",
    rate: undefined,
  },
  {
    key: "leads",
    label: "Leads · registados",
    value: MOCK_FUNNEL.leads.value,
    sub: "registaram email",
    markerColor: "#AFA9EC",
    rate: MOCK_FUNNEL.visitorToLead.value,
  },
  {
    key: "customers",
    label: "Clientes · pagaram",
    value: MOCK_FUNNEL.customers.value,
    sub: "pelo menos uma compra",
    markerColor: "#534AB7",
    rate: MOCK_FUNNEL.leadToCustomer.value,
  },
];

export function FunnelSection() {
  return (
    <section>
      <AdminSectionHeader
        title="Funil de conversão"
        subtitle="últimos 30 dias"
        accent="leads"
        info={FUNNEL_TOOLTIP}
      />

      <AdminCard>
        <div
          className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]"
          style={{ minHeight: 280 }}
        >
          {/* SVG funnel */}
          <div
            role="img"
            aria-label={`Funil: ${MOCK_FUNNEL.visitors.value} visitantes → ${MOCK_FUNNEL.leads.value} leads → ${MOCK_FUNNEL.customers.value} clientes`}
            className="w-full"
          >
            <svg
              viewBox="0 0 400 280"
              preserveAspectRatio="xMidYMid meet"
              className="block w-full h-auto"
              aria-hidden="true"
            >
              {/* Topo */}
              <polygon
                points="20,30 380,30 320,100 80,100"
                fill="#EEEDFE"
              />
              <text
                x={200}
                y={72}
                fill="#26215C"
                fontFamily="JetBrains Mono, monospace"
                fontSize={22}
                fontWeight={500}
                letterSpacing="-0.02em"
                textAnchor="middle"
              >
                {MOCK_FUNNEL.visitors.value}
              </text>

              {/* Meio */}
              <polygon
                points="80,110 320,110 260,180 140,180"
                fill="#AFA9EC"
              />
              <text
                x={200}
                y={152}
                fill="#26215C"
                fontFamily="JetBrains Mono, monospace"
                fontSize={22}
                fontWeight={500}
                letterSpacing="-0.02em"
                textAnchor="middle"
              >
                {MOCK_FUNNEL.leads.value}
              </text>

              {/* Base */}
              <polygon
                points="140,190 260,190 220,260 180,260"
                fill="#534AB7"
              />
              <text
                x={200}
                y={232}
                fill="#FFFFFF"
                fontFamily="JetBrains Mono, monospace"
                fontSize={22}
                fontWeight={500}
                letterSpacing="-0.02em"
                textAnchor="middle"
              >
                {MOCK_FUNNEL.customers.value}
              </text>
            </svg>
          </div>

          {/* Lista de stages */}
          <ul className="m-0 flex list-none flex-col p-0">
            {STAGES.map((stage, i) => (
              <li
                key={stage.key}
                className="flex items-start gap-4"
                style={{
                  padding: "14px 0",
                  borderTop:
                    i === 0
                      ? "none"
                      : "1px solid var(--color-admin-border)",
                }}
              >
                <span
                  aria-hidden="true"
                  className="shrink-0"
                  style={{
                    width: 6,
                    height: 36,
                    borderRadius: 2,
                    backgroundColor: stage.markerColor,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="m-0 text-admin-text-secondary"
                    style={{ fontSize: 13 }}
                  >
                    {stage.label}
                  </p>
                  <p
                    className="m-0 admin-num font-medium text-admin-text-primary"
                    style={{
                      fontSize: 28,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.1,
                      marginTop: 2,
                    }}
                  >
                    {stage.value}
                  </p>
                  <p
                    className="m-0 text-admin-text-tertiary"
                    style={{ fontSize: 11, marginTop: 4 }}
                  >
                    {stage.sub}
                  </p>
                </div>
                {stage.rate ? (
                  <span
                    className="shrink-0 admin-num"
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      padding: "4px 10px",
                      borderRadius: 10,
                      backgroundColor: "var(--admin-bg-subtle)",
                      color: "var(--color-admin-text-secondary)",
                    }}
                  >
                    ↓ {stage.rate}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        {/* Linha-resumo: 3 colunas com border-right */}
        <div
          className="mt-7 grid grid-cols-1 sm:grid-cols-3"
          style={{
            borderTop: "1px solid var(--color-admin-border)",
            paddingTop: 24,
          }}
        >
          {MOCK_FUNNEL.totals.map((cell, i) => (
            <div
              key={cell.eyebrow}
              className="sm:border-r sm:border-admin-border sm:last:border-r-0"
              style={{
                padding:
                  i === 0 ? "0 24px 0 0" : i === 2 ? "0 0 0 24px" : "0 24px",
              }}
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <p className="admin-eyebrow">{cell.eyebrow}</p>
                {TOTALS_TOOLTIPS[cell.eyebrow] ? (
                  <AdminInfoTooltip text={TOTALS_TOOLTIPS[cell.eyebrow]!} />
                ) : null}
              </div>
              <p
                className="m-0 admin-num font-medium text-admin-text-primary"
                style={{
                  fontSize: 28,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {cell.value}
              </p>
              <p
                className="m-0 text-admin-text-tertiary"
                style={{ fontSize: 12, marginTop: 6 }}
              >
                {cell.sub}
              </p>
            </div>
          ))}
        </div>
      </AdminCard>
    </section>
  );
}