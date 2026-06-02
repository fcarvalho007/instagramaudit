import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Pré-visualização ilustrativa do relatório, mostrada à direita do hero.
 * Apresentada com chrome de janela de browser (desktop) para reforçar a
 * percepção de produto de computador. Consome tokens light globais.
 */
export function HeroReportPreview() {
  const { t } = useTranslation("landing");
  const premiumRowKeys = [
    "diagnostic",
    "content",
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
        className="absolute -inset-8 -z-10 opacity-80"
        style={{
          background:
            "radial-gradient(60% 50% at 60% 40%, rgb(var(--hero-cyan) / 0.28), transparent 70%)",
          filter: "blur(48px)",
        }}
      />

      <div
        className="rounded-2xl border overflow-hidden backdrop-blur-xl"
        style={{
          borderColor: "var(--hero-glass-border)",
          backgroundColor: "var(--hero-glass-bg)",
          boxShadow:
            "0 30px 80px -30px rgba(56,189,248,0.25), 0 1px 0 rgba(255,255,255,0.04) inset",
        }}
      >
        {/* Browser chrome */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 border-b"
          style={{
            borderColor: "var(--hero-glass-border)",
            backgroundColor: "rgb(var(--hero-bg-base) / 0.6)",
          }}
        >
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
            <span className="size-3 rounded-full" style={{ backgroundColor: "#FF5F57" }} />
            <span className="size-3 rounded-full" style={{ backgroundColor: "#FEBC2E" }} />
            <span className="size-3 rounded-full" style={{ backgroundColor: "#28C840" }} />
          </div>
          {/* URL pill — intentionally empty, kept for browser-chrome shape */}
          <div
            className="flex-1 min-w-0 mx-1 sm:mx-4 h-5 rounded-md border"
            style={{
              borderColor: "var(--hero-glass-border)",
              backgroundColor: "rgb(var(--hero-bg-elevated) / 0.7)",
            }}
            aria-hidden="true"
          />
          {/* Spacer to balance traffic lights */}
          <div className="size-3 shrink-0" aria-hidden="true" />
        </div>

        {/* Score card */}
        <div className="px-4 sm:px-5 pt-5">
          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: "var(--hero-glass-border)",
              backgroundColor: "rgb(var(--hero-bg-elevated) / 0.7)",
            }}
          >
            <div
              className="text-eyebrow-sm mb-2"
              style={{ color: "rgb(var(--hero-text-tertiary))" }}
            >
              {t("hero.previewMock.scoreLabel")}
            </div>
            <div
              className="font-sans font-semibold text-2xl sm:text-3xl tabular-nums"
              style={{ color: "rgb(var(--hero-text-primary))" }}
            >
              {t("hero.previewMock.scoreValue")}
            </div>
            <div
              className="mt-3 h-1.5 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: "rgb(var(--hero-cyan) / 0.12)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: "37%",
                  background:
                    "linear-gradient(90deg, rgb(var(--hero-cyan)), rgb(var(--hero-violet)))",
                }}
              />
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="px-4 sm:px-5 pt-4 grid grid-cols-2 gap-2">
          {[
            { label: t("hero.previewMock.kpis.engagement"), value: "4,2%" },
            { label: t("hero.previewMock.kpis.frequency"), value: "2,8" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--hero-glass-border)",
                backgroundColor: "rgb(var(--hero-bg-elevated) / 0.7)",
              }}
            >
              <div
                className="text-[0.625rem] tracking-[0.14em] uppercase font-medium"
                style={{ color: "rgb(var(--hero-text-tertiary))" }}
              >
                {kpi.label}
              </div>
              <div
                className="font-sans font-semibold text-base tabular-nums mt-1"
                style={{ color: "rgb(var(--hero-text-primary))" }}
              >
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar label + premium rows blurred (all viewports) */}
        <div className="px-4 sm:px-5 pt-4 pb-5">
          <div
            className="text-eyebrow-sm mb-2.5"
            style={{ color: "rgb(var(--hero-text-tertiary))" }}
          >
            {t("hero.previewMock.sidebar")}
          </div>
          <div className="space-y-1.5" aria-hidden="true">
            {premiumRowKeys.map((key) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border px-3 py-2 select-none"
                style={{
                  borderColor: "var(--hero-glass-border)",
                  backgroundColor: "rgb(var(--hero-bg-elevated) / 0.6)",
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{
                    color: "rgb(var(--hero-text-secondary))",
                    filter: "blur(2.5px)",
                  }}
                >
                  {t(`hero.previewMock.premiumRows.${key}`)}
                </span>
                <Lock
                  className="size-3.5"
                  style={{ color: "rgb(var(--hero-text-tertiary))" }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}