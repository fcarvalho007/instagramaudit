/**
 * Secção 1 — Funil de conversão.
 *
 * SVG inline 600×200 com 3 polígonos trapezoidais. Texto sobreposto
 * absoluto em cada camada com flex space-between.
 * Grelha 3-col abaixo (Conversão total, Receita por lead, Valor médio
 * cliente) com 1px gap entre células para efeito separador.
 */

import { AdminSectionHeader } from "../admin-section-header";
import { ADMIN_BORDER, ADMIN_LITERAL } from "../admin-tokens";
import { MOCK_FUNNEL } from "@/lib/admin/mock-data";

export function FunnelSection() {
  return (
    <section>
      <AdminSectionHeader
        title="Funil de conversão"
        subtitle="últimos 30 dias"
        accent="leads"
      />

      <div
        style={{
          backgroundColor: "#ffffff",
          border: ADMIN_BORDER,
          borderRadius: 12,
          padding: "1.5rem 1.75rem",
        }}
      >
        <FunnelDiagram />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1,
            marginTop: 24,
            backgroundColor: "rgb(var(--admin-neutral-100))",
            borderRadius: 8,
            overflow: "hidden",
            border: ADMIN_BORDER,
          }}
        >
          {MOCK_FUNNEL.totals.map((cell) => (
            <div
              key={cell.eyebrow}
              style={{
                backgroundColor: "#ffffff",
                padding: "14px 16px",
              }}
            >
              <p className="admin-eyebrow" style={{ marginBottom: 6 }}>
                {cell.eyebrow}
              </p>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  color: "rgb(var(--admin-neutral-900))",
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                {cell.value}
              </p>
              <p
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: "rgb(var(--admin-neutral-400))",
                }}
              >
                {cell.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FunnelDiagram() {
  return (
    <div
      role="img"
      aria-label={`Funil de conversão: ${MOCK_FUNNEL.visitors.value} visitantes, ${MOCK_FUNNEL.leads.value} leads, ${MOCK_FUNNEL.customers.value} clientes`}
      style={{ position: "relative", width: "100%", height: 200 }}
    >
      <svg
        viewBox="0 0 600 200"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        aria-hidden="true"
      >
        <polygon
          points="0,30 600,30 540,80 60,80"
          fill={ADMIN_LITERAL.funnelTop}
        />
        <polygon
          points="60,90 540,90 460,140 140,140"
          fill={ADMIN_LITERAL.funnelMid}
        />
        <polygon
          points="140,150 460,150 400,195 200,195"
          fill={ADMIN_LITERAL.funnelBase}
        />
      </svg>

      <FunnelLayerLabel
        top="30px"
        height="50px"
        left={MOCK_FUNNEL.visitors}
        right={MOCK_FUNNEL.freeAnalyses}
        textColor={ADMIN_LITERAL.funnelBaseText}
        eyebrowColor={ADMIN_LITERAL.funnelEyebrow}
        paddingX="60px"
      />
      <FunnelLayerLabel
        top="90px"
        height="50px"
        left={MOCK_FUNNEL.leads}
        right={MOCK_FUNNEL.visitorToLead}
        textColor={ADMIN_LITERAL.funnelBaseText}
        eyebrowColor={ADMIN_LITERAL.funnelEyebrow}
        paddingX="160px"
      />
      <FunnelLayerLabel
        top="150px"
        height="45px"
        left={MOCK_FUNNEL.customers}
        right={MOCK_FUNNEL.leadToCustomer}
        textColor="#FFFFFF"
        eyebrowColor={ADMIN_LITERAL.funnelLightEyebrow}
        paddingX="220px"
      />
    </div>
  );
}

function FunnelLayerLabel({
  top,
  height,
  left,
  right,
  textColor,
  eyebrowColor,
  paddingX,
}: {
  top: string;
  height: string;
  left: { eyebrow: string; value: string };
  right: { eyebrow: string; value: string };
  textColor: string;
  eyebrowColor: string;
  paddingX: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        height,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingLeft: paddingX,
        paddingRight: paddingX,
        pointerEvents: "none",
      }}
    >
      <div>
        <p
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: eyebrowColor,
            margin: 0,
          }}
        >
          {left.eyebrow}
        </p>
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: textColor,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {left.value}
        </p>
      </div>
      <div style={{ textAlign: "right" }}>
        <p
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: eyebrowColor,
            margin: 0,
          }}
        >
          {right.eyebrow}
        </p>
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: textColor,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {right.value}
        </p>
      </div>
    </div>
  );
}