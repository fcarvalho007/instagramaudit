import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Briefcase, Check, GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/tracking.functions";
import { ReserveDiagnosisButton } from "@/components/payments/reserve-diagnosis-button";
import { CouponInput } from "./coupon-input";
import { PricingFAQ } from "./pricing-faq";

const SOURCE = "pricing_page";

export function PricingPage() {
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState<string | null>(null);

  const track = (option: string) => {
    trackEvent({
      data: {
        eventType: "pricing_option_clicked",
        metadata: { pricing_option: option, source_component: SOURCE },
      },
    }).catch(() => {});
  };

  return (
    <main className="min-h-screen bg-surface-base">
      {/* Zona 1 — cabeçalho */}
      <section className="mx-auto max-w-3xl px-4 pt-16 pb-10 sm:pt-24 text-center">
        <h1 className="font-fraunces text-4xl sm:text-5xl font-medium tracking-tight text-content-primary">
          Do diagnóstico automático à leitura humana.
        </h1>
        <p className="mt-4 text-base text-content-secondary leading-relaxed">
          Começa grátis. Sobe quando quiseres mais profundidade — sem
          subscrição, pagas só o que usas.
        </p>
      </section>

      {/* Zona 2 — 3 níveis */}
      <section className="mx-auto max-w-5xl px-4 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:items-stretch">
          {/* Free */}
          <PricingCard
            chip="Incluído"
            chipTone="muted"
            title="Visão inicial"
            context="Para perceber o ponto de partida do perfil."
            price="0€"
            bullets={[
              "Índice e visão geral do perfil",
              "Métricas-base vs escalão",
              "Amostra recente",
              "Conta para guardar relatórios",
            ]}
          >
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                track("free");
                navigate({ to: "/" }).catch(() => {});
              }}
            >
              Continuar grátis
            </Button>
          </PricingCard>

          {/* Relatório completo */}
          <PricingCard
            chip="Automático"
            chipTone="primary"
            title="Relatório completo"
            context="Todo o diagnóstico, gerado automaticamente."
            price="9€"
            priceNote="por relatório · pagamento único"
            bullets={[
              "Tudo da visão inicial",
              "Diagnóstico editorial e desempenho",
              "Conteúdo, procura e comparação",
              "Recomendações práticas",
            ]}
          >
            <ReserveDiagnosisButton
              productCode="report_full_9"
              sourceComponent={SOURCE}
              returnPath="/precos"
              label="Desbloquear relatório"
              couponCode={coupon}
              className="w-full"
            />
          </PricingCard>

          {/* Diagnóstico — herói */}
          <PricingCard
            chip="Relatório + humano"
            chipTone="primary"
            badge="Mais útil"
            highlighted
            title="Diagnóstico de Autoridade Digital"
            context="O relatório, mais uma leitura humana dos próximos passos."
            price="97€"
            strikePrice="149€"
            priceNote="preço de lançamento · sobe para 149€"
            bullets={[
              "Relatório completo incluído",
              "Chamada de 30 minutos contigo",
              "3 prioridades de melhoria",
              "Orientação para conteúdo e posicionamento",
            ]}
          >
            <Button
              type="button"
              variant="primary"
              className="w-full gap-2"
              onClick={() => {
                track("authority_diagnosis_97");
                navigate({
                  to: "/checkout/authority-diagnosis",
                  search: {
                    source: SOURCE,
                    return: "/precos",
                    coupon: coupon ?? undefined,
                  },
                }).catch(() => {});
              }}
            >
              Reservar diagnóstico
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </PricingCard>
        </div>

        {/* Linha discreta: cupão + agência */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CouponInput
            productCode="authority_diagnosis_97"
            appliedCode={coupon}
            onApplied={setCoupon}
          />
          <Link
            to="/servicos"
            search={{ topico: "agencia" }}
            className="text-xs text-content-tertiary hover:text-accent-primary transition-colors inline-flex items-center gap-1"
            onClick={() => track("agency_link")}
          >
            Vários perfis ou clientes? Opção de agência
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Zona 3 — Serviços (dark) */}
      <section className="hero-dark landing-dark mt-16">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <p className="dark-eyebrow">Serviços · sob consulta</p>
          <h2 className="mt-3 font-fraunces text-3xl sm:text-4xl font-medium tracking-tight">
            Quando o diagnóstico precisa de ir mais longe.
          </h2>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-[rgb(var(--hero-text-secondary))] leading-relaxed">
            Para marcas e equipas que querem transformar a análise em estratégia
            e execução.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <ServiceCard
              icon={<Briefcase className="size-5" aria-hidden="true" />}
              title="Auditoria de Autoridade Digital"
              body="Vai além do Instagram: website, LinkedIn, SEO, presença de marca e funil de contacto. Plano de melhoria prioritário."
              priceAnchor="A partir de 300€"
              ctaLabel="Pedir auditoria"
              topic="auditoria"
              onClick={() => track("service_audit")}
            />
            <ServiceCard
              icon={<GraduationCap className="size-5" aria-hidden="true" />}
              title="Formação: Redes Sociais e IA"
              body="Workshop para equipas, com benchmarks reais dos perfis da marca. Dados transformados em plano editorial."
              priceAnchor="A partir de 1.500€"
              ctaLabel="Falar sobre formação"
              topic="formacao"
              onClick={() => track("service_training")}
            />
          </div>
        </div>
      </section>

      {/* Zona 4 — FAQ */}
      <PricingFAQ />
    </main>
  );
}

interface PricingCardProps {
  chip: string;
  chipTone: "muted" | "primary";
  badge?: string;
  highlighted?: boolean;
  title: string;
  context: string;
  price: string;
  strikePrice?: string;
  priceNote?: string;
  bullets: string[];
  children: React.ReactNode;
}

function PricingCard({
  chip,
  chipTone,
  badge,
  highlighted,
  title,
  context,
  price,
  strikePrice,
  priceNote,
  bullets,
  children,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-white p-6",
        "border-border-default shadow-[0_18px_48px_-32px_rgba(15,23,42,0.18)]",
        highlighted &&
          "ring-1 ring-accent-primary/25 shadow-[0_24px_60px_-30px_rgba(55,114,229,0.35)]",
      )}
    >
      {badge ? (
        <span
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full",
            "bg-accent-primary text-white px-3 py-1 text-[10px] font-semibold tracking-wide uppercase",
          )}
        >
          {badge}
        </span>
      ) : null}

      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-eyebrow-sm",
          chipTone === "muted" &&
            "bg-surface-muted text-content-tertiary ring-1 ring-border-default",
          chipTone === "primary" &&
            "bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/20",
        )}
      >
        {chip}
      </span>

      <h3 className="mt-3 font-fraunces text-xl font-medium text-content-primary">
        {title}
      </h3>
      <p className="mt-1.5 text-sm text-content-secondary leading-relaxed">
        {context}
      </p>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-content-primary tabular-nums leading-none">
          {price}
        </span>
        {strikePrice ? (
          <span className="text-base text-content-tertiary line-through tabular-nums">
            {strikePrice}
          </span>
        ) : null}
      </div>
      {priceNote ? (
        <p className="mt-1 text-xs text-content-tertiary leading-relaxed">
          {priceNote}
        </p>
      ) : null}

      <ul className="mt-5 space-y-2">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2 text-sm text-content-secondary"
          >
            <Check
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-accent-primary"
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 sm:mt-auto pt-2">{children}</div>
    </div>
  );
}

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  priceAnchor: string;
  ctaLabel: string;
  topic: "auditoria" | "formacao";
  onClick: () => void;
}

function ServiceCard({
  icon,
  title,
  body,
  priceAnchor,
  ctaLabel,
  topic,
  onClick,
}: ServiceCardProps) {
  return (
    <article className="dark-card p-6 flex flex-col">
      <div className="text-[rgb(var(--hero-cyan))]">{icon}</div>
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[rgb(var(--hero-text-secondary))] leading-relaxed flex-1">
        {body}
      </p>
      <div className="mt-5 flex items-center justify-between gap-3 border-t dark-hairline pt-4">
        <span className="text-eyebrow-sm text-[rgb(var(--hero-text-tertiary))]">
          {priceAnchor}
        </span>
        <Link
          to="/servicos"
          search={{ topico: topic }}
          onClick={onClick}
          className="inline-flex items-center gap-1 text-sm font-medium text-[rgb(var(--hero-cyan))] hover:text-[rgb(var(--hero-cyan-soft))] transition-colors"
        >
          {ctaLabel}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}