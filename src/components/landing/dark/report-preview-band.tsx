import { ArrowDown, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Reveal } from "./reveal";

/**
 * Report preview band — the depth-fade card. Mock content is clearly
 * fictional (@marca_exemplo) per project rules. Bottom of the card
 * fades into the dark surface so the eye perceives more below.
 */
export function ReportPreviewBand() {
  const { t } = useTranslation("landing");

  const competitors = [
    {
      handle: "@marca_exemplo",
      value: "0,64%",
      pct: 80,
      isOwner: true,
    },
    { handle: "@concorrente_a", value: "0,48%", pct: 60, isOwner: false },
    { handle: "@concorrente_b", value: "0,31%", pct: 40, isOwner: false },
  ];

  return (
    <section
      aria-labelledby="dark-preview-title"
      className="dark-hairline border-b px-6 pt-14 pb-0 sm:px-10 sm:pt-16"
    >
      <Reveal>
        <div className="mx-auto max-w-xl text-center mb-8">
          <p className="dark-eyebrow mb-2.5">{t("dark.preview.eyebrow")}</p>
          <h2
            id="dark-preview-title"
            className="font-display text-2xl sm:text-3xl font-medium leading-[1.15] mb-3"
            style={{ color: "rgb(var(--hero-text-primary))" }}
          >
            {t("dark.preview.headline")}
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "rgb(var(--hero-text-secondary))" }}
          >
            {t("dark.preview.lead")}
          </p>
        </div>

        {/* Card + fade */}
        <div className="relative mx-auto max-w-xl">
          <div
            className="dark-preview-mask rounded-t-2xl border border-b-0 p-5 max-h-[360px] overflow-hidden"
            style={{
              backgroundColor: "rgb(var(--hero-bg-elevated))",
              borderColor: "rgba(var(--hero-cyan), 0.18)",
            }}
          >
            {/* Card header */}
            <div
              className="flex items-center justify-between pb-3.5 mb-4 border-b"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="size-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(var(--hero-cyan), 0.15)" }}
                >
                  <User
                    className="size-4"
                    style={{ color: "rgb(var(--hero-cyan-soft))" }}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <div
                    className="text-[13px] font-medium"
                    style={{ color: "rgb(var(--hero-text-primary))" }}
                  >
                    @marca_exemplo
                  </div>
                  <div
                    className="text-[10px]"
                    style={{ color: "rgb(var(--hero-text-tertiary))" }}
                  >
                    {t("dark.preview.card.meta")}
                  </div>
                </div>
              </div>
              <span
                className="text-[10px] px-2.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: "rgba(var(--hero-cyan), 0.12)",
                  color: "rgb(var(--hero-cyan-soft))",
                }}
              >
                {t("dark.preview.card.tag")}
              </span>
            </div>

            {/* Mini KPIs */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {[
                {
                  label: t("dark.preview.card.kpiEngagement"),
                  value: "0,64%",
                  delta: "+0,16 vs benchmark",
                  positive: true,
                },
                {
                  label: t("dark.preview.card.kpiFrequency"),
                  value: "3,2",
                  delta: t("dark.preview.card.frequencyHint"),
                  positive: false,
                },
                {
                  label: t("dark.preview.card.kpiFormat"),
                  value: "Reels",
                  delta: t("dark.preview.card.formatHint"),
                  positive: false,
                },
              ].map((k) => (
                <div
                  key={k.label}
                  className="rounded-lg p-3"
                  style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                >
                  <div
                    className="text-[9px] uppercase tracking-wide mb-1.5"
                    style={{ color: "rgb(var(--hero-text-tertiary))" }}
                  >
                    {k.label}
                  </div>
                  <div
                    className="text-xl font-semibold tabular-nums"
                    style={{ color: "rgb(var(--hero-text-primary))" }}
                  >
                    {k.value}
                  </div>
                  <div
                    className="text-[10px] mt-1"
                    style={{
                      color: k.positive
                        ? "#3DDC97"
                        : "rgb(var(--hero-text-secondary))",
                    }}
                  >
                    {k.delta}
                  </div>
                </div>
              ))}
            </div>

            {/* Competitor bars */}
            <div
              className="text-[10px] uppercase tracking-wide mb-2.5"
              style={{ color: "rgb(var(--hero-text-tertiary))" }}
            >
              {t("dark.preview.card.competitorsLabel")}
            </div>
            <div className="flex flex-col gap-2">
              {competitors.map((c) => (
                <div
                  key={c.handle}
                  className="flex items-center gap-2.5"
                >
                  <span
                    className="text-[10px] w-24 truncate"
                    style={{
                      color: c.isOwner
                        ? "rgb(var(--hero-text-secondary))"
                        : "rgb(var(--hero-text-tertiary))",
                    }}
                  >
                    {c.handle}
                  </span>
                  <div
                    className="flex-1 h-[7px] rounded-full overflow-hidden"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${c.pct}%`,
                        backgroundColor: c.isOwner
                          ? "rgb(var(--hero-cyan))"
                          : "rgb(var(--hero-text-tertiary))",
                      }}
                    />
                  </div>
                  <span
                    className="text-[10px] tabular-nums"
                    style={{
                      color: c.isOwner
                        ? "rgb(var(--hero-text-primary))"
                        : "rgb(var(--hero-text-tertiary))",
                    }}
                  >
                    {c.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating CTA over the fade */}
          <div className="relative -mt-16 flex justify-center pb-2">
            <Link
              to="/report/example"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-lg transition-transform hover:-translate-y-0.5"
              style={{
                backgroundColor: "rgb(var(--hero-cyan))",
                color: "#0B1020",
              }}
            >
              {t("dark.preview.cta")}
              <ArrowDown className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Subhighlights */}
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 pt-6 pb-10">
          {[
            { key: "data", title: t("dark.preview.sub.data.title"), hint: t("dark.preview.sub.data.hint") },
            { key: "benchmark", title: t("dark.preview.sub.benchmark.title"), hint: t("dark.preview.sub.benchmark.hint") },
            { key: "ai", title: t("dark.preview.sub.ai.title"), hint: t("dark.preview.sub.ai.hint") },
          ].map((h) => (
            <div key={h.key} className="text-center">
              <div
                className="text-sm font-medium"
                style={{ color: "rgb(var(--hero-text-primary))" }}
              >
                {h.title}
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: "rgb(var(--hero-text-secondary))" }}
              >
                {h.hint}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}