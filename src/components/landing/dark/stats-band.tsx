import { useTranslation } from "react-i18next";

import { Reveal } from "./reveal";

/**
 * Stats band — opens the post-hero island with editorial credibility.
 * Values match research: 35M+ posts (Socialinsider 2025-2026), ~0,5%
 * engagement, 5 escalões. Numbers are intentionally short strings
 * (not animated counters) to stay legible at all sizes.
 */
export function StatsBand() {
  const { t } = useTranslation("landing");

  const stats = [
    {
      value: "35M+",
      label: t("dark.stats.posts.label"),
      hint: t("dark.stats.posts.hint"),
    },
    {
      value: "~0,5%",
      label: t("dark.stats.engagement.label"),
      hint: null,
    },
    {
      value: "5",
      label: t("dark.stats.tiers.label"),
      hint: null,
    },
  ];

  return (
    <section
      aria-labelledby="dark-stats-title"
      className="dark-hairline border-b px-6 py-10 sm:px-10 sm:py-12"
    >
      <Reveal className="flex flex-col gap-10 md:flex-row md:items-start md:gap-12">
        <div className="flex-1">
          <p className="dark-eyebrow mb-3">{t("dark.stats.eyebrow")}</p>
          <h2
            id="dark-stats-title"
            className="font-display text-xl sm:text-2xl font-medium leading-[1.25] max-w-md"
            style={{ color: "rgb(var(--hero-text-primary))" }}
          >
            {t("dark.stats.headline")}
          </h2>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 md:flex-[1.4]">
          {stats.map((s) => (
            <li key={s.label}>
              <div
                className="font-display text-[34px] font-medium leading-none tabular-nums"
                style={{ color: "rgb(var(--hero-text-primary))" }}
              >
                {s.value}
              </div>
              <span
                aria-hidden="true"
                className="mt-2.5 mb-2 block h-[2px] w-7 rounded-full"
                style={{ backgroundColor: "rgb(var(--hero-cyan))" }}
              />
              <div
                className="text-xs leading-snug"
                style={{ color: "rgb(var(--hero-text-secondary))" }}
              >
                {s.label}
                {s.hint ? (
                  <span
                    className="ml-1"
                    style={{ color: "rgb(var(--hero-text-tertiary))" }}
                  >
                    {s.hint}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}