import { Check } from "lucide-react";

export function OfferCard() {
  return (
    <div className="rounded-2xl border border-border-default bg-white p-5 sm:p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.18)]">
      <span className="inline-flex w-fit items-center rounded-full bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/20 px-2 py-0.5 text-eyebrow-sm">
        Relatório + humano
      </span>
      <h2 className="mt-3 font-fraunces text-xl sm:text-2xl font-medium text-content-primary">
        Diagnóstico de Autoridade Digital
      </h2>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-content-primary tabular-nums leading-none">
          97€
        </span>
        <span className="text-base text-content-tertiary line-through tabular-nums">
          149€
        </span>
      </div>
      <p className="mt-1 text-xs text-content-tertiary">
        preço de lançamento · sobe para 149€
      </p>
      <ul className="mt-4 space-y-2.5">
        {[
          "Relatório completo incluído",
          "Chamada de 30 minutos contigo",
          "3 prioridades de melhoria",
          "Orientação para conteúdo e posicionamento",
          "Acompanhamento por email",
        ].map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 text-sm text-content-secondary leading-relaxed"
          >
            <Check
              className="mt-0.5 size-4 shrink-0 text-accent-primary"
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}