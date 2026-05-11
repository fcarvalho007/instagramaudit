import { createFileRoute } from "@tanstack/react-router";
import { Check, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Container } from "@/components/layout/container";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { ProductPreviewSection } from "@/components/landing/product-preview-section";
import { SocialProofSection } from "@/components/landing/social-proof-section";

const microProofPoints = [
  "Análise em 30 segundos",
  "Sem registo necessário",
  "RGPD compliant",
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "InstaBench · O benchmark de Instagram que faltava ao mercado",
      },
      {
        name: "description",
        content:
          "Análise pública e imediata de qualquer perfil de Instagram. Comparação com benchmarks atualizados e relatório detalhado por email.",
      },
      {
        property: "og:title",
        content:
          "InstaBench · O benchmark de Instagram que faltava ao mercado",
      },
      {
        property: "og:description",
        content:
          "Análise pública e imediata de qualquer perfil de Instagram. Comparação com benchmarks atualizados e relatório detalhado por email.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <HeroSection />
      <section className="bg-gradient-to-b from-surface-base to-surface-secondary/60 border-b border-border-default py-6">
        <Container size="lg">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {microProofPoints.map((point) => (
              <div key={point} className="flex items-center gap-2">
                <Check
                  className="size-4 text-signal-success"
                  aria-hidden="true"
                />
                <span className="text-eyebrow text-content-tertiary">
                  {point}
                </span>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <SocialProofSection />
      <HowItWorksSection />
      <ProductPreviewSection />

      {/* Dev/admin: acesso rápido aos reports — só visível em desenvolvimento */}
      {import.meta.env.DEV && (
      <section className="border-t border-border-default bg-surface-secondary/40 py-6">
        <Container size="lg">
          <p className="text-eyebrow-sm text-[0.625rem] text-content-tertiary mb-3">
            Acesso rápido · Testes
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/analyze/$username"
              params={{ username: "frederico.m.carvalho" }}
              className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-elevated px-4 py-2.5 font-sans text-sm text-content-secondary transition-colors hover:text-content-primary hover:border-accent-primary/40"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Report live · frederico.m.carvalho
            </Link>
            <Link
              to="/report/example"
              className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-elevated px-4 py-2.5 font-sans text-sm text-content-secondary transition-colors hover:text-content-primary hover:border-accent-primary/40"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Report mockup editorial
            </Link>
          </div>
        </Container>
      </section>
      )}
    </>
  );
}
