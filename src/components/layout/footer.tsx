import { Container } from "@/components/layout/container";
import { BrandMark } from "@/components/layout/brand-mark";

/**
 * Footer institucional minimal. Removidas as colunas comerciais
 * (Produto/Recursos) que duplicavam navegação do header e do bloco
 * final do relatório. Mantemos brand + links institucionais.
 */
const INSTITUTIONAL_LINKS = [
  { label: "Sobre", href: "/sobre" },
  { label: "Contacto", href: "/contacto" },
  { label: "Privacidade", href: "/privacidade" },
  { label: "Termos", href: "/termos" },
  { label: "RGPD", href: "/rgpd" },
  { label: "Cookies", href: "/cookies" },
];

function Footer() {
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
                Benchmarking de Instagram, claro e auditável.
              </p>
            </div>
          </div>

          {/* Links institucionais em linha */}
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {INSTITUTIONAL_LINKS.map((link) => (
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
            © 2026 InstaBench. Todos os direitos reservados.
          </p>
        </div>
      </Container>
    </footer>
  );
}

export { Footer };
