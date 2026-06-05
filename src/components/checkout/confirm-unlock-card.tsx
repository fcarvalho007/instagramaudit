import { Check } from "lucide-react";

const BULLETS = [
  "Diagnóstico editorial",
  "Desempenho",
  "Conteúdo",
  "Procura",
  "Comparação",
  "Recomendações práticas",
];

/**
 * Visual confirmation card for the focused 9€ "Relatório completo" checkout.
 * Editorial counterpart of OfferCard (97€), simpler and price-led.
 */
export function ConfirmUnlockCard() {
  return (
    <div className="rounded-xl border border-border-default bg-white p-5 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.18)]">
      <p className="text-eyebrow-sm text-content-tertiary">Oferta</p>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <p className="text-base font-semibold text-content-primary">
          Relatório completo
        </p>
        <p className="text-3xl font-bold text-content-primary tabular-nums leading-none">
          9€
        </p>
      </div>
      <p className="mt-1 text-xs text-content-tertiary">
        pagamento único · sem subscrição
      </p>
      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4">
        {BULLETS.map((b) => (
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
      <p className="mt-4 pt-4 border-t border-border-default text-xs text-content-tertiary">
        Pagamento seguro. Acesso associado à tua conta.
      </p>
    </div>
  );
}