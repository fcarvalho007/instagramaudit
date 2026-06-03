import { createFileRoute } from "@tanstack/react-router";

import { PricingPage } from "@/components/pricing/pricing-page";

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: "Preços — AuditProfiles" },
      {
        name: "description",
        content:
          "Visão inicial grátis. Relatório completo por 9€. Diagnóstico de Autoridade Digital por 97€ (preço de lançamento). Sem subscrição.",
      },
      { property: "og:title", content: "Preços — AuditProfiles" },
      {
        property: "og:description",
        content:
          "Do diagnóstico automático à leitura humana. Começa grátis. Sobe quando quiseres — sem subscrição.",
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