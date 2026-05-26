import { createFileRoute } from "@tanstack/react-router";

import { PricingPage } from "@/components/pricing/pricing-page";

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: "Preços — AuditProfiles" },
      {
        name: "description",
        content:
          "Preços simples e transparentes do AuditProfiles: 1 relatório por 7€ ou pack de 5 por 28€. Sem subscrição.",
      },
      { property: "og:title", content: "Preços — AuditProfiles" },
      {
        property: "og:description",
        content:
          "Preços simples e transparentes do AuditProfiles: 1 relatório por 7€ ou pack de 5 por 28€. Sem subscrição.",
      },
      { property: "og:url", content: "https://auditprofiles.com/precos" },
    ],
    links: [
      { rel: "canonical", href: "https://auditprofiles.com/precos" },
    ],
  }),
  component: PrecosPage,
});

function PrecosPage() {
  return <PricingPage />;
}