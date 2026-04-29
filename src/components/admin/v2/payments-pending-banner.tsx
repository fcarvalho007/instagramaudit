/**
 * PaymentsPendingBanner — chip/aviso visível mostrado em secções que
 * dependem da integração de checkout (EuPago/Stripe) para terem dados reais.
 *
 * Aparece sempre por cima da secção (Funil, Receita, etc.) para que o admin
 * perceba imediatamente porque é que os valores estão a zero.
 */

import { AlertCircle } from "lucide-react";

interface PaymentsPendingBannerProps {
  /** Frase curta a explicar o que falta (ex.: "Aguarda integração EuPago"). */
  reason?: string;
}

export function PaymentsPendingBanner({
  reason = "Aguarda integração de pagamentos (EuPago/Stripe). Receita, MRR e funil de checkout ficam a zero até o checkout estar ligado.",
}: PaymentsPendingBannerProps) {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-md border border-admin-expense-500/30 bg-admin-expense-50 px-3 py-2 text-[12px] leading-relaxed text-admin-expense-900"
    >
      <AlertCircle size={14} className="mt-0.5 shrink-0 text-admin-expense-700" />
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">Pagamentos por ligar</span>
        <span className="text-admin-expense-700">{reason}</span>
      </div>
    </div>
  );
}