import { useState } from "react";
import { Plus, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompetitorModal } from "./competitor-modal";

interface ComparisonHeaderProps {
  handle: string;
  avatarUrl: string | null;
  isVerified: boolean;
  followers: number;
  postsAnalyzed: number;
  daysAnalyzed: number;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}K`;
  return String(n);
}

export function ComparisonHeader({
  handle,
  avatarUrl,
  isVerified,
  followers,
  postsAnalyzed,
  daysAnalyzed,
}: ComparisonHeaderProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-start gap-3 py-3 sm:items-center">
        {/* Avatar */}
        <div className="size-10 shrink-0 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-200/80">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={handle}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-sm font-medium text-slate-500">
              {handle.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {/* Identity + CTA */}
        <div className="min-w-0 flex-1 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-medium text-slate-900 truncate">
                @{handle}
              </span>
              {isVerified && (
                <BadgeCheck className="size-3.5 text-blue-500 shrink-0" aria-label="Verificado" />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatFollowers(followers)} seguidores · {postsAnalyzed} publicações analisadas · {daysAnalyzed} dias
            </p>
          </div>

          {/* CTA */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="shrink-0 gap-1.5 border-slate-200 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Adicionar concorrente</span>
            <span className="sm:hidden">Concorrente</span>
            <span className="ml-0.5 rounded-sm bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.04em] text-amber-700 leading-none">
              PRO
            </span>
          </Button>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-slate-200/60" />

      <CompetitorModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
