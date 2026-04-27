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
import { Fragment } from "react";

function PipelineConnector({ qty }: { qty: number }) {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col items-center justify-center gap-1"
    >
      <span
        className="admin-num text-[10px] font-medium leading-none tabular-nums"
        style={{ color: "#1D9E75" }}
      >
        +{qty}
      </span>
      <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
        <path
          d="M0 7H19M19 7L13 1M19 7L13 13"
          stroke="#1D9E75"
          strokeWidth="1.25"
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
        info="Movimento de utilizadores entre estados nos últimos 30 dias. Cada seta indica conversões reais."
      />
      <AdminCard className="!px-7 !py-7">
        <div
          className="grid items-stretch"
          style={{
            gridTemplateColumns: "1fr 36px 1fr 36px 1fr 36px 1fr",
            columnGap: 0,
          }}
        >
          {states.map((s, i) => (
            <Fragment key={s.key}>
              <div
                className="rounded-md"
                style={{
                  borderLeft: `3px solid ${s.borderColor}`,
                  backgroundColor: s.bg,
                  padding: "16px 18px",
                }}
              >
                <p
                  className="m-0 text-[10px] uppercase font-mono"
                  style={{ color: s.eyebrowColor, letterSpacing: "0.08em" }}
                >
                  {s.eyebrow}
                </p>
                <p
                  className="mt-1.5 mb-0 admin-num font-medium leading-none tabular-nums"
                  style={{ color: s.valueColor, fontSize: 28 }}
                >
                  {s.value}
                </p>
                <p
                  className="mt-1.5 mb-0 text-[11px]"
                  style={{ color: s.subColor }}
                >
                  {s.sub}
                </p>
              </div>
              {i < states.length - 1 ? (
                <PipelineConnector qty={transitions[i]!.qty} />
              ) : null}
            </Fragment>
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