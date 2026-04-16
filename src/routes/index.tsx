import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Download, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  component: Index,
});

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <h2
        className="font-mono text-xs uppercase"
        style={{
          letterSpacing: "var(--tracking-wide)",
          color: "rgb(var(--text-tertiary))",
        }}
      >
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </section>
  );
}

function Index() {
  return (
    <div
      className="min-h-screen px-6 py-16 md:px-12 md:py-24"
      style={{ backgroundColor: "rgb(var(--surface-base))" }}
    >
      <div className="mx-auto max-w-5xl space-y-16">
        <header className="space-y-4">
          <p
            className="font-mono text-xs uppercase"
            style={{
              letterSpacing: "var(--tracking-wide)",
              color: "rgb(var(--text-tertiary))",
            }}
          >
            Sprint 0 · Prompt 2a · Atomic Components
          </p>
          <h1
            className="font-display text-4xl font-semibold md:text-5xl"
            style={{
              letterSpacing: "var(--tracking-tight)",
              color: "rgb(var(--text-primary))",
              lineHeight: "var(--leading-tight)",
            }}
          >
            Button & Badge
          </h1>
          <p
            className="max-w-xl text-lg"
            style={{
              color: "rgb(var(--text-secondary))",
              lineHeight: "var(--leading-normal)",
            }}
          >
            Showcase temporário dos átomos. Será substituído pelo
            /design-system no Prompt 0.4.
          </p>
        </header>

        <Section title="Button · Variants">
          <Button variant="primary" rightIcon={<ArrowRight />}>
            Analisar agora
          </Button>
          <Button variant="secondary">Ver detalhes</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="outline" leftIcon={<Download />}>
            Exportar
          </Button>
          <Button variant="destructive">Eliminar</Button>
          <Button variant="premium" leftIcon={<Sparkles />}>
            Upgrade Pro
          </Button>
          <Button variant="link">Saber mais</Button>
        </Section>

        <Section title="Button · Sizes">
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" size="md">
            Medium
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
          <Button variant="secondary" size="icon" aria-label="Confirm">
            <Check />
          </Button>
        </Section>

        <Section title="Button · States">
          <Button variant="primary" loading>
            A processar
          </Button>
          <Button variant="primary" disabled>
            Desativado
          </Button>
          <Button variant="secondary" loading>
            A guardar
          </Button>
        </Section>

        <Section title="Badge · Variants">
          <Badge variant="default">Neutro</Badge>
          <Badge variant="success">Acima benchmark</Badge>
          <Badge variant="warning">Em linha</Badge>
          <Badge variant="danger">Abaixo</Badge>
          <Badge variant="accent">Novo</Badge>
          <Badge variant="premium">Pro</Badge>
          <Badge variant="solid">New</Badge>
        </Section>

        <Section title="Badge · Sizes & Dots">
          <Badge variant="success" size="sm" dot>
            Live
          </Badge>
          <Badge variant="accent" size="md" dot pulse>
            Updated
          </Badge>
          <Badge variant="warning" size="lg" dot>
            Pending
          </Badge>
          <Badge variant="danger" size="md" dot pulse>
            Down
          </Badge>
        </Section>

        <Section title="Badge · With icon">
          <Badge variant="premium" leftIcon={<Sparkles />}>
            Agency
          </Badge>
          <Badge variant="success" leftIcon={<Check />}>
            Verificado
          </Badge>
        </Section>
      </div>
    </div>
  );
}
