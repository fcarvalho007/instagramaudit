import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Container } from "@/components/layout/container";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { ProductPreviewSection } from "@/components/landing/product-preview-section";
import { SocialProofSection } from "@/components/landing/social-proof-section";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "AuditProfiles · O benchmark de Instagram que faltava ao mercado",
      },
      {
        name: "description",
        content:
          "Análise pública e imediata de qualquer perfil de Instagram. Comparação com benchmarks atualizados e relatório detalhado por email.",
      },
      {
        property: "og:title",
        content:
          "AuditProfiles · O benchmark de Instagram que faltava ao mercado",
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
  const { t } = useTranslation("landing");
  const microProofPoints = [
    t("microProof.fast"),
    t("microProof.noSignup"),
    t("microProof.gdpr"),
  ];
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
      <div id="como-funciona" style={{ scrollMarginTop: "5rem" }}>
        <HowItWorksSection />
      </div>
      <div id="exemplos" style={{ scrollMarginTop: "5rem" }}>
        <ProductPreviewSection />
      </div>
    </>
  );
}
