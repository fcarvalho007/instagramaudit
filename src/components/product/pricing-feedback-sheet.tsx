import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PRICING_PREFERENCES,
  PRICING_PREFERENCE_LABELS,
  type PricingPreference,
} from "@/lib/unlock-flow";
import type { PricingFeedbackTrigger } from "@/lib/pricing-feedback";

export interface PricingFeedbackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  snapshotId: string;
  trigger: PricingFeedbackTrigger;
  /** Called after the user dismisses or successfully submits. */
  onDone?: () => void;
}

type Status = "idle" | "submitting" | "success";

export function PricingFeedbackSheet({
  open,
  onOpenChange,
  leadId,
  snapshotId,
  trigger,
  onDone,
}: PricingFeedbackSheetProps) {
  const [value, setValue] = useState<PricingPreference | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleClose = (next: boolean) => {
    if (status === "submitting") return;
    if (!next) onDone?.();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!value) return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/public/pricing-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          snapshot_id: snapshotId,
          pricing_preference: value,
          trigger,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
      };
      if (!res.ok || !data.ok) {
        setStatus("idle");
        setError("Não foi possível guardar agora. Tenta novamente.");
        return;
      }
      setStatus("success");
      window.setTimeout(() => {
        onDone?.();
        onOpenChange(false);
      }, 1500);
    } catch {
      setStatus("idle");
      setError("Erro de ligação. Verifica a tua internet e tenta novamente.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="sm:max-w-md sm:left-auto sm:right-6 sm:bottom-6 sm:rounded-2xl sm:h-auto sm:max-h-[85vh] border-border-default/60 p-6 sm:p-7"
      >
        {status === "success" ? (
          <SuccessState />
        ) : (
          <>
            <SheetHeader className="text-left space-y-2 mb-5">
              <p className="text-eyebrow-sm text-content-tertiary">
                Ajuda-nos a definir o preço
              </p>
              <SheetTitle className="font-display text-[24px] sm:text-[26px] leading-[1.15] tracking-[-0.01em] text-content-primary">
                Quanto pagarias por um relatório completo?
              </SheetTitle>
              <SheetDescription className="text-[13px] text-content-secondary leading-relaxed">
                Uso único. Resposta anónima — só nos serve para perceber valor justo.
              </SheetDescription>
            </SheetHeader>

            <div
              role="radiogroup"
              aria-label="Preferência de preço"
              className="grid gap-2"
            >
              {PRICING_PREFERENCES.map((opt) => {
                const selected = value === opt;
                return (
                  <label
                    key={opt}
                    className={cn(
                      "group flex items-center gap-3 min-h-12 px-4 py-3.5 rounded-xl border cursor-pointer transition-all duration-150",
                      selected
                        ? "border-primary bg-primary/[0.04] shadow-[0_0_0_1px_rgb(var(--accent-primary)/0.20)]"
                        : "border-border-default/60 hover:border-border-default hover:bg-surface-muted/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="pricing_preference"
                      value={opt}
                      checked={selected}
                      onChange={() => setValue(opt)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "relative flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        selected
                          ? "border-primary"
                          : "border-border-default group-hover:border-border-strong",
                      )}
                    >
                      <span
                        className={cn(
                          "size-2 rounded-full bg-primary transition-transform duration-150",
                          selected ? "scale-100" : "scale-0",
                        )}
                      />
                    </span>
                    <span className="text-[14px] text-content-primary leading-snug">
                      {PRICING_PREFERENCE_LABELS[opt]}
                    </span>
                  </label>
                );
              })}
            </div>

            {error ? (
              <p className="mt-3 text-xs text-destructive">{error}</p>
            ) : null}

            <div className="mt-6 flex gap-3 pt-5 border-t border-border-default/40 -mx-6 sm:-mx-7 px-6 sm:px-7">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => handleClose(false)}
                disabled={status === "submitting"}
                className="rounded-lg text-content-tertiary hover:text-content-secondary"
              >
                Saltar
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={() => void handleSubmit()}
                disabled={!value || status === "submitting"}
                className="flex-1 rounded-lg font-medium"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    A guardar…
                  </>
                ) : (
                  "Enviar resposta"
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SuccessState() {
  return (
    <div className="flex flex-col items-start gap-4 py-4">
      <div className="size-11 rounded-2xl bg-primary/10 flex items-center justify-center">
        <CheckCircle2 className="size-5 text-primary" aria-hidden />
      </div>
      <div className="space-y-1.5">
        <h3 className="font-display text-[22px] leading-[1.15] tracking-[-0.01em] text-content-primary">
          Obrigado pelo feedback
        </h3>
        <p className="text-[13px] text-content-secondary leading-relaxed">
          Vai ajudar-nos a desenhar o preço certo.
        </p>
      </div>
    </div>
  );
}