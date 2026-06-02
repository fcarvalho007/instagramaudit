import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Pré-visualização ilustrativa do relatório, mostrada à direita do hero.
 * Apresentada com chrome de janela de browser (desktop) para reforçar a
 * percepção de produto de computador. Scoped ao wrapper `.hero-dark`.
 */
export function HeroReportPreview() {
  const { t } = useTranslation("landing");
  const premiumRowKeys = [
    "diagnostic",
    "content",
    "reach",
    "comparison",
  ] as const;

  return (
    <div
      className="hero-mock-fade relative w-full max-w-[520px] mx-auto"
      role="img"
      aria-label={t("hero.previewMock.header")}
    >
      {/* Glow ambiente atrás do card */}
      <div
        aria-hidden="true"
        className="absolute -inset-8 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 60% 40%, rgb(79 140 255 / 0.18), transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div
        className="rounded-2xl border-[1.5px] bg-[var(--hero-glass-bg)] backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden"
        style={{ borderColor: "var(--hero-glass-border)" }}
      >
        {/* Browser chrome */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 border-b"
          style={{ borderColor: "var(--hero-border)" }}
        >
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
            <span className="size-3 rounded-full" style={{ backgroundColor: "#FF5F57" }} />
            <span className="size-3 rounded-full" style={{ backgroundColor: "#FEBC2E" }} />
            <span className="size-3 rounded-full" style={{ backgroundColor: "#28C840" }} />
          </div>
          {/* URL pill */}
          <div
            className="flex-1 min-w-0 mx-1 sm:mx-4 rounded-md border px-3 py-1 text-center"
            style={{
              borderColor: "var(--hero-border)",
              backgroundColor: "rgb(255 255 255 / 0.03)",
            }}
          >
            <span
              className="block truncate text-xs tabular-nums"
              style={{ color: "var(--hero-fg-subtle)" }}
            >
              {t("hero.previewMock.urlBar")}
            </span>
          </div>
          {/* Spacer to balance traffic lights */}
          <div className="size-3 shrink-0" aria-hidden="true" />
        </div>

        {/* Score card */}
        <div className="px-5 pt-5">
          <div
            className="rounded-xl border p-4 ring-1"
            style={{
              borderColor: "var(--hero-border)",
              backgroundColor: "var(--hero-bg-elevated)",
              boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.04)",
              ["--tw-ring-color" as never]: "rgb(109 211 231 / 0.2)",
            }}
          >
            <div
              className="text-eyebrow-sm mb-2"
              style={{ color: "var(--hero-fg-subtle)" }}
            >
              {t("hero.previewMock.scoreLabel")}
            </div>
            <div
              className="font-sans font-semibold text-3xl tabular-nums"
              style={{ color: "var(--hero-fg)" }}
            >
              {t("hero.previewMock.scoreValue")}
            </div>
            <div
              className="mt-3 h-1.5 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--hero-border)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: "37%",
                  background:
                    "linear-gradient(90deg, var(--hero-accent), var(--hero-cyan))",
                }}
              />
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="px-5 pt-4 grid grid-cols-2 gap-2">
          {[
            { label: t("hero.previewMock.kpis.engagement"), value: "4,2%" },
            { label: t("hero.previewMock.kpis.frequency"), value: "2,8" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--hero-border)",
                backgroundColor: "rgb(255 255 255 / 0.02)",
              }}
            >
              <div
                className="text-[0.625rem] tracking-[0.14em] uppercase font-medium"
                style={{ color: "var(--hero-fg-subtle)" }}
              >
                {kpi.label}
              </div>
              <div
                className="font-sans font-semibold text-base tabular-nums mt-1"
                style={{ color: "var(--hero-fg)" }}
              >
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar label + premium rows blurred (desktop only) */}
        <div className="hidden lg:block px-5 pt-4">
          <div
            className="text-eyebrow-sm mb-2.5"
            style={{ color: "var(--hero-fg-subtle)" }}
          >
            {t("hero.previewMock.sidebar")}
          </div>
          <div className="space-y-1.5" aria-hidden="true">
            {premiumRowKeys.map((key) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border px-3 py-2 select-none"
                style={{
                  borderColor: "var(--hero-border)",
                  backgroundColor: "rgb(255 255 255 / 0.02)",
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{
                    color: "var(--hero-fg-muted)",
                    filter: "blur(2.5px)",
                  }}
                >
                  {t(`hero.previewMock.premiumRows.${key}`)}
                </span>
                <Lock
                  className="size-3.5"
                  style={{ color: "var(--hero-fg-faint)" }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footnote */}
        <div
          className="px-5 py-4 mt-4 border-t"
          style={{ borderColor: "var(--hero-border)" }}
        >
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--hero-fg-subtle)" }}
          >
            {t("hero.previewMock.footnote")}
          </p>
        </div>
      </div>
    </div>
  );
}