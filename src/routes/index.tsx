import { createFileRoute } from "@tanstack/react-router";

import { HeroSection } from "@/components/landing/hero-section";

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
  return <HeroSection />;
}
