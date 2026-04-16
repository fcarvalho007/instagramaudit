import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  AtSign,
  Check,
  Download,
  Search,
  Sparkles,
} from "lucide-react";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
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
import { DSSection, DSExample } from "@/components/design-system/ds-section";

export const Route = createFileRoute("/design-system")({
  head: () => ({
    meta: [
      { title: "Design System · InstaBench" },
      {
        name: "description",
        content:
          "Documentação viva do sistema de design do Instagram Benchmark Analyzer: tokens, componentes atómicos e primitivas de layout.",
      },
      { property: "og:title", content: "Design System · InstaBench" },
      {
        property: "og:description",
        content:
          "Documentação viva do sistema de design do Instagram Benchmark Analyzer.",
      },
    ],
  }),
  component: DesignSystemPage,
});

const NAV_ITEMS = [
  { id: "tokens", label: "Tokens" },
  { id: "button", label: "Button" },
  { id: "badge", label: "Badge" },
  { id: "card", label: "Card" },
  { id: "input", label: "Input" },
  { id: "switch", label: "Switch" },
  { id: "layout", label: "Layout" },
] as const;

const SWATCHES = [
  { name: "surface-base", hex: "#0A0E1A", className: "bg-surface-base" },
  {
    name: "surface-secondary",
    hex: "#111827",
    className: "bg-surface-secondary",
  },
  {
    name: "surface-elevated",
    hex: "#1E293B",
    className: "bg-surface-elevated",
  },
  { name: "accent-primary", hex: "#06B6D4", className: "bg-accent-primary" },
  { name: "accent-luminous", hex: "#67E8F9", className: "bg-accent-luminous" },
  { name: "accent-gold", hex: "#FCD34D", className: "bg-accent-gold" },
  { name: "signal-success", hex: "#10B981", className: "bg-signal-success" },
  { name: "signal-warning", hex: "#F59E0B", className: "bg-signal-warning" },
  { name: "signal-danger", hex: "#EF4444", className: "bg-signal-danger" },
] as const;

const CONTAINER_SIZES = [
  { label: "sm · max-w-3xl", widthClass: "max-w-3xl" },
  { label: "md · max-w-5xl", widthClass: "max-w-5xl" },
  { label: "lg · max-w-7xl", widthClass: "max-w-7xl" },
  { label: "xl · max-w-[1440px]", widthClass: "max-w-[1440px]" },
  { label: "full · w-full", widthClass: "w-full" },
] as const;

function DSNav() {
  return (
    <nav aria-label="Design system sections">
      <p className="font-mono text-xs uppercase tracking-wide text-content-tertiary mb-6 hidden lg:block">
        Design system · v0.1
      </p>
      <ul className="hidden lg:flex lg:flex-col">
        {NAV_ITEMS.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="block py-2 pl-4 font-mono text-xs uppercase tracking-wide text-content-tertiary border-l-2 border-transparent hover:border-accent-primary hover:text-content-primary transition-colors"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      <ul className="lg:hidden flex gap-4 overflow-x-auto pb-4 mb-8 border-b border-border-subtle">
        {NAV_ITEMS.map((item) => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              className="font-mono text-xs uppercase tracking-wide text-content-tertiary hover:text-content-primary transition-colors"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function DSHero() {
  return (
    <header className="mb-16">
      <p className="font-mono text-xs uppercase tracking-wide text-content-tertiary mb-4">
        Living documentation · Sprint 0 completo
      </p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-content-primary mb-4">
        Design System
      </h1>
      <p className="font-sans text-lg text-content-secondary leading-relaxed max-w-2xl">
        A base cromática, tipográfica e de componentes do Instagram Benchmark
        Analyzer. Todos os elementos consomem tokens do ficheiro tokens.css.
        Dark-mode-first, editorial, cinematográfico.
      </p>
    </header>
  );
}

function DesignSystemPage() {
  return (
    <Container size="xl" className="py-12">
      <div className="grid lg:grid-cols-[200px_1fr] gap-12">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <DSNav />
        </aside>

        <main className="min-w-0">
          <DSHero />

          {/* Section 1 — Tokens */}
          <DSSection
            id="tokens"
            label="FOUNDATION"
            title="Tokens"
            description="A paleta cromática e a escala tipográfica que sustentam todo o produto. Cada cor e cada tamanho de texto vivem em src/styles/tokens.css."
          >
            <DSExample label="SURFACES & ACCENTS">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {SWATCHES.map((s) => (
                  <div key={s.name} className="space-y-2">
                    <div
                      className={`${s.className} h-20 rounded-lg border border-border-subtle`}
                    />
                    <p className="font-mono text-xs text-content-primary">
                      {s.name}
                    </p>
                    <p className="font-mono text-xs text-content-tertiary">
                      {s.hex}
                    </p>
                  </div>
                ))}
              </div>
            </DSExample>

            <DSExample label="TYPOGRAPHIC SCALE">
              <div className="space-y-6">
                {[
                  { sample: "Aa", className: "font-display text-5xl font-semibold", label: "Display 5xl · Fraunces 600" },
                  { sample: "Aa", className: "font-display text-4xl font-semibold", label: "Display 4xl · Fraunces 600" },
                  { sample: "Aa", className: "font-display text-3xl font-semibold", label: "Display 3xl · Fraunces 600" },
                  { sample: "The quick brown fox jumps", className: "font-sans text-lg", label: "Body lg · Inter 400" },
                  { sample: "The quick brown fox jumps", className: "font-sans text-base", label: "Body base · Inter 400" },
                  { sample: "ENGAGEMENT · 0.52%", className: "font-mono text-sm font-medium", label: "Mono sm · JetBrains Mono 500" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 pb-4 border-b border-border-subtle last:border-0"
                  >
                    <span className={`${row.className} text-content-primary`}>
                      {row.sample}
                    </span>
                    <span className="font-mono text-xs uppercase tracking-wide text-content-tertiary">
                      {row.label}
                    </span>
                  </div>
                ))}
              </div>
            </DSExample>
          </DSSection>

          {/* Section 2 — Button */}
          <DSSection
            id="button"
            label="ATOMS"
            title="Button"
            description="Sete variantes para cobrir desde acções primárias premium a links inline. Suporta ícones, loading e estados desactivados."
          >
            <DSExample label="VARIANTS">
              <div className="flex flex-wrap items-center gap-4">
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
                <p className="flex items-baseline gap-1 text-base text-content-secondary basis-full">
                  Em contexto inline:
                  <Button variant="link">saber mais →</Button>
                </p>
              </div>
            </DSExample>

            <DSExample label="SIZES">
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" size="sm">Small</Button>
                <Button variant="primary" size="md">Medium</Button>
                <Button variant="primary" size="lg">Large</Button>
                <Button size="icon" variant="primary" aria-label="Confirmar">
                  <Check />
                </Button>
              </div>
            </DSExample>

            <DSExample label="STATES">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <Button variant="primary" loading>A processar</Button>
                  <Button variant="primary" disabled>Desativado</Button>
                  <Button variant="secondary" loading>A guardar</Button>
                </div>
                <p className="font-mono text-xs uppercase tracking-wide text-content-tertiary">
                  Hover é interactivo — passar o cursor sobre qualquer botão para visualizar.
                </p>
              </div>
            </DSExample>

            <DSExample label="WITH ICONS">
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" leftIcon={<Sparkles />}>
                  Gerar relatório
                </Button>
                <Button variant="secondary" rightIcon={<ArrowRight />}>
                  Continuar
                </Button>
                <Button size="icon" aria-label="Pesquisar">
                  <Search />
                </Button>
              </div>
            </DSExample>
          </DSSection>

          {/* Section 3 — Badge */}
          <DSSection
            id="badge"
            label="ATOMS"
            title="Badge"
            description="Etiquetas compactas para sinalizar estado, categoria ou nível premium. Suportam pontos com pulsação e ícones."
          >
            <DSExample label="STATUS VARIANTS">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="default">Neutro</Badge>
                <Badge variant="success">Acima benchmark</Badge>
                <Badge variant="warning">Em linha</Badge>
                <Badge variant="danger">Abaixo</Badge>
                <Badge variant="accent">Novo</Badge>
                <Badge variant="premium">Pro</Badge>
                <Badge variant="solid">New</Badge>
              </div>
            </DSExample>

            <DSExample label="SIZES">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="accent" size="sm">Small</Badge>
                <Badge variant="accent" size="md">Medium</Badge>
                <Badge variant="accent" size="lg">Large</Badge>
              </div>
            </DSExample>

            <DSExample label="WITH DOT">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="success" size="md" dot>Live</Badge>
                <Badge variant="accent" size="md" dot>Updated</Badge>
                <Badge variant="warning" size="md" dot pulse>Pending</Badge>
                <Badge variant="danger" size="md" dot pulse>Down</Badge>
              </div>
            </DSExample>

            <DSExample label="WITH ICONS">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="premium" leftIcon={<Sparkles />}>Agency</Badge>
                <Badge variant="success" leftIcon={<Check />}>Verificado</Badge>
              </div>
            </DSExample>
          </DSSection>

          {/* Section 4 — Card */}
          <DSSection
            id="card"
            label="CONTAINERS"
            title="Card"
            description="Superfícies elevadas para agrupar conteúdo. Cinco variantes — incluindo glass e interactive — e três tamanhos de padding."
          >
            <DSExample label="VARIANTS">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <Button variant="secondary" size="sm">Ver detalhes</Button>
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
                    <Button variant="secondary" size="sm">Ver detalhes</Button>
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
                    <Button variant="secondary" size="sm">Ver detalhes</Button>
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
                    Acompanhar concorrentes com alertas automáticos.
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
                      Inserir um username do Instagram para iniciar
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
              </div>
            </DSExample>

            <DSExample label="PADDING SIZES">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card variant="default" padding="sm">
                  <p className="font-mono text-xs uppercase tracking-wide text-content-tertiary mb-2">
                    padding=sm
                  </p>
                  <p className="text-sm text-content-secondary">
                    Compacto, ideal para listas densas.
                  </p>
                </Card>
                <Card variant="default" padding="md">
                  <p className="font-mono text-xs uppercase tracking-wide text-content-tertiary mb-2">
                    padding=md
                  </p>
                  <p className="text-sm text-content-secondary">
                    Padrão para a maioria dos casos.
                  </p>
                </Card>
                <Card variant="default" padding="lg">
                  <p className="font-mono text-xs uppercase tracking-wide text-content-tertiary mb-2">
                    padding=lg
                  </p>
                  <p className="text-sm text-content-secondary">
                    Mais respiração, para destaque editorial.
                  </p>
                </Card>
                <Card variant="default" padding="none">
                  <div className="p-3">
                    <p className="font-mono text-xs uppercase tracking-wide text-content-tertiary mb-2">
                      padding=none
                    </p>
                    <p className="text-sm text-content-secondary">
                      Padding controlado manualmente.
                    </p>
                  </div>
                </Card>
              </div>
            </DSExample>
          </DSSection>

          {/* Section 5 — Input */}
          <DSSection
            id="input"
            label="ATOMS"
            title="Input"
            description="Três variantes (default, glass, ghost), três tamanhos e suporte completo para ícones, estado de erro e desactivação."
          >
            <DSExample label="DEFAULT VARIANT">
              <div className="space-y-6 max-w-md">
                <div>
                  <InputLabel htmlFor="ds-username">
                    Username do Instagram
                  </InputLabel>
                  <Input
                    id="ds-username"
                    placeholder="@username ou URL"
                    leftIcon={<AtSign />}
                  />
                  <InputHelper>Aceita @username, username ou URL completo</InputHelper>
                </div>

                <div>
                  <InputLabel htmlFor="ds-search-default">
                    Pesquisar análises
                  </InputLabel>
                  <Input
                    id="ds-search-default"
                    placeholder="Pesquisa por data ou nome"
                    rightIcon={<Search />}
                  />
                </div>

                <div>
                  <InputLabel htmlFor="ds-email">Endereço de email</InputLabel>
                  <Input
                    id="ds-email"
                    type="email"
                    placeholder="email@empresa.pt"
                  />
                </div>
              </div>
            </DSExample>

            <DSExample label="GLASS VARIANT">
              <div className="max-w-md">
                <InputLabel htmlFor="ds-search-glass">Pesquisar</InputLabel>
                <Input
                  id="ds-search-glass"
                  variant="glass"
                  placeholder="Pesquisa por data ou nome"
                  leftIcon={<Search />}
                />
              </div>
            </DSExample>

            <DSExample label="GHOST VARIANT">
              <div className="max-w-md">
                <Input variant="ghost" placeholder="Adicionar concorrente" />
              </div>
            </DSExample>

            <DSExample label="SIZES">
              <div className="space-y-3 max-w-md">
                <Input inputSize="sm" placeholder="Small" />
                <Input inputSize="md" placeholder="Medium" />
                <Input inputSize="lg" placeholder="Large" />
              </div>
            </DSExample>

            <DSExample label="STATES">
              <div className="space-y-6 max-w-md">
                <div>
                  <InputLabel htmlFor="ds-email-error">
                    Endereço de email
                  </InputLabel>
                  <Input
                    id="ds-email-error"
                    type="email"
                    defaultValue="not-valid-email"
                    error
                  />
                  <InputHelper error>Endereço de email inválido</InputHelper>
                </div>
                <div>
                  <InputLabel htmlFor="ds-plan-disabled">Plano</InputLabel>
                  <Input id="ds-plan-disabled" defaultValue="Gratuito" disabled />
                </div>
              </div>
            </DSExample>
          </DSSection>

          {/* Section 6 — Switch */}
          <DSSection
            id="switch"
            label="ATOMS"
            title="Switch"
            description="Alternador binário em três tamanhos. Suporta estado controlado, valor por defeito e desactivação."
          >
            <DSExample label="SIZES">
              <div className="space-y-4 max-w-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-content-secondary">Small</span>
                  <Switch size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-content-secondary">Medium</span>
                  <Switch size="md" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-content-secondary">Large</span>
                  <Switch size="lg" />
                </div>
              </div>
            </DSExample>

            <DSExample label="STATES">
              <div className="space-y-4 max-w-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-content-secondary">Off</span>
                  <Switch size="md" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-content-secondary">On</span>
                  <Switch size="md" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-content-secondary">
                    Disabled · off
                  </span>
                  <Switch size="md" disabled />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-content-secondary">
                    Disabled · on
                  </span>
                  <Switch size="md" defaultChecked disabled />
                </div>
              </div>
            </DSExample>
          </DSSection>

          {/* Section 7 — Layout */}
          <DSSection
            id="layout"
            label="PRIMITIVES"
            title="Layout"
            description="Container constrange a largura horizontal com padding responsivo. Cinco tamanhos cobrem desde leitura focada a tabelas largas."
          >
            <DSExample label="CONTAINER SIZES">
              <div className="space-y-4">
                {CONTAINER_SIZES.map((c) => (
                  <div key={c.label} className="space-y-2">
                    <p className="font-mono text-xs uppercase tracking-wide text-content-tertiary">
                      SIZE {c.label}
                    </p>
                    <div
                      className={`${c.widthClass} mx-auto h-12 border border-border-subtle bg-surface-secondary/40 rounded-md flex items-center px-4`}
                    >
                      <span className="font-mono text-xs text-content-tertiary">
                        {c.widthClass}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </DSExample>
          </DSSection>
        </main>
      </div>
    </Container>
  );
}
