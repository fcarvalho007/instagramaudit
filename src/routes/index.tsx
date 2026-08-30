import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { trackAnonymousEvent } from "@/lib/analytics/anonymous-funnel";

import { HeroSection } from "@/components/landing/hero-section";
import { LandingDarkIsland } from "@/components/landing/dark/landing-dark-island";

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
  useEffect(() => {
    trackAnonymousEvent("landing_view", { dedupeKey: "landing" });
  }, []);

  return (
    // Dark hero landing — published bundle refresh marker
    <div
      className="hero-dark"
      style={{ backgroundColor: "rgb(var(--hero-bg-base))" }}
    >
      <HeroSection />
      <LandingDarkIsland />
    </div>
  );
}
