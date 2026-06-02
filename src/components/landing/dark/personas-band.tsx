import { Briefcase, Laptop, Star, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Reveal } from "./reveal";

export function PersonasBand() {
  const { t } = useTranslation("landing");

  const personas: Array<{ key: string; Icon: LucideIcon }> = [
    { key: "consultants", Icon: Briefcase },
    { key: "social", Icon: Laptop },
    { key: "brands", Icon: Store },
    { key: "creators", Icon: Star },
  ];

  return (
    <section
      aria-labelledby="dark-personas-title"
      className="dark-hairline border-b px-6 py-14 sm:px-10 sm:py-16"
    >
      <Reveal>
        <p className="dark-eyebrow mb-2.5">{t("dark.personas.eyebrow")}</p>
        <h2
          id="dark-personas-title"
          className="font-display text-2xl sm:text-3xl font-medium leading-[1.15] mb-8"
          style={{ color: "rgb(var(--hero-text-primary))" }}
        >
          {t("dark.personas.headline")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {personas.map(({ key, Icon }) => (
            <div key={key} className="dark-card p-5">
              <Icon
                className="size-5"
                style={{ color: "rgb(var(--hero-cyan-soft))" }}
                aria-hidden="true"
              />
              <h3
                className="text-sm font-semibold mt-3 mb-1.5"
                style={{ color: "rgb(var(--hero-text-primary))" }}
              >
                {t(`dark.personas.${key}.title`)}
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "rgb(var(--hero-text-secondary))" }}
              >
                {t(`dark.personas.${key}.body`)}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}