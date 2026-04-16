import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  Download,
  Check,
  AtSign,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input, InputLabel, InputHelper } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/")({
  component: Index,
});

function Section({
  title,
  children,
  layout = "row",
}: {
  title: string;
  children: React.ReactNode;
  layout?: "row" | "stack" | "grid";
}) {
  const layoutClass =
    layout === "grid"
      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      : layout === "stack"
        ? "flex flex-col gap-6 max-w-md"
        : "flex flex-wrap items-center gap-4";

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
      <div className={layoutClass}>{children}</div>
    </section>
  );
}

function Index() {
  return (
    <Container size="lg" as="section" className="py-16 space-y-16">
        <header className="space-y-4">
          <p
            className="font-mono text-xs uppercase"
            style={{
              letterSpacing: "var(--tracking-wide)",
              color: "rgb(var(--text-tertiary))",
            }}
          >
            Sprint 0 · Prompt 2b · Container & Input
          </p>
          <h1
            className="font-display text-4xl font-semibold md:text-5xl"
            style={{
              letterSpacing: "var(--tracking-tight)",
              color: "rgb(var(--text-primary))",
              lineHeight: "var(--leading-tight)",
            }}
          >
            Card · Input · Switch
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
          {/* Icon-only defaults to ghost. For a bold CTA use <Button size="icon" variant="primary">. */}
          <Button size="icon" aria-label="Confirmar">
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

        <section className="space-y-6">
          <h2
            className="font-mono text-xs uppercase"
            style={{
              letterSpacing: "var(--tracking-wide)",
              color: "rgb(var(--text-tertiary))",
            }}
          >
            Button · Link
          </h2>
          <p
            className="flex flex-wrap items-baseline gap-1 text-base"
            style={{
              color: "rgb(var(--text-secondary))",
              lineHeight: "var(--leading-normal)",
            }}
          >
            Precisas de mais informação?
            <Button variant="link">Saber mais →</Button>
          </p>
        </section>

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

        <Section title="Card · Variants" layout="grid">
          <Card variant="default" className="flex flex-col">
            <CardHeader>
              <CardTitle>Visão Geral</CardTitle>
              <CardDescription>
                Taxa de engagement, frequência e formato dominante
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              A análise cobre os últimos 30 posts do perfil selecionado.
            </CardContent>
            <CardFooter className="pt-6">
              <Button variant="secondary" size="sm">
                Ver detalhes
              </Button>
            </CardFooter>
          </Card>

          <Card variant="glass" className="flex flex-col">
            <CardHeader>
              <CardTitle>Comparação com Concorrentes</CardTitle>
              <CardDescription>
                Posicionamento face a até 2 perfis concorrentes
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              Benchmarking lado a lado, com ranking automático.
            </CardContent>
            <CardFooter className="pt-6">
              <Button variant="secondary" size="sm">
                Ver detalhes
              </Button>
            </CardFooter>
          </Card>

          <Card variant="outline" className="flex flex-col">
            <CardHeader>
              <CardTitle>Histórico de Análises</CardTitle>
              <CardDescription>
                Relatórios gerados nos últimos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              Acesso rápido a todos os relatórios recentes.
            </CardContent>
            <CardFooter className="pt-6">
              <Button variant="secondary" size="sm">
                Ver detalhes
              </Button>
            </CardFooter>
          </Card>

          <Card variant="elevated" className="flex flex-col">
            <CardHeader>
              <CardTitle>Plano Pro</CardTitle>
              <CardDescription>
                Análises ilimitadas e seguimento contínuo
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              Acompanha concorrentes com alertas automáticos.
            </CardContent>
            <CardFooter className="pt-6">
              <Button variant="premium" size="sm" leftIcon={<Sparkles />}>
                Conhecer Pro
              </Button>
            </CardFooter>
          </Card>

          <Card variant="interactive" className="flex flex-col">
            <CardHeader>
              <CardTitle>Começar nova análise</CardTitle>
              <CardDescription>
                Insere um username do Instagram para iniciar
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              Análise gratuita, resultados em segundos.
            </CardContent>
            <CardFooter className="pt-6">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight />}>
                Analisar agora
              </Button>
            </CardFooter>
          </Card>
        </Section>

        <Section title="Input · Variants & States" layout="stack">
          <div>
            <InputLabel htmlFor="ig-username">Username do Instagram</InputLabel>
            <Input
              id="ig-username"
              placeholder="@exemplo ou URL do perfil"
              leftIcon={<AtSign />}
            />
            <InputHelper>
              Aceita @username, username ou URL completo
            </InputHelper>
          </div>

          <div>
            <InputLabel htmlFor="email-error">Email</InputLabel>
            <Input
              id="email-error"
              type="email"
              placeholder="email@empresa.pt"
              defaultValue="not-valid-email"
              error
            />
            <InputHelper error>Endereço de email inválido</InputHelper>
          </div>

          <div>
            <InputLabel htmlFor="search-reports">
              Pesquisar relatórios
            </InputLabel>
            <Input
              id="search-reports"
              variant="glass"
              placeholder="Pesquisa por username ou data"
              leftIcon={<Search />}
            />
          </div>

          <div>
            <Input variant="ghost" placeholder="Adicionar concorrente" />
          </div>

          <div>
            <InputLabel htmlFor="plan-disabled">Plano</InputLabel>
            <Input id="plan-disabled" defaultValue="Gratuito" disabled />
          </div>

          <div className="flex flex-col gap-3">
            <InputLabel>Tamanhos</InputLabel>
            <Input inputSize="sm" placeholder="Texto de exemplo" />
            <Input inputSize="md" placeholder="Texto de exemplo" />
            <Input inputSize="lg" placeholder="Texto de exemplo" />
          </div>
        </Section>

        <Section title="Switch · Sizes & States" layout="stack">
          <div className="flex items-center justify-between">
            <span className="text-sm text-content-secondary">
              Notificações por email
            </span>
            <Switch size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-content-secondary">
              Receber resumo semanal
            </span>
            <Switch size="md" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-content-secondary">Modo escuro</span>
            <Switch size="lg" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-content-secondary">
              Plano Agency (ativo)
            </span>
            <Switch size="md" defaultChecked disabled />
          </div>
        </Section>
    </Container>
  );
}
