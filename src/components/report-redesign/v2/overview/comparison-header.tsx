import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompetitorModal } from "./competitor-modal";

/**
 * Auxiliary action row below the identity card.
 *
 * Two cards:
 *   1. Competitor comparison CTA (2/3 width)
 *   2. Multi-network roadmap teaser (1/3 width)
 */
export function ComparisonHeader() {
  const [modalOpen, setModalOpen] = useState(false);
  const [roadmapDismissed, setRoadmapDismissed] = useState(false);
  const [showRoadmapInfo, setShowRoadmapInfo] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3 mt-3">
        {/* ── Card 1: Competitor comparison ──────────────────────── */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label="Comparar com concorrentes diretos"
          className={cn(
            "flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 md:p-5 text-left",
            "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
            "transition-all duration-200 hover:border-slate-300 hover:shadow-[0_2px_8px_-4px_rgba(15,23,42,0.10)]",
            "cursor-pointer",
          )}
        >
          {/* Icon */}
          <div className="shrink-0 flex items-center justify-center size-10 rounded-xl bg-blue-50 text-blue-600">
            <Users className="size-5" strokeWidth={2} aria-hidden="true" />
          </div>

          {/* Copy */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 leading-snug">
              Compara com concorrentes diretos
            </p>
            <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed line-clamp-1">
              Adiciona até 2 perfis e vê o teu lado a lado em todos os blocos do relatório.
            </p>
          </div>

          {/* CTA pill */}
          <div className="shrink-0 hidden sm:flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-3.5 py-2 text-[13px] font-medium shadow-[0_1px_3px_rgba(15,23,42,0.12)] transition-colors duration-150 hover:bg-slate-800">
            <Plus className="size-3.5" aria-hidden="true" />
            <span>Adicionar</span>
            <span className="ml-0.5 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.04em] text-amber-500 leading-none">
              PRO
            </span>
          </div>

          {/* Mobile-only small CTA */}
          <div className="shrink-0 sm:hidden flex items-center justify-center size-9 rounded-lg bg-slate-900 text-white">
            <Plus className="size-4" aria-hidden="true" />
          </div>
        </button>

        {/* ── Card 2: Multi-network roadmap ──────────────────────── */}
        <button
          type="button"
          onClick={() => setShowRoadmapInfo(true)}
          aria-label="Em breve: análise de outras redes"
          title="Em breve: análise de outras redes"
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4 md:p-5 text-left",
            "transition-all duration-200 hover:border-slate-300",
            "cursor-pointer",
          )}
        >
          {/* Stacked social icons */}
          <div
            className="shrink-0 flex items-center -space-x-2"
            role="img"
            aria-label="Redes futuras: Facebook, TikTok e YouTube"
          >
            <SocialCircle letter="f" bg="bg-blue-600" />
            <SocialCircle letter="t" bg="bg-slate-900" />
            <SocialCircle letter="Y" bg="bg-red-600" />
          </div>

          {/* Copy */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-900 leading-snug">
                Adicionar outra rede
              </span>
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-600 leading-none">
                Em breve
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Facebook · TikTok · YouTube
            </p>
          </div>
        </button>
      </div>

      {/* Existing competitor modal */}
      <CompetitorModal open={modalOpen} onOpenChange={setModalOpen} />

      {/* Lightweight roadmap info dialog */}
      {showRoadmapInfo && (
        <RoadmapInfoDialog onClose={() => setShowRoadmapInfo(false)} />
      )}
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

/** Small circular placeholder for a social network brand icon. */
function SocialCircle({ letter, bg }: { letter: string; bg: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center size-7 rounded-full text-white text-[11px] font-bold leading-none ring-2 ring-white",
        bg,
      )}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}

/** Lightweight informational modal for the multi-network roadmap. */
function RoadmapInfoDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Informação sobre redes futuras"
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-slate-200/70 bg-white p-6 shadow-lg animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-semibold text-slate-900">
          Em breve
        </p>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Análise de Facebook, TikTok e YouTube. Estamos a preparar tudo para que possas analisar todas as tuas redes num único relatório.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-800"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
