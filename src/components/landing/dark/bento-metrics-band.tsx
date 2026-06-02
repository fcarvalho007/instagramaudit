import { CalendarRange, Heart, LayoutGrid, Target, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Reveal } from "./reveal";

export function BentoMetricsBand() {
  const { t } = useTranslation("landing");

  const smallCards = [
    {
      key: "engagement",
      Icon: Heart,
      title: t("dark.bento.engagement.title"),
      hint: t("dark.bento.engagement.hint"),
    },
    {
      key: "frequency",
      Icon: CalendarRange,
      title: t("dark.bento.frequency.title"),
      hint: t("dark.bento.frequency.hint"),
    },
    {
      key: "format",
      Icon: LayoutGrid,
      title: t("dark.bento.format.title"),
      hint: t("dark.bento.format.hint"),
    },
    {
      key: "competitors",
      Icon: Users,
      title: t("dark.bento.competitors.title"),
      hint: t("dark.bento.competitors.hint"),
    },
  ];

  return (
    <section
      aria-labelledby="dark-bento-title"
      className="dark-hairline border-b px-6 py-14 sm:px-10 sm:py-16"
    >
      <Reveal>
        <p className="dark-eyebrow mb-2.5">{t("dark.bento.eyebrow")}</p>
        <h2
          id="dark-bento-title"
          className="font-display text-2xl sm:text-3xl font-medium leading-[1.15] mb-8"
          style={{ color: "rgb(var(--hero-text-primary))" }}
        >
          {t("dark.bento.headline")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 md:grid-rows-2">
          {/* Hero card (2x2) */}
          <div className="dark-card-emphasis p-6 sm:col-span-2 sm:row-span-2 flex flex-col justify-between min-h-[220px]">
            <div>
              <Target
                className="size-[22px]"
                style={{ color: "rgb(var(--hero-cyan-soft))" }}
                aria-hidden="true"
              />
              <h3
                className="font-display text-xl sm:text-[21px] mt-3.5 mb-2"
                style={{ color: "rgb(var(--hero-text-primary))" }}
              >
                {t("dark.bento.benchmark.title")}
              </h3>
              <p
                className="text-sm leading-relaxed max-w-sm"
                style={{ color: "rgb(var(--hero-text-secondary))" }}
              >
                {t("dark.bento.benchmark.body")}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <span
                className="text-[28px] font-semibold tabular-nums"
                style={{ color: "rgb(var(--hero-text-primary))" }}
              >
                0,64%
              </span>
              <div
                className="flex-1 max-w-[160px] h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="h-full"
                  style={{
                    width: "72%",
                    backgroundColor: "rgb(var(--hero-cyan))",
                  }}
                />
              </div>
              <span
                className="text-xs whitespace-nowrap"
                style={{ color: "#3DDC97" }}
              >
                {t("dark.bento.benchmark.aboveAverage")}
              </span>
            </div>
          </div>

          {smallCards.map(({ key, Icon, title, hint }) => (
            <div key={key} className="dark-card p-5">
              <Icon
                className="size-[18px]"
                style={{ color: "rgb(var(--hero-cyan-soft))" }}
                aria-hidden="true"
              />
              <h3
                className="text-sm font-semibold mt-2.5 mb-1.5"
                style={{ color: "rgb(var(--hero-text-primary))" }}
              >
                {title}
              </h3>
              <p
                className="text-xs leading-snug"
                style={{ color: "rgb(var(--hero-text-secondary))" }}
              >
                {hint}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}