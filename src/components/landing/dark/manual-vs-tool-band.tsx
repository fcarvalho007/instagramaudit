import { Bolt, Check, Clock, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Reveal } from "./reveal";

/**
 * Manual vs Tool — transformation by contrast. The dim "manual" column
 * vs the luminous "tool" column. Replaces missing social proof.
 */
export function ManualVsToolBand() {
  const { t } = useTranslation("landing");

  const manualItems = t("dark.manualVsTool.manual.items", {
    returnObjects: true,
  }) as string[];
  const toolItems = t("dark.manualVsTool.tool.items", {
    returnObjects: true,
  }) as string[];

  return (
    <section
      aria-labelledby="dark-manual-title"
      className="dark-hairline border-b px-6 py-14 sm:px-10 sm:py-16"
    >
      <Reveal>
        <p className="dark-eyebrow mb-2.5">
          {t("dark.manualVsTool.eyebrow")}
        </p>
        <h2
          id="dark-manual-title"
          className="font-display text-2xl sm:text-3xl font-medium leading-[1.15] max-w-xl mb-8"
          style={{ color: "rgb(var(--hero-text-primary))" }}
        >
          {t("dark.manualVsTool.headline")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Manual */}
          <div className="dark-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Clock
                className="size-[18px]"
                style={{ color: "rgb(var(--hero-text-tertiary))" }}
                aria-hidden="true"
              />
              <span
                className="text-sm font-medium"
                style={{ color: "rgb(var(--hero-text-secondary))" }}
              >
                {t("dark.manualVsTool.manual.label")}
              </span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {manualItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm leading-snug"
                  style={{ color: "rgb(var(--hero-text-tertiary))" }}
                >
                  <X
                    className="size-4 mt-0.5 shrink-0"
                    style={{ color: "rgb(var(--hero-text-tertiary))" }}
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Tool */}
          <div className="dark-card-emphasis p-6">
            <div className="mb-4 flex items-center gap-2">
              <Bolt
                className="size-[18px]"
                style={{ color: "rgb(var(--hero-cyan-soft))" }}
                aria-hidden="true"
              />
              <span
                className="text-sm font-semibold"
                style={{ color: "rgb(var(--hero-cyan-soft))" }}
              >
                {t("dark.manualVsTool.tool.label")}
              </span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {toolItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm leading-snug"
                  style={{ color: "rgb(var(--hero-text-primary))" }}
                >
                  <Check
                    className="size-4 mt-0.5 shrink-0"
                    style={{ color: "#3DDC97" }}
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}