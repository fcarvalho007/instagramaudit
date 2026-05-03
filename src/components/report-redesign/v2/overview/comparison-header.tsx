import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompetitorModal } from "./competitor-modal";

/**
 * Faixa compacta com CTA "Adicionar concorrente PRO".
 * Não repete avatar/handle — esses já estão no Hero v2.
 */
export function ComparisonHeader() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50/60 px-4 py-3">
        <p className="text-[13px] text-slate-500">
          Compara o teu perfil com concorrentes diretos
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="shrink-0 gap-1.5 border-slate-200 bg-white hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Adicionar concorrente</span>
          <span className="sm:hidden">Concorrente</span>
          <span className="ml-0.5 rounded-sm bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.04em] text-amber-700 leading-none">
            PRO
          </span>
        </Button>
      </div>

      <CompetitorModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
