import {
  ArrowRight,
  Crown,
  FileText,
  Mail,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConversionState = "acquisition" | "requested" | "limit-reached";

interface PostAnalysisConversionLayerProps {
  state: ConversionState;
  onPrimaryAction: () => void;
  username?: string;
}

const PRO_MAILTO =
  "mailto:hello@instabench.pt?subject=Acesso%20Pro%20—%20InstaBench&body=Pretendo%20saber%20mais%20sobre%20o%20plano%20Pro.";
const AGENCY_MAILTO =
  "mailto:hello@instabench.pt?subject=Acesso%20Agency%20—%20InstaBench&body=Pretendo%20saber%20mais%20sobre%20o%20plano%20Agency.";

const COPY: Record<
  ConversionState,
  { label: string; title: string; subtitle: string; note: string }
> = {
  acquisition: {
    label: "Próximo passo",
    title: "Receber análise completa por email",
    subtitle:
      "PDF detalhado com benchmark, comparação e leitura estratégica por IA.",
    note: "Dois relatórios gratuitos por mês · sem cartão",
  },
  requested: {
    label: "Acompanhamento",
    title: "Acompanhar este perfil ao longo do tempo",
    subtitle:
      "Novas análises, comparações regulares e alertas de variação.",
    note: "Acesso recorrente disponível em breve",
  },
  "limit-reached": {
    label: "Opções de upgrade",
    title: "Continuar com mais relatórios este mês",
    subtitle:
      "Compra pontual disponível em breve ou acesso recorrente via Pro.",
    note: "A quota gratuita reinicia no início do próximo mês",
  },
};

export function PostAnalysisConversionLayer({
  state,
  onPrimaryAction,
}: PostAnalysisConversionLayerProps) {
  const copy = COPY[state];

  return (
    <section
      aria-labelledby="conversion-layer-heading"
      className="space-y-8"
    >
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border-subtle" aria-hidden="true" />
          <span className="text-eyebrow-sm text-[0.625rem] text-content-tertiary">
            {copy.label}
          </span>
          <span className="h-px flex-1 bg-border-subtle" aria-hidden="true" />
        </div>
        <h2
          id="conversion-layer-heading"
          className="font-display text-2xl md:text-3xl font-medium text-content-primary tracking-tight text-center"
        >
          {copy.title}
        </h2>
        <p className="font-sans text-sm md:text-base text-content-secondary text-center max-w-xl mx-auto">
          {copy.subtitle}
        </p>
      </header>

      {state === "acquisition" && (
        <div className="mx-auto max-w-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border-subtle bg-surface-secondary/40 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent-violet/10 border border-accent-violet/30 text-accent-violet-luminous shrink-0">
              <Mail className="size-4" aria-hidden="true" />
            </span>
            <div className="space-y-0.5">
              <p className="font-sans text-sm text-content-primary font-medium">
                Receber também por email
              </p>
              <p className="font-sans text-xs text-content-secondary">
                Análise completa em PDF entregue diretamente na caixa de entrada.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onPrimaryAction}
            rightIcon={<ArrowRight />}
            className="shrink-0"
          >
            Enviar análise
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* One-time purchase */}
        <article
          className={cn(
            "flex flex-col rounded-xl border border-border-default bg-surface-secondary/40 p-5 gap-4",
          )}
        >
          <header className="flex items-center gap-2">
            <FileText className="size-4 text-accent-luminous" aria-hidden="true" />
            <span className="text-eyebrow-sm text-[0.625rem] text-content-tertiary">
              Compra pontual
            </span>
          </header>
          <div className="space-y-1">
            <p className="font-display text-2xl text-content-primary font-medium tracking-tight">
              3 €
            </p>
            <p className="font-sans text-sm text-content-secondary">
              1 relatório adicional · pagamento único
            </p>
          </div>
          <ul className="space-y-1.5 text-xs text-content-secondary font-sans">
            <li>· PDF completo entregue por email</li>
            <li>· Sem subscrição</li>
          </ul>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled
            className="w-full mt-auto"
            title="Disponível em breve"
          >
            Em breve
          </Button>
        </article>

        {/* Pro — recommended */}
        <article className="relative flex flex-col rounded-xl border border-accent-gold/40 bg-accent-gold/5 p-5 gap-4 shadow-glow-gold">
          <span className="text-eyebrow-sm absolute -top-2 right-4 rounded-full bg-accent-gold px-2 py-0.5 text-[0.5625rem] text-text-inverse">
            Recomendado
          </span>
          <header className="flex items-center gap-2">
            <Crown className="size-4 text-accent-gold" aria-hidden="true" />
            <span className="text-eyebrow-sm text-[0.625rem] text-accent-gold">
              Pro
            </span>
          </header>
          <div className="space-y-1">
            <p className="font-display text-2xl text-content-primary font-medium tracking-tight">
              10 € <span className="text-base text-content-secondary font-normal">/mês</span>
            </p>
            <p className="font-sans text-sm text-content-secondary">
              Acompanhamento contínuo · acesso recorrente
            </p>
          </div>
          <ul className="space-y-1.5 text-xs text-content-secondary font-sans">
            <li>· Relatórios ilimitados</li>
            <li>· Acompanhamento de concorrentes</li>
            <li>· Alertas de variação</li>
          </ul>
          <Button
            type="button"
            variant="premium"
            size="sm"
            asChild
            className="w-full mt-auto"
            rightIcon={<Sparkles />}
          >
            <a href={PRO_MAILTO}>Pedir acesso Pro</a>
          </Button>
        </article>

        {/* Agency */}
        <article className="flex flex-col rounded-xl border border-border-default bg-surface-secondary/40 p-5 gap-4">
          <header className="flex items-center gap-2">
            <Users className="size-4 text-content-tertiary" aria-hidden="true" />
            <span className="text-eyebrow-sm text-[0.625rem] text-content-tertiary">
              Agency
            </span>
          </header>
          <div className="space-y-1">
            <p className="font-display text-2xl text-content-primary font-medium tracking-tight">
              39 € <span className="text-base text-content-secondary font-normal">/mês</span>
            </p>
            <p className="font-sans text-sm text-content-secondary">
              Multi-marca · relatórios white-label
            </p>
          </div>
          <ul className="space-y-1.5 text-xs text-content-secondary font-sans">
            <li>· Vários perfis em paralelo</li>
            <li>· Marca branca para clientes</li>
            <li>· Fluxos de equipa</li>
          </ul>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            asChild
            className="w-full mt-auto"
          >
            <a href={AGENCY_MAILTO}>Saber mais</a>
          </Button>
        </article>
      </div>

      <p className="text-eyebrow-sm text-[0.625rem] text-content-tertiary text-center">
        {copy.note}
      </p>
    </section>
  );
}
