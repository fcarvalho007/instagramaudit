import { Container } from "@/components/layout/container";
import { BrandMark } from "@/components/layout/brand-mark";

const PRODUCT_LINKS = [
  { label: "Analisar perfil", href: "/" },
  { label: "Como funciona", href: "/como-funciona" },
  { label: "Preços", href: "/precos" },
  { label: "Planos para agências", href: "/precos#agencias" },
];

const RESOURCE_LINKS = [
  { label: "Benchmarks 2026", href: "/recursos/benchmarks-2026" },
  { label: "Guia de engagement", href: "/recursos/guia-engagement" },
  { label: "Blog", href: "/blog" },
  { label: "Centro de ajuda", href: "/ajuda" },
];

const COMPANY_LINKS = [
  { label: "Sobre", href: "/sobre" },
  { label: "Contacto", href: "/contacto" },
  { label: "Privacidade", href: "/privacidade" },
  { label: "Termos", href: "/termos" },
];

const LEGAL_LINKS = [
  { label: "RGPD", href: "/rgpd" },
  { label: "Cookies", href: "/cookies" },
  { label: "Segurança", href: "/seguranca" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="font-mono text-xs uppercase tracking-wide text-content-tertiary mb-4">
        {title}
      </h3>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-sm text-content-secondary hover:text-content-primary transition-colors duration-[150ms]"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-surface-secondary border-t border-border-subtle py-16 md:py-20">
      <Container size="xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <BrandMark size={32} />
              <span className="font-display text-base font-semibold tracking-tight text-content-primary">
                InstaBench
              </span>
            </div>
            <p className="font-sans text-sm text-content-secondary leading-relaxed max-w-xs">
              Benchmarking de Instagram para marcas, agências e consultores.
              Análise pública sem registo, relatórios detalhados por email.
            </p>
          </div>

          <FooterColumn title="Produto" links={PRODUCT_LINKS} />
          <FooterColumn title="Recursos" links={RESOURCE_LINKS} />
          <FooterColumn title="Empresa" links={COMPANY_LINKS} />
        </div>

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 pt-8 mt-12 border-t border-border-subtle text-center md:text-left">
          <p className="font-sans text-xs text-content-tertiary">
            © 2026 InstaBench. Todos os direitos reservados.
          </p>
          <ul className="flex items-center gap-3 justify-center md:justify-end">
            {LEGAL_LINKS.map((link, i) => (
              <li
                key={link.href}
                className="flex items-center gap-3 text-xs text-content-tertiary"
              >
                <a
                  href={link.href}
                  className="hover:text-content-secondary transition-colors duration-[150ms]"
                >
                  {link.label}
                </a>
                {i < LEGAL_LINKS.length - 1 && (
                  <span aria-hidden="true">·</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}

export { Footer };
