/**
 * Secção 1 — Funil de conversão.
 *
 * SVG 800×280 com 3 trapézios. Todos os labels (eyebrows + valores)
 * estão dentro do `<svg>` como `<text>` posicionados em coordenadas
 * relativas ao viewBox — escala correctamente em qualquer largura sem
 * distorção e sem overflow (preserveAspectRatio default = xMidYMid meet).
 *
 * Grelha 3-col abaixo com hairlines de 1px entre células.
 */

import { AdminCard } from "../admin-card";
import { AdminStat } from "../admin-stat";
import { AdminInfoTooltip } from "../admin-info-tooltip";
import { ADMIN_LITERAL } from "../admin-tokens";
import { AdminSectionHeader } from "../admin-section-header";
import { PaymentsPendingBanner } from "../payments-pending-banner";
import { useDemoMode } from "@/lib/admin/demo-mode";
import { MOCK_FUNNEL, ZERO_FUNNEL } from "@/lib/admin/mock-data";

const FUNNEL_TOTALS_INFO: Record<string, string> = {
  "Conversão total":
    "Percentagem de visitantes anónimos que se tornam clientes pagantes.",
  "Receita por lead":
    "Receita total dividida pelo número de leads. Mede o valor médio gerado por cada registo.",
  "Valor médio cliente":
    "Receita média gerada por cada cliente pagante nos últimos 30 dias.",
};

export function FunnelSection() {
  const { enabled: demo } = useDemoMode();
  const data = demo ? MOCK_FUNNEL : ZERO_FUNNEL;
  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader
        title="Funil de conversão"
        subtitle="últimos 30 dias"
        accent="leads"
        info="Mostra o percurso desde visitante anónimo até cliente pagante. As percentagens indicam a conversão entre cada etapa."
      />
      {!demo && (
        <PaymentsPendingBanner
          reason="O funil mostra-se a zero porque ainda não existem visitantes registados nem checkout ligado. Liga EuPago/Stripe para passar a contabilizar leads → clientes em tempo real."
        />
      )}
      <AdminCard className="!p-10">
        <FunnelDiagram data={data} />
      </AdminCard>

      <AdminCard>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-admin-border bg-admin-border sm:grid-cols-3">
          {data.totals.map((cell) => {
            const info = FUNNEL_TOTALS_INFO[cell.eyebrow];
            return (
              <div key={cell.eyebrow} className="bg-admin-surface p-4">
                <AdminStat
                  eyebrow={
                    info ? (
                      <span className="inline-flex items-center gap-1.5">
                        {cell.eyebrow}
                        <AdminInfoTooltip label={info} />
                      </span>
                    ) : (
                      cell.eyebrow
                    )
                  }
                  value={cell.value}
                  size="md"
                  sub={cell.sub}
                />
              </div>
            );
          })}
        </div>
      </AdminCard>
    </section>
  );
}

/**
 * SVG funnel — viewBox 800×280, 3 layers de 70px cada, gaps de 14px.
 * Textos dentro do SVG em coordenadas absolutas; escalam com o viewBox.
 */
function FunnelDiagram({ data }: { data: typeof MOCK_FUNNEL | typeof ZERO_FUNNEL }) {
  return (
    <div
      role="img"
      aria-label={`Funil: ${data.visitors.value} visitantes → ${data.leads.value} leads → ${data.customers.value} clientes`}
      className="w-full"
    >
      <svg
        viewBox="0 0 800 280"
        className="block w-full h-auto max-h-[260px]"
        aria-hidden="true"
      >
        {/* Layer 1: visitantes */}
        <polygon points="40,20 760,20 680,90 120,90" fill={ADMIN_LITERAL.funnelTop} />
        <FunnelText
          x={140}
          rightX={660}
          y={42}
          left={data.visitors}
          right={data.freeAnalyses}
          eyebrowFill={ADMIN_LITERAL.funnelEyebrow}
          textFill={ADMIN_LITERAL.funnelBaseText}
        />

        {/* Layer 2: leads */}
        <polygon points="120,108 680,108 580,178 220,178" fill={ADMIN_LITERAL.funnelMid} />
        <FunnelText
          x={240}
          rightX={560}
          y={130}
          left={data.leads}
          right={data.visitorToLead}
          eyebrowFill={ADMIN_LITERAL.funnelEyebrow}
          textFill={ADMIN_LITERAL.funnelBaseText}
        />

        {/* Layer 3: clientes */}
        <polygon points="180,196 620,196 540,260 260,260" fill={ADMIN_LITERAL.funnelBase} />
        <FunnelText
          x={280}
          rightX={520}
          y={218}
          left={data.customers}
          right={data.leadToCustomer}
          eyebrowFill={ADMIN_LITERAL.funnelLightEyebrow}
          textFill="#FFFFFF"
        />
      </svg>
    </div>
  );
}

function FunnelText({
  x,
  rightX,
  y,
  left,
  right,
  eyebrowFill,
  textFill,
}: {
  x: number;
  rightX: number;
  y: number;
  left: { eyebrow: string; value: string };
  right: { eyebrow: string; value: string };
  eyebrowFill: string;
  textFill: string;
}) {
  return (
    <>
      <text
        x={x}
        y={y}
        fill={eyebrowFill}
        fontFamily="JetBrains Mono, monospace"
        fontSize={10}
        letterSpacing="0.08em"
        style={{ textTransform: "uppercase" }}
      >
        {left.eyebrow.toUpperCase()}
      </text>
      <text
        x={x}
        y={y + 18}
        fill={textFill}
        fontFamily="Inter, sans-serif"
        fontSize={16}
        fontWeight={500}
      >
        {left.value}
      </text>

      <text
        x={rightX}
        y={y}
        fill={eyebrowFill}
        fontFamily="JetBrains Mono, monospace"
        fontSize={10}
        letterSpacing="0.08em"
        textAnchor="end"
      >
        {right.eyebrow.toUpperCase()}
      </text>
      <text
        x={rightX}
        y={y + 18}
        fill={textFill}
        fontFamily="Inter, sans-serif"
        fontSize={16}
        fontWeight={500}
        textAnchor="end"
      >
        {right.value}
      </text>
    </>
  );
}