import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { BrandMark } from "@/components/layout/brand-mark";
import { usePublicAppConfig } from "@/lib/config/use-app-config";

export function MiniFooterStrip() {
  const { t } = useTranslation("landing");
  const { contactEmail } = usePublicAppConfig();

  const internalLinks = [
    { label: t("dark.miniFooter.pricing"), to: "/precos" as const },
    { label: t("dark.miniFooter.privacy"), to: "/privacidade" as const },
    { label: t("dark.miniFooter.terms"), to: "/termos" as const },
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
        {internalLinks.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: "rgb(var(--hero-text-secondary))" }}
            >
              {link.label}
            </Link>
          </li>
        ))}
        <li>
          <a
            href={`mailto:${contactEmail}`}
            className="text-xs transition-colors hover:opacity-80"
            style={{ color: "rgb(var(--hero-text-secondary))" }}
          >
            {t("dark.miniFooter.contact")}
          </a>
        </li>
      </ul>
    </div>
  );
}