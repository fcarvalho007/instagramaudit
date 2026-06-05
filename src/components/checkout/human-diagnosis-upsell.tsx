import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  onAccept: () => void;
  onDecline: () => void;
  disabled?: boolean;
}

const BULLETS = [
  "Relatório completo incluído",
  "Chamada de 30 minutos com um humano",
  "3 prioridades de melhoria claras",
  "Orientação para conteúdo e posicionamento",
];

export function HumanDiagnosisUpsell({ onAccept, onDecline, disabled }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border-default bg-white p-5 sm:p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.18)]">
        <span className="inline-flex w-fit items-center rounded-full bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/20 px-2 py-0.5 text-eyebrow-sm">
          Adicionar diagnóstico humano
        </span>
        <h2 className="mt-3 font-fraunces text-xl sm:text-2xl font-medium text-content-primary">
          Diagnóstico de Autoridade Digital
        </h2>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-content-primary tabular-nums leading-none">
            97€
          </span>
          <span className="text-sm text-content-tertiary line-through tabular-nums">
            149€
          </span>
          <span className="text-xs text-content-tertiary">
            total · em vez de 9€
          </span>
        </div>
        <ul className="mt-4 space-y-2.5">
          {BULLETS.map((item) => (
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
        <Button
          type="button"
          variant="primary"
          onClick={onAccept}
          disabled={disabled}
          className="mt-5 w-full gap-2"
        >
          Sim, quero diagnóstico humano
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <button
        type="button"
        onClick={onDecline}
        disabled={disabled}
        className="block w-full text-center text-sm text-content-secondary underline-offset-4 hover:text-content-primary hover:underline disabled:opacity-60"
      >
        Continuar só com o relatório de 9€
      </button>
    </div>
  );
}