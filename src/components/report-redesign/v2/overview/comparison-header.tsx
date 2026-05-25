import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { CompetitorModal } from "./competitor-modal";

/**
 * Zone 3 — Auxiliary action row below the identity card.
 *
 * Two cards:
 *   1. Competitor comparison CTA (2/3 width)
 *   2. Multi-network roadmap teaser (1/3 width)
 */
export function ComparisonHeader() {
  const { t } = useTranslation("report");
  const [modalOpen, setModalOpen] = useState(false);
  const [showRoadmapInfo, setShowRoadmapInfo] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3 mt-2">
        {/* ── Card 1: Competitor comparison ──────────────────────── */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label={t("comparison.cta_aria")}
          className={cn(
            "flex items-center gap-4 rounded-xl border border-border-default bg-white p-3.5 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
            "transition-all duration-200 hover:border-accent-primary/30",
            "cursor-pointer",
          )}
        >
          {/* Icon */}
          <div className="shrink-0 flex items-center justify-center size-9 rounded-lg bg-tint-primary text-accent-primary">
            <Users className="size-[18px]" strokeWidth={2} aria-hidden="true" />
          </div>

          {/* Copy */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-content-primary leading-snug">
              {t("comparison.cta_title")}
            </p>
            <p className="text-xs text-content-secondary mt-0.5 leading-relaxed line-clamp-1">
              {t("comparison.cta_description")}
            </p>
          </div>

          {/* CTA pill — intentional dark primary CTA */}
          <div className="shrink-0 hidden sm:flex items-center gap-1.5 rounded-full bg-content-primary text-white px-3 py-1.5 text-xs font-medium shadow-[0_1px_3px_rgba(15,23,42,0.12)] transition-colors duration-150 hover:bg-content-primary/90">
            <Plus className="size-3.5" aria-hidden="true" />
            <span>{t("comparison.cta_add")}</span>
            {/* PRO badge — local decorative amber/gold accent */}
            <span className="ml-0.5 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.04em] text-amber-500 leading-none">
              PRO
            </span>
          </div>

          {/* Mobile-only small CTA — intentional dark primary */}
          <div className="shrink-0 sm:hidden flex items-center justify-center size-9 rounded-lg bg-content-primary text-white">
            <Plus className="size-4" aria-hidden="true" />
          </div>
        </button>

        {/* ── Card 2: Multi-network roadmap ──────────────────────── */}
        <button
          type="button"
          onClick={() => setShowRoadmapInfo(true)}
          aria-label={t("comparison.roadmap_aria")}
          title={t("comparison.roadmap_title")}
          className={cn(
            "flex items-center gap-3 rounded-xl border border-border-default bg-white p-3.5 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
            "transition-all duration-200 hover:border-border-strong",
            "cursor-pointer",
          )}
        >
          {/* Stacked social icons — local decorative brand-approximate colours */}
          <div
            className="shrink-0 flex items-center -space-x-2"
            role="img"
            aria-label={t("comparison.roadmap_networks_alt")}
          >
            <SocialCircle letter="f" bg="bg-blue-600" />
            <SocialCircle letter="t" bg="bg-content-primary" />
            <SocialCircle letter="Y" bg="bg-red-600" />
          </div>

          {/* Copy */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-content-primary leading-snug">
                {t("comparison.roadmap_card_title")}
              </span>
            </div>
            <p className="text-xs text-content-tertiary mt-0.5 leading-relaxed">
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
  const { t } = useTranslation("report");
  const btnRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    btnRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      previousFocus.current?.focus();
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="roadmap-dialog-title"
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-border-default bg-surface-secondary p-6 shadow-lg animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="roadmap-dialog-title" className="text-base font-semibold text-content-primary">
          {t("comparison.roadmap_dialog_title")}
        </p>
        <p className="mt-2 text-sm text-content-secondary leading-relaxed">
          {t("comparison.roadmap_dialog_body")}
        </p>
        <button
          ref={btnRef}
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-content-primary py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-content-primary/90"
        >
          {t("comparison.roadmap_dialog_ok")}
        </button>
      </div>
    </div>
  );
}
