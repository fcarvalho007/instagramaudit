import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/layout/container";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InstaBench · O benchmark de Instagram que faltava ao mercado" },
      {
        name: "description",
        content:
          "Análise pública e imediata de qualquer perfil de Instagram. Comparação com benchmarks atualizados e relatório por email.",
      },
      {
        property: "og:title",
        content: "InstaBench · O benchmark de Instagram que faltava ao mercado",
      },
      {
        property: "og:description",
        content:
          "Análise pública e imediata de qualquer perfil de Instagram. Comparação com benchmarks atualizados e relatório por email.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <Container
      size="md"
      className="min-h-[70vh] flex flex-col items-center justify-center text-center py-16 space-y-8"
    >
      <p className="font-mono text-xs uppercase tracking-wide text-content-tertiary">
        Em breve · Instagram Benchmark Analyzer
      </p>

      <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight text-content-primary leading-tight max-w-3xl">
        O benchmark de Instagram que faltava ao mercado.
      </h1>

      <p className="font-sans text-lg text-content-secondary leading-relaxed max-w-2xl">
        Análise pública e imediata de qualquer perfil de Instagram. Comparação
        com benchmarks atualizados e até dois concorrentes. Relatório detalhado
        com leitura estratégica por IA, enviado por email.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
        <Button variant="primary" rightIcon={<ArrowRight />}>
          Receber aviso de lançamento
        </Button>
        <Button asChild variant="secondary">
          <Link to="/design-system">Ver design system</Link>
        </Button>
      </div>

      <div className="pt-6">
        <Badge variant="success" size="sm" dot pulse>
          Sprint 0 completo · Design system finalizado
        </Badge>
      </div>
    </Container>
  );
}
