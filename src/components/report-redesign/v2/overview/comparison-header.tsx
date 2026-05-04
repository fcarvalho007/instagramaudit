import { useState } from "react";
import { Plus, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompetitorModal } from "./competitor-modal";

/**
 * Banner diferenciador: CTA para comparação com concorrentes.
 * Posicionado acima do bloco 01, destaque visual premium.
 */
export function ComparisonHeader() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 px-5 py-4 md:px-6 md:py-5 shadow-[0_1px_3px_rgba(59,130,246,0.06),0_8px_24px_-12px_rgba(59,130,246,0.10)]">
        <div className="flex items-center gap-4 md:gap-5">
          {/* Icon */}
          <div className="shrink-0 flex items-center justify-center size-10 md:size-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-[0_2px_8px_-2px_rgba(59,130,246,0.45)]">
            <Users className="size-5 text-white" strokeWidth={2} aria-hidden="true" />
          </div>

          {/* Copy */}
          <div className="flex-1 min-w-0">
            <p className="text-sm md:text-[15px] font-semibold text-content-primary leading-snug">
              Compara com concorrentes diretos
            </p>
            <p className="text-[12px] md:text-[13px] text-content-secondary mt-0.5 leading-relaxed">
              Vê o teu perfil lado a lado com perfis do mesmo nicho
            </p>
          </div>

          {/* CTA */}
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="shrink-0 gap-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.12)] transition-all duration-200 hover:shadow-[0_2px_8px_rgba(15,23,42,0.18)] h-9 px-4"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Concorrente</span>
            <span className="ml-1 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.04em] text-amber-600 leading-none">
              PRO
            </span>
            <ArrowRight className="size-3.5 ml-0.5 hidden sm:block" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <CompetitorModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
