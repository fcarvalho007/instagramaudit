import { ArrowRight, Check } from "lucide-react";

import { CheckoutPrimaryButton } from "@/components/checkout/checkout-primary-button";

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
      <div className="overflow-hidden rounded-2xl border border-border-default shadow-[0_18px_48px_-32px_rgba(15,23,42,0.18)]">
        <div className="bg-[rgb(var(--text-primary))] px-5 py-5 sm:px-6 sm:py-6">
          <span className="block text-eyebrow-sm text-[rgb(var(--accent-luminous))]">
            Adicionar diagnóstico humano
          </span>
          <h2 className="mt-2 font-fraunces text-2xl sm:text-[28px] font-medium text-[rgb(var(--text-inverse))]">
            Diagnóstico de Autoridade Digital
          </h2>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-fraunces text-5xl font-semibold text-[rgb(var(--text-inverse))] tabular-nums leading-none">
              97€
            </span>
            <span className="font-fraunces text-xl text-[rgb(var(--text-inverse))]/50 line-through tabular-nums">
              149€
            </span>
            <span className="text-xs text-[rgb(var(--accent-luminous))]">
              total · em vez de 9€
            </span>
          </div>
        </div>
        <div className="bg-white px-5 py-5 sm:px-6 sm:py-6">
          <ul className="space-y-2.5">
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
          <CheckoutPrimaryButton
            type="button"
            onClick={onAccept}
            disabled={disabled}
            className="mt-5 w-full gap-2"
          >
            Sim, quero o diagnóstico humano
            <ArrowRight className="size-4" aria-hidden="true" />
          </CheckoutPrimaryButton>
        </div>
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