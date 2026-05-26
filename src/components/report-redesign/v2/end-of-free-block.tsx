import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/tracking.functions";
import { PremiumInterestDialog } from "./premium-interest-dialog";
import { useReportTracking } from "./report-tracking-context";

/**
 * Marca o fim do relatório público (gratuito). Sinaliza ao leitor que
 * terminou a leitura disponível, mas que há mais a caminho no Premium
 * (em desenvolvimento). Sem CTA agressivo: um único link discreto que
 * abre o mesmo PremiumInterestDialog já usado nos callouts PRO para
 * captar sinal de procura sem prometer datas.
 *
 * Posicionado em `report-shell-v2.tsx` no fim de `<main>`, apenas
 * em variantes não-gated (no gated, o paywall já comunica "há mais").
 */
export function ReportEndOfFreeBlock({ className }: { className?: string }) {
  const { snapshotId, handle, variant } = useReportTracking();
  const [dialogOpen, setDialogOpen] = useState(false);

  const openInterest = () => {
    trackEvent({
      data: {
        eventType: "unlock_clicked",
        snapshotId: snapshotId ?? undefined,
        handle: handle ?? undefined,
        metadata: {
          variant,
          source_component: "end_of_free_block",
        },
      },
    }).catch(() => {});
    setDialogOpen(true);
  };

  return (
    <section
      aria-label="Fim do relatório público"
      className={cn("py-16 sm:py-20", className)}
    >
      {/* Hairline com glyph central — fronteira editorial */}
      <div
        aria-hidden="true"
        className="mx-auto max-w-4xl flex items-center gap-4 mb-12"
      >
        <span className="h-px flex-1 bg-border-default" />
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full",
            "bg-surface-secondary ring-1 ring-border-default",
          )}
        >
          <Sparkles className="size-3.5 text-accent-gold" aria-hidden="true" />
        </span>
        <span className="h-px flex-1 bg-border-default" />
      </div>

      <div
        className={cn(
          "mx-auto max-w-3xl text-center",
          "bg-surface-secondary border border-border-default rounded-2xl",
          "px-6 py-10 sm:px-12 sm:py-14",
          "shadow-[0_2px_15px_rgba(15,23,42,0.03)]",
        )}
      >
        <p className="text-eyebrow-sm text-content-tertiary">
          Fim da leitura pública
        </p>

        <h2
          className={cn(
            "mt-5 font-display italic font-normal leading-tight",
            "text-content-primary text-3xl sm:text-4xl md:text-[2.5rem]",
          )}
        >
          Há mais por trás deste perfil
        </h2>

        <p className="mt-6 mx-auto max-w-xl text-[15px] leading-relaxed text-content-secondary">
          Esta é a leitura pública do perfil. No relatório completo entra a
          análise temporal, a leitura editorial do ritmo de publicação e o
          confronto detalhado com os concorrentes — material que ainda
          estamos a afinar.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-50 ring-1 ring-amber-200/60 px-3 py-1">
          <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
          <span className="text-eyebrow-sm text-amber-700">
            Premium · em desenvolvimento
          </span>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={openInterest}
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium",
              "text-accent-primary hover:text-accent-primary/80",
              "underline underline-offset-4 decoration-accent-primary/30",
              "hover:decoration-accent-primary transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 rounded-sm",
            )}
          >
            Avisa-me quando estiver pronto
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <PremiumInterestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        snapshotId={snapshotId}
        handle={handle}
        variant={variant}
        sourceComponent="end_of_free_block"
      />
    </section>
  );
}