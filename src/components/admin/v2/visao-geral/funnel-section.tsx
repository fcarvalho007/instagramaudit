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
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin/fetch";
import type { AdminPeriod } from "../period-select";

interface FunnelApiResponse {
  success: boolean;
  window_days: number;
  visitors: number | null;
  analyses: number;
  analyses_total?: number;
  analyses_fresh?: number;
  leads: number;
  customers: number;
  report_requests_total: number;
  lead_to_customer_pct: number | null;
}

type FunnelData = {
  visitors: { eyebrow: string; value: string };
  freeAnalyses: { eyebrow: string; value: string };
  leads: { eyebrow: string; value: string };
  visitorToLead: { eyebrow: string; value: string };
  customers: { eyebrow: string; value: string };
  leadToCustomer: { eyebrow: string; value: string };
  totals: Array<{ eyebrow: string; value: string; sub: string }>;
};

const EMPTY_DATA: FunnelData = {
  visitors: { eyebrow: "Visitantes anónimos", value: "—" },
  freeAnalyses: { eyebrow: "Análises grátis feitas", value: "0" },
  leads: { eyebrow: "Leads · registados", value: "0" },
  visitorToLead: { eyebrow: "conversão visitante → lead", value: "—" },
  customers: { eyebrow: "Clientes · pedidos", value: "0" },
  leadToCustomer: { eyebrow: "conversão lead → cliente", value: "—" },
  totals: [
    { eyebrow: "Conversão total", value: "—", sub: "ainda sem tracker de visitantes" },
    { eyebrow: "Receita por lead", value: "€0,00", sub: "sem checkout ligado" },
    { eyebrow: "Valor médio cliente", value: "€0,00", sub: "sem checkout ligado" },
  ],
};

function buildData(api: FunnelApiResponse): FunnelData {
  const total = api.analyses_total ?? api.analyses;
  const fresh = api.analyses_fresh ?? api.analyses;
  return {
    visitors: { eyebrow: "Visitantes anónimos", value: "—" },
    freeAnalyses: {
      eyebrow: `Análises feitas · ${api.window_days}d`,
      value: String(total),
    },
    leads: { eyebrow: "Leads · registados", value: String(api.leads) },
    visitorToLead: {
      eyebrow: `análises → lead · ${fresh} c/ chamada paga`,
      value: total > 0 ? `${((api.leads / total) * 100).toFixed(1)}%` : "—",
    },
    customers: { eyebrow: "Clientes · pedidos", value: String(api.customers) },
    leadToCustomer: {
      eyebrow: "conversão lead → cliente",
      value: api.lead_to_customer_pct != null ? `${api.lead_to_customer_pct.toFixed(1)}%` : "—",
    },
    totals: [
      { eyebrow: "Conversão total", value: "—", sub: "ainda sem tracker de visitantes" },
      { eyebrow: "Receita por lead", value: "€0,00", sub: "sem checkout ligado" },
      { eyebrow: "Valor médio cliente", value: "€0,00", sub: "sem checkout ligado" },
    ],
  };
}

const FUNNEL_TOTALS_INFO: Record<string, string> = {
  "Conversão total":
    "Percentagem de visitantes anónimos que se tornam clientes pagantes.",
  "Receita por lead":
    "Receita total dividida pelo número de leads. Mede o valor médio gerado por cada registo.",
  "Valor médio cliente":
    "Receita média gerada por cada cliente pagante nos últimos 30 dias.",
};

export function FunnelSection({ period = "30d" }: { period?: AdminPeriod } = {}) {
  const { data: api } = useQuery<FunnelApiResponse>({
    queryKey: ["admin", "funnel", period],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/funnel?period=${period}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });
  const data = api ? buildData(api) : EMPTY_DATA;
  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader
        title="Funil de conversão"
        subtitle="últimos 30 dias"
        accent="leads"
        info="Mostra o percurso desde visitante anónimo até cliente pagante. As percentagens indicam a conversão entre cada etapa."
      />
      {api && api.customers === 0 && (
        <PaymentsPendingBanner
          reason="Ainda não há clientes pagantes na janela. As contagens de análises e leads são reais; o checkout (EuPago/Stripe) está por ligar."
        />
      )}
      <AdminCard className="!p-4 sm:!p-10">
        <div className="hidden sm:block">
          <FunnelDiagram data={data} />
        </div>
        <div className="sm:hidden">
          <FunnelStackedMobile data={data} />
        </div>
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
function FunnelDiagram({ data }: { data: FunnelData }) {
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
        fontSize={12}
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
        fontSize={12}
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

/**
 * Versão empilhada do funil para mobile (< sm). Mantém a metáfora visual com
 * faixas de largura decrescente e as mesmas cores do SVG desktop, mas evita a
 * sobreposição de labels que acontecia ao escalar o viewBox em ecrãs estreitos.
 */
function FunnelStackedMobile({
  data,
}: {
  data: FunnelData;
}) {
  const layers: Array<{
    left: { eyebrow: string; value: string };
    right: { eyebrow: string; value: string };
    bg: string;
    fg: string;
    eyebrowFg: string;
    width: string;
  }> = [
    {
      left: data.visitors,
      right: data.freeAnalyses,
      bg: ADMIN_LITERAL.funnelTop,
      fg: ADMIN_LITERAL.funnelBaseText,
      eyebrowFg: ADMIN_LITERAL.funnelEyebrow,
      width: "100%",
    },
    {
      left: data.leads,
      right: data.visitorToLead,
      bg: ADMIN_LITERAL.funnelMid,
      fg: ADMIN_LITERAL.funnelBaseText,
      eyebrowFg: ADMIN_LITERAL.funnelEyebrow,
      width: "88%",
    },
    {
      left: data.customers,
      right: data.leadToCustomer,
      bg: ADMIN_LITERAL.funnelBase,
      fg: "#FFFFFF",
      eyebrowFg: ADMIN_LITERAL.funnelLightEyebrow,
      width: "76%",
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {layers.map((layer, i) => (
        <div
          key={i}
          className="mx-auto rounded-md px-4 py-3"
          style={{ background: layer.bg, width: layer.width }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span
              className="text-eyebrow-sm"
              style={{ color: layer.eyebrowFg }}
            >
              {layer.left.eyebrow}
            </span>
            <span
              className="text-base font-semibold tabular-nums"
              style={{ color: layer.fg }}
            >
              {layer.left.value}
            </span>
          </div>
          <div
            className="mt-2 flex items-baseline justify-between gap-3 border-t pt-2"
            style={{ borderColor: `${layer.fg}1A` }}
          >
            <span
              className="text-eyebrow-sm"
              style={{ color: layer.eyebrowFg }}
            >
              {layer.right.eyebrow}
            </span>
            <span
              className="text-sm font-semibold tabular-nums"
              style={{ color: layer.fg }}
            >
              {layer.right.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}