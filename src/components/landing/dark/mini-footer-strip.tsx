import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { BrandMark } from "@/components/layout/brand-mark";
import { usePublicAppConfig } from "@/lib/config/use-app-config";

export function MiniFooterStrip() {
  const { t } = useTranslation("landing");
  const { contactEmail } = usePublicAppConfig();

  const links = [
    { label: t("dark.miniFooter.pricing"), href: "/precos", internal: true },
    {
      label: t("dark.miniFooter.privacy"),
      href: "/privacidade",
      internal: true,
    },
    { label: t("dark.miniFooter.terms"), href: "/termos", internal: true },
    {
      label: t("dark.miniFooter.contact"),
      href: `mailto:${contactEmail}`,
      internal: false,
    },
  ];

  return (
    <div
      className="dark-hairline border-t px-6 py-6 sm:px-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div className="flex items-center gap-3">
        <BrandMark size={24} />
        <div className="min-w-0">
          <p
            className="text-sm font-semibold leading-tight"
            style={{ color: "rgb(var(--hero-text-primary))" }}
          >
            AuditProfiles
          </p>
          <p
            className="text-xs leading-snug"
            style={{ color: "rgb(var(--hero-text-tertiary))" }}
          >
            {t("dark.miniFooter.tagline")}
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {links.map((link) =>
          link.internal ? (
            <li key={link.href}>
              <Link
                to={link.href}
                className="text-xs transition-colors hover:opacity-80"
                style={{ color: "rgb(var(--hero-text-secondary))" }}
              >
                {link.label}
              </Link>
            </li>
          ) : (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-xs transition-colors hover:opacity-80"
                style={{ color: "rgb(var(--hero-text-secondary))" }}
              >
                {link.label}
              </a>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}