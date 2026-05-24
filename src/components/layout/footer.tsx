import { useTranslation } from "react-i18next";

import { Container } from "@/components/layout/container";
import { BrandMark } from "@/components/layout/brand-mark";

function Footer() {
  const { t } = useTranslation("footer");
  const links = [
    { label: t("links.contact"), href: "mailto:hello@instabench.pt" },
    { label: t("links.privacy"), href: "/privacidade" },
    { label: t("links.terms"), href: "/termos" },
    { label: t("links.legal_notice"), href: "/aviso-legal" },
    { label: t("links.cookies"), href: "/cookies" },
  ];
  const year = new Date().getFullYear();
  return (
    <footer className="bg-surface-secondary border-t border-border-subtle py-12 md:py-14">
      <Container size="xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Brand + tagline */}
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark size={28} />
            <div className="min-w-0">
              <p className="font-display text-base font-semibold tracking-tight text-content-primary leading-tight">
                InstaBench
              </p>
              <p className="font-sans text-xs text-content-tertiary leading-snug">
                {t("tagline")}
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
          <p className="font-sans text-xs text-content-tertiary text-center md:text-left">
            {t("copyright", { year })}
          </p>
        </div>
      </Container>
    </footer>
  );
}

export { Footer };
