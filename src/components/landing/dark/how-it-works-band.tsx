import { ArrowRight, AtSign, ChartLine, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Reveal } from "./reveal";

function Step({
  number,
  title,
  description,
  Icon,
}: {
  number: string;
  title: string;
  description: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="dark-card flex-1 min-w-[200px] p-6">
      <div className="flex items-center justify-between mb-3.5">
        <div
          className="size-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "rgba(var(--hero-cyan), 0.1)" }}
        >
          <Icon
            className="size-[18px]"
            style={{ color: "rgb(var(--hero-cyan-soft))" }}
            aria-hidden="true"
          />
        </div>
        <span
          className="text-xs uppercase tracking-wider"
          style={{ color: "rgb(var(--hero-text-tertiary))" }}
        >
          {number}
        </span>
      </div>
      <h3
        className="font-display text-lg mb-2"
        style={{ color: "rgb(var(--hero-text-primary))" }}
      >
        {title}
      </h3>
      <p
        className="text-[13px] leading-relaxed"
        style={{ color: "rgb(var(--hero-text-secondary))" }}
      >
        {description}
      </p>
    </div>
  );
}

export function HowItWorksBand() {
  const { t } = useTranslation("landing");

  return (
    <section
      aria-labelledby="dark-how-title"
      className="dark-hairline border-b px-6 py-14 sm:px-10 sm:py-16"
    >
      <Reveal>
        <p className="dark-eyebrow mb-2.5">{t("dark.how.eyebrow")}</p>
        <h2
          id="dark-how-title"
          className="font-display text-2xl sm:text-3xl font-medium leading-[1.15] mb-8"
          style={{ color: "rgb(var(--hero-text-primary))" }}
        >
          {t("dark.how.headline")}
        </h2>

        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <Step
            number={t("dark.how.stepLabel", { number: "01" })}
            title={t("dark.how.step1.title")}
            description={t("dark.how.step1.desc")}
            Icon={AtSign}
          />
          <div
            className="hidden md:flex items-center justify-center"
            style={{ color: "rgb(var(--hero-cyan))" }}
            aria-hidden="true"
          >
            <ArrowRight className="size-5 dark-arrow-flow" />
          </div>
          <Step
            number={t("dark.how.stepLabel", { number: "02" })}
            title={t("dark.how.step2.title")}
            description={t("dark.how.step2.desc")}
            Icon={ChartLine}
          />
          <div
            className="hidden md:flex items-center justify-center"
            style={{ color: "rgb(var(--hero-cyan))" }}
            aria-hidden="true"
          >
            <ArrowRight
              className="size-5 dark-arrow-flow"
              style={{ animationDelay: "0.4s" }}
            />
          </div>
          <Step
            number={t("dark.how.stepLabel", { number: "03" })}
            title={t("dark.how.step3.title")}
            description={t("dark.how.step3.desc")}
            Icon={FileText}
          />
        </div>
      </Reveal>
    </section>
  );
}