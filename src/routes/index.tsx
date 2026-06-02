import { createFileRoute } from "@tanstack/react-router";

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
  return (
    <>
      <HeroSection />
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
