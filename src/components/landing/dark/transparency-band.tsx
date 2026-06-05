import { Instagram, Lock, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Reveal } from "./reveal";

export function TransparencyBand() {
  const { t } = useTranslation("landing");

  const chips: Array<{ key: string; Icon: LucideIcon }> = [
    { key: "noLogin", Icon: Instagram },
    { key: "publicOnly", Icon: ShieldCheck },
    { key: "gdpr", Icon: Lock },
  ];

  return (
    <section
      aria-labelledby="dark-transparency-title"
      className="dark-hairline border-b px-6 py-14 sm:px-10 sm:py-16"
    >
      <Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          <div>
            <p className="dark-eyebrow mb-2.5">
              {t("dark.transparency.eyebrow")}
            </p>
            <h2
              id="dark-transparency-title"
              className="font-display text-2xl sm:text-[26px] font-medium leading-[1.2] mb-3"
              style={{ color: "rgb(var(--hero-text-primary))" }}
            >
              {t("dark.transparency.headline")}
            </h2>
            <p
              className="text-sm leading-relaxed max-w-md"
              style={{ color: "rgb(var(--hero-text-secondary))" }}
            >
              {t("dark.transparency.body")}
            </p>
            <p
              className="text-xs mt-3"
              style={{ color: "rgb(var(--hero-text-tertiary))" }}
            >
              {t("dark.transparency.audience")}
            </p>
          </div>
          <ul className="flex flex-col gap-2.5">
            {chips.map(({ key, Icon }) => (
              <li
                key={key}
                className="dark-card flex items-center gap-3 px-4 py-3"
              >
                <Icon
                  className="size-[18px] shrink-0"
                  style={{ color: "rgb(var(--hero-cyan-soft))" }}
                  aria-hidden="true"
                />
                <span
                  className="text-sm"
                  style={{ color: "rgb(var(--hero-text-primary))" }}
                >
                  {t(`dark.transparency.chips.${key}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}