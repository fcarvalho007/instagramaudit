import { createFileRoute } from "@tanstack/react-router";

import { PricingPage } from "@/components/pricing/pricing-page";

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: "Preços — InstaBench" },
      {
        name: "description",
        content:
          "Preços simples e transparentes do InstaBench: 1 relatório por 7€ ou pack de 5 por 28€. Sem subscrição.",
      },
      { property: "og:title", content: "Preços — InstaBench" },
      {
        property: "og:description",
        content:
          "Preços simples e transparentes do InstaBench: 1 relatório por 7€ ou pack de 5 por 28€. Sem subscrição.",
      },
      { property: "og:url", content: "https://instagramaudit.lovable.app/precos" },
    ],
    links: [
      { rel: "canonical", href: "https://instagramaudit.lovable.app/precos" },
    ],
  }),
  component: PrecosPage,
});

function PrecosPage() {
  return <PricingPage />;
}