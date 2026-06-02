import { useTranslation } from "react-i18next";

import { Container } from "@/components/layout/container";
import { BrandMark } from "@/components/layout/brand-mark";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { usePublicAppConfig } from "@/lib/config/use-app-config";

/**
 * Homepage-only dark footer. Mirrors the global <Footer /> in content
 * (same i18n keys, same links, language switcher) but styled to sit
 * coherently under the dark hero + LandingDarkIsland.
 */
function DarkFooter() {
  const { t } = useTranslation("footer");
  const { contactEmail } = usePublicAppConfig();
  const links = [
    { label: t("links.pricing"), href: "/precos" },
    { label: t("links.contact"), href: `mailto:${contactEmail}` },
    { label: t("links.privacy"), href: "/privacidade" },
    { label: t("links.terms"), href: "/termos" },
    { label: t("links.legal_notice"), href: "/aviso-legal" },
    { label: t("links.cookies"), href: "/cookies" },
  ];
  const year = new Date().getFullYear();
  return (
    <footer className="relative bg-transparent border-t border-white/10 py-12 md:py-14 text-white/70">
      <Container size="xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark size={28} />
            <div className="min-w-0">
              <p className="font-display text-base font-semibold tracking-tight text-white leading-tight">
                AuditProfiles
              </p>
              <p
                className="font-sans text-xs text-white/50 leading-snug"
                suppressHydrationWarning
              >
                {t("tagline", {
                  defaultValue:
                    "Benchmarking de Instagram, claro e auditável.",
                })}
              </p>
            </div>
          </div>

          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="font-sans text-sm text-white/70 hover:text-white transition-colors duration-[150ms]"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p
              className="font-sans text-xs text-white/50 text-center md:text-left"
              suppressHydrationWarning
            >
              {t("copyright", {
                year,
                defaultValue: `© ${year} AuditProfiles. Todos os direitos reservados.`,
              })}
            </p>
            <LanguageSwitcher
              variant="full"
              className="text-white/70 hover:text-white"
            />
          </div>
        </div>
      </Container>
    </footer>
  );
}

export { DarkFooter };