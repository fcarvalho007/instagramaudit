import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@/components/layout/container";
import { BetaRequestForm } from "@/components/beta/beta-request-form";

export const Route = createFileRoute("/beta/request")({
  head: () => ({
    meta: [
      { title: "Beta Privada · InstaBench" },
      {
        name: "description",
        content:
          "Pede acesso à beta privada do InstaBench e recebe uma análise gratuita do teu perfil de Instagram.",
      },
      { property: "og:title", content: "Beta Privada · InstaBench" },
      {
        property: "og:description",
        content:
          "Pede acesso à beta privada do InstaBench e recebe uma análise gratuita do teu perfil de Instagram.",
      },
    ],
  }),
  component: BetaRequestPage,
});

function BetaRequestPage() {
  return (
    <Container className="py-12 sm:py-20">
      <BetaRequestForm />
    </Container>
  );
}