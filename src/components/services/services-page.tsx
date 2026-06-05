import { useSearch } from "@tanstack/react-router";
import { Briefcase, GraduationCap } from "lucide-react";

import { ServicesInquiryForm } from "./services-inquiry-form";

type Topic = "auditoria" | "formacao" | "agencia" | "outro";

export function ServicesPage() {
  const search = useSearch({ from: "/servicos" }) as { topico?: Topic };
  const defaultTopic: Topic = search?.topico ?? "auditoria";

  return (
    <main className="min-h-screen bg-surface-base">
      {/* Dark intro band — coerente com a secção dark de /precos */}
      <section className="hero-dark landing-dark">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-24">
          <p className="dark-eyebrow">Serviços · sob consulta</p>
          <h1 className="mt-3 font-fraunces text-3xl sm:text-5xl font-medium tracking-tight">
            Quando o diagnóstico precisa de ir mais longe.
          </h1>
          <p className="mt-4 max-w-2xl text-sm sm:text-base text-[rgb(var(--hero-text-secondary))] leading-relaxed">
            Para marcas e equipas que querem transformar a análise em estratégia
            e execução. Olhamos para o teu negócio como um todo — não só para
            métricas isoladas — e definimos prioridades.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <article className="dark-card p-6">
              <Briefcase
                className="size-5 text-[rgb(var(--hero-cyan))]"
                aria-hidden="true"
              />
              <h2 className="mt-3 text-base font-semibold">
                Auditoria Digital completa
              </h2>
              <p className="mt-2 text-sm text-[rgb(var(--hero-text-secondary))] leading-relaxed">
                Para marcas que querem analisar website, Google, concorrência,
                conteúdo, reputação, email e redes sociais.
              </p>
              <p className="mt-4 text-eyebrow-sm text-[rgb(var(--hero-text-tertiary))]">
                Planos desde 499€ + IVA
              </p>
              <p className="mt-2 text-xs text-[rgb(var(--hero-text-tertiary))] leading-relaxed">
                Serviço alinhado com os planos oficiais de Auditoria Digital.
              </p>
            </article>
            <article className="dark-card p-6">
              <GraduationCap
                className="size-5 text-[rgb(var(--hero-cyan))]"
                aria-hidden="true"
              />
              <h2 className="mt-3 text-base font-semibold">
                Workshop para equipa
              </h2>
              <p className="mt-2 text-sm text-[rgb(var(--hero-text-secondary))] leading-relaxed">
                Sessão prática para transformar dados em decisões, calendário
                editorial e processos de marketing.
              </p>
              <p className="mt-4 text-eyebrow-sm text-[rgb(var(--hero-text-tertiary))]">
                Sob proposta
              </p>
              <p className="mt-2 text-xs text-[rgb(var(--hero-text-tertiary))] leading-relaxed">
                Formato ajustado à equipa, objectivos e duração.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
        <h2 className="font-fraunces text-2xl sm:text-3xl font-medium tracking-tight text-content-primary">
          Diz-nos o que precisas
        </h2>
        <p className="mt-2 text-sm text-content-secondary leading-relaxed">
          Respondemos em até 2 dias úteis com uma proposta inicial e próximos
          passos.
        </p>
        <div className="mt-8">
          <ServicesInquiryForm defaultTopic={defaultTopic} />
        </div>
      </section>
    </main>
  );
}