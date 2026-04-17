import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Container } from "@/components/layout/container";

interface LegalLayoutProps {
  /** Short editorial label (e.g. "DOCUMENTO LEGAL"). */
  eyebrow: string;
  /** Page title (serif display). */
  title: string;
  /** Short subtitle/lede shown under the title. */
  lede: string;
  /** Date of last update, formatted in pt-PT (e.g. "17 de abril de 2026"). */
  lastUpdated: string;
  /** Optional table of contents items rendered in the desktop sidebar. */
  toc?: Array<{ id: string; label: string }>;
  children: ReactNode;
}

/**
 * Shared editorial wrapper for legal pages (Privacy, Terms).
 * Provides consistent header, sidebar TOC on desktop, prose container
 * for the body, and a non-affiliation disclaimer + legal-disclaimer note
 * at the bottom.
 */
export function LegalLayout({ eyebrow, title, lede, lastUpdated, toc, children }: LegalLayoutProps) {
  return (
    <AppShell>
      <Container>
        <article className="py-16 md:py-24">
          {/* Header */}
          <header className="max-w-3xl space-y-5 mb-12 md:mb-16">
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-accent-luminous">
              {eyebrow}
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-medium text-content-primary tracking-tight">
              {title}
            </h1>
            <p className="font-sans text-base md:text-lg text-content-secondary leading-relaxed">
              {lede}
            </p>
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-content-tertiary pt-2">
              Última atualização: {lastUpdated}
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-12 lg:gap-16">
            {/* Sidebar TOC (desktop only) */}
            {toc && toc.length > 0 && (
              <aside className="hidden lg:block">
                <div className="sticky top-24 space-y-3">
                  <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
                    Índice
                  </p>
                  <nav>
                    <ul className="space-y-2.5 border-l border-border-subtle">
                      {toc.map((item) => (
                        <li key={item.id}>
                          <a
                            href={`#${item.id}`}
                            className="block -ml-px pl-4 border-l border-transparent hover:border-accent-primary/60 font-sans text-sm text-content-tertiary hover:text-content-primary transition-colors"
                          >
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              </aside>
            )}

            {/* Prose body */}
            <div className="legal-prose max-w-3xl">{children}</div>
          </div>

          {/* Footer notes */}
          <footer className="max-w-3xl mt-16 md:mt-20 pt-8 border-t border-border-subtle space-y-4">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-content-tertiary">
              InstaBench não é afiliado, patrocinado nem operado pela Meta ou pelo Instagram. A
              análise incide sobre dados públicos disponíveis no Instagram.
            </p>
            <p className="font-sans text-xs text-content-tertiary leading-relaxed">
              Nota: este documento foi redigido para refletir, de boa-fé, o funcionamento atual do
              produto. Não substitui aconselhamento jurídico formal. Em caso de dúvida sobre
              direitos ou obrigações específicas, recomenda-se consulta jurídica independente.
            </p>
          </footer>
        </article>
      </Container>

      {/* Prose styling — scoped to legal pages */}
      <style>{`
        .legal-prose section { scroll-margin-top: 6rem; }
        .legal-prose h2 {
          font-family: var(--font-display);
          font-size: 1.625rem;
          font-weight: 500;
          letter-spacing: -0.01em;
          color: var(--color-content-primary);
          margin-top: 3rem;
          margin-bottom: 1rem;
        }
        .legal-prose section:first-of-type h2 { margin-top: 0; }
        .legal-prose h3 {
          font-family: var(--font-display);
          font-size: 1.125rem;
          font-weight: 500;
          color: var(--color-content-primary);
          margin-top: 1.75rem;
          margin-bottom: 0.5rem;
        }
        .legal-prose p {
          font-family: var(--font-sans);
          font-size: 0.9375rem;
          line-height: 1.7;
          color: var(--color-content-secondary);
          margin-bottom: 1rem;
        }
        .legal-prose ul, .legal-prose ol {
          font-family: var(--font-sans);
          font-size: 0.9375rem;
          line-height: 1.7;
          color: var(--color-content-secondary);
          margin-bottom: 1rem;
          padding-left: 1.25rem;
        }
        .legal-prose ul { list-style-type: disc; }
        .legal-prose ol { list-style-type: decimal; }
        .legal-prose li { margin-bottom: 0.375rem; }
        .legal-prose li::marker { color: var(--color-content-tertiary); }
        .legal-prose strong {
          color: var(--color-content-primary);
          font-weight: 500;
        }
        .legal-prose a {
          color: var(--color-accent-luminous);
          text-decoration: underline;
          text-decoration-color: color-mix(in oklab, var(--color-accent-luminous) 40%, transparent);
          text-underline-offset: 3px;
          transition: text-decoration-color 0.15s ease;
        }
        .legal-prose a:hover {
          text-decoration-color: var(--color-accent-luminous);
        }
        .legal-prose code {
          font-family: var(--font-mono);
          font-size: 0.8125rem;
          color: var(--color-content-primary);
          background: color-mix(in oklab, var(--color-surface-secondary) 80%, transparent);
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
        }
      `}</style>
    </AppShell>
  );
}
