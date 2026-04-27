/**
 * Clientes · Secção 1 — Pipeline horizontal.
 *
 * 4 cartões de estado (Lead → Avulso 1 → Avulso recorrente → Subscrição)
 * separados por 3 conectores SVG verdes com a quantidade que transitou.
 * Footer com taxas de conversão e churn.
 */

import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { MOCK_PIPELINE, MOCK_PIPELINE_FOOTER } from "@/lib/admin/mock-data";

function PipelineConnector({ qty }: { qty: number }) {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col items-center justify-center gap-[2px]"
    >
      <span
        className="text-[10px] font-medium leading-none"
        style={{ color: "#3B6D11" }}
      >
        {qty}
      </span>
      <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
        <path
          d="M0 7H17M17 7L11 1M17 7L11 13"
          stroke="#1D9E75"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function PipelineSection() {
  const states = MOCK_PIPELINE.states;
  const transitions = MOCK_PIPELINE.transitions;

  return (
    <section>
      <AdminSectionHeader
        title="Pipeline"
        subtitle="movimento entre estados nos últimos 30 dias"
        accent="leads"
      />
      <AdminCard className="!px-7 !py-6">
        <div
          className="grid items-stretch"
          style={{
            gridTemplateColumns: "1fr 30px 1fr 30px 1fr 30px 1fr",
            columnGap: 0,
          }}
        >
          {states.map((s, i) => (
            <>
              <div
                key={s.key}
                className="rounded-r-lg"
                style={{
                  borderLeft: `3px solid ${s.borderColor}`,
                  backgroundColor: s.bg,
                  padding: "14px 16px",
                }}
              >
                <p
                  className="m-0 text-[10px] uppercase font-mono"
                  style={{ color: s.eyebrowColor, letterSpacing: "0.08em" }}
                >
                  {s.eyebrow}
                </p>
                <p
                  className="mt-1 mb-0 font-mono font-medium leading-tight"
                  style={{ color: s.valueColor, fontSize: 24 }}
                >
                  {s.value}
                </p>
                <p
                  className="mt-1 mb-0 text-[11px]"
                  style={{ color: s.subColor }}
                >
                  {s.sub}
                </p>
              </div>
              {i < states.length - 1 ? (
                <PipelineConnector qty={transitions[i]!.qty} />
              ) : null}
            </>
          ))}
        </div>

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-admin-border-strong pt-3.5">
          <p className="m-0 text-[11px] text-admin-text-tertiary">
            Conversão {" "}
            {MOCK_PIPELINE_FOOTER.conversions.map((c, i) => (
              <span key={c.label}>
                {c.label}:{" "}
                <span className="font-medium text-admin-text-primary">
                  {c.value}
                </span>
                {i < MOCK_PIPELINE_FOOTER.conversions.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
          <p
            className="m-0 text-[11px]"
            style={{ color: "#A32D2D" }}
          >
            Churn este mês:{" "}
            <span className="font-medium">{MOCK_PIPELINE_FOOTER.churn}</span>
          </p>
        </div>
      </AdminCard>
    </section>
  );
}