import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trackEvent } from "@/lib/tracking.functions";
import { cn } from "@/lib/utils";

export type PricingOption =
  | "single_3_eur"
  | "bundle_13_eur"
  | "monthly"
  | "agency";

interface OptionDef {
  id: PricingOption;
  title: string;
  price: string;
  description: string;
  badge?: string;
}

const OPTIONS: readonly OptionDef[] = [
  {
    id: "single_3_eur",
    title: "Relatório único",
    price: "Em estudo",
    description: "Um perfil, um relatório completo.",
  },
  {
    id: "bundle_13_eur",
    title: "Bundle 5 relatórios",
    price: "Em estudo",
    description: "Cinco perfis. Poupa face ao avulso.",
  },
  {
    id: "monthly",
    title: "Plano mensal",
    price: "Em estudo",
    description: "Análises recorrentes do mesmo perfil.",
    badge: "Em breve",
  },
  {
    id: "agency",
    title: "Agência",
    price: "Sob proposta",
    description: "Múltiplas marcas, dashboards e exportações.",
    badge: "Falamos contigo",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string | null;
  handle: string | null;
  variant: string;
  sourceComponent: string;
}

export function PremiumInterestDialog({
  open,
  onOpenChange,
  snapshotId,
  handle,
  variant,
  sourceComponent,
}: Props) {
  const [registered, setRegistered] = useState<Set<PricingOption>>(new Set());

  const handleSelect = (option: PricingOption) => {
    if (registered.has(option)) return;
    setRegistered((prev) => {
      const next = new Set(prev);
      next.add(option);
      return next;
    });
    trackEvent({
      data: {
        eventType: "pricing_option_clicked",
        snapshotId: snapshotId ?? undefined,
        handle: handle ?? undefined,
        metadata: {
          pricing_option: option,
          variant,
          source_component: sourceComponent,
        },
      },
    }).catch(() => {});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Desbloquear relatório completo
          </DialogTitle>
          <DialogDescription>
            Estamos a recolher interesse para definir os preços finais.
            Escolhe a opção que faz sentido — sem pagamento agora.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
          {OPTIONS.map((opt) => {
            const done = registered.has(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                aria-pressed={done}
                className={cn(
                  "text-left rounded-xl border p-3 transition-colors",
                  "border-border-default bg-surface-base",
                  "hover:border-accent-primary/40 hover:bg-surface-muted",
                  done && "border-accent-primary/60 bg-accent-primary/[0.04]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-content-primary">
                      {opt.title}
                    </p>
                    <p className="text-xs text-content-secondary mt-0.5 tabular-nums">
                      {opt.price}
                    </p>
                  </div>
                  {done ? (
                    <span
                      className="inline-flex items-center gap-1 text-eyebrow-sm text-accent-primary shrink-0"
                      aria-label="Interesse registado"
                    >
                      <Check className="size-3" aria-hidden="true" />
                      Registado
                    </span>
                  ) : opt.badge ? (
                    <span className="text-eyebrow-sm text-content-tertiary shrink-0">
                      {opt.badge}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-content-tertiary mt-2 leading-relaxed">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>

        <DialogFooter className="mt-2">
          <p className="text-xs text-content-tertiary flex items-center gap-1.5">
            <Sparkles className="size-3" aria-hidden="true" />
            Sem pagamento agora. Voltamos a falar contigo.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}