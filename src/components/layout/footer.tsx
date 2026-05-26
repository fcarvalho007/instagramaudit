import { useTranslation } from "react-i18next";

import { Container } from "@/components/layout/container";
import { BrandMark } from "@/components/layout/brand-mark";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { usePublicAppConfig } from "@/lib/config/use-app-config";

function Footer() {
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
    <footer className="relative overflow-hidden bg-surface-secondary py-12 md:py-14">
      {/* Divisor prismático subtil — substitui o border-top flat */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--accent-primary)_25%,transparent)] to-transparent"
      />
      {/* Halo decorativo glass — accent difuso no canto */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 right-8 size-40 rounded-full bg-[color-mix(in_oklab,var(--accent-primary)_8%,transparent)] blur-3xl"
      />
      <Container size="xl">
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Brand + tagline */}
          <div className="flex items-center gap-3 min-w-0 rounded-2xl bg-white/60 backdrop-blur-sm ring-1 ring-border-default/60 shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--accent-primary)_18%,transparent)] px-3 py-2">
            <BrandMark size={28} />
            <div className="min-w-0">
              <p className="font-display text-base font-semibold tracking-tight text-content-primary leading-tight">
                AuditProfiles
              </p>
              <p
                className="font-sans text-xs text-content-tertiary leading-snug"
                suppressHydrationWarning
              >
                {t("tagline", { defaultValue: "Benchmarking de Instagram, claro e auditável." })}
              </p>
            </div>
          </div>

          {/* Links institucionais em linha */}
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="font-sans text-sm text-content-secondary hover:text-content-primary transition-colors duration-[150ms]"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 pt-6 border-t border-border-subtle">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p
              className="font-sans text-xs text-content-tertiary text-center md:text-left"
              suppressHydrationWarning
            >
              {t("copyright", { year, defaultValue: `© ${year} AuditProfiles. Todos os direitos reservados.` })}
            </p>
            <LanguageSwitcher variant="full" />
          </div>
        </div>
      </Container>
    </footer>
  );
}

export { Footer };
