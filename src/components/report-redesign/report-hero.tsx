import { FileDown, Loader2 } from "lucide-react";

import type { AdapterResult, ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import type { ReportPageActions } from "@/components/report/report-page";
import { ShareReportPopover } from "@/components/report-share/share-popover";
import { cn } from "@/lib/utils";

import { REDESIGN_TOKENS } from "./report-tokens";

interface ReportHeroProps {
  result: AdapterResult;
  actions: ReportPageActions;
}

/**
 * Hero Iconosquare-style: banda azul-claro premium, identidade do perfil
 * à esquerda, CTAs sólidos à direita, badges de cobertura discretos por
 * baixo. Tipografia editorial em escala display.
 */
export function ReportHero({ result, actions }: ReportHeroProps) {
  const profile = result.data.profile;
  const enriched: ReportEnriched = result.enriched;
  const coverage = result.coverage;

  const handle = `@${profile.username}`;
  const fullName = profile.fullName?.trim() || "";
  const bio = enriched.profile.bio;
  const avatarUrl = enriched.profile.avatarUrl;

  return (
    <section
      aria-label="Cabeçalho do relatório"
      className={cn("relative w-full overflow-hidden", REDESIGN_TOKENS.heroBand)}
    >
      <div className="mx-auto max-w-7xl px-5 md:px-6 pt-10 md:pt-14 pb-10 md:pb-12">
        <p className={cn(REDESIGN_TOKENS.eyebrowAccent, "mb-6")}>
          InstaBench · Relatório editorial
        </p>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          {/* Identidade */}
          <div className="flex items-start gap-5 md:gap-6 min-w-0 flex-1">
            <Avatar avatarUrl={avatarUrl} fullName={fullName || handle} />
            <div className="min-w-0 space-y-2">
              <h1 className={REDESIGN_TOKENS.h1Hero}>
                {handle}
              </h1>
              {fullName ? (
                <p className="text-base md:text-lg font-medium text-slate-700">
                  {fullName}
                </p>
              ) : (
                <p className="text-sm md:text-base text-slate-600">
                  Perfil público no Instagram
                </p>
              )}
              {bio ? (
                <p className="text-sm text-slate-600/95 leading-relaxed line-clamp-2 max-w-2xl">
                  {bio}
                </p>
              ) : null}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:flex-row lg:items-center lg:shrink-0">
            <button
              type="button"
              onClick={actions.onExportPdf}
              disabled={actions.pdfDisabled || actions.pdfBusy}
              aria-busy={actions.pdfBusy}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-full",
                "bg-blue-600 text-white px-5 md:px-6 py-3 text-sm font-semibold",
                "shadow-[0_1px_2px_rgba(15,23,42,0.08),0_8px_20px_-8px_rgba(59,130,246,0.45)]",
                "transition-colors duration-200",
                "hover:bg-blue-700",
                "disabled:cursor-not-allowed disabled:opacity-60",
                "min-h-[44px]",
              )}
            >
              {actions.pdfBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileDown className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{actions.pdfBusy ? "A preparar PDF…" : "Exportar PDF"}</span>
            </button>
            <ShareReportPopover
              result={result}
              variant="ghost"
              triggerLabel="Partilhar"
            />
          </div>
        </div>

        {/* Badges de cobertura + meta */}
        <div className="mt-8 md:mt-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <CoverageBadge label="Dados públicos" status="real" />
            <CoverageBadge
              label="IA editorial"
              status={enriched.aiInsights ? "real" : "empty"}
            />
            <CoverageBadge label="Benchmark" status={coverage.benchmark} />
            <CoverageBadge label="Pesquisa" status="partial" />
          </div>
          <p className={cn(REDESIGN_TOKENS.kpiLabel, "flex flex-wrap items-center gap-x-3 gap-y-1")}>
            <span>{profile.postsAnalyzed ?? 0} publicações analisadas</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>
              {coverage.windowDays > 0
                ? `${coverage.windowDays} dias`
                : "amostra recolhida"}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{profile.analyzedAt}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function Avatar({ avatarUrl, fullName }: { avatarUrl: string | null; fullName: string }) {
  const initials = fullName
    .replace(/^@/, "")
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  if (avatarUrl) {
    return (
      <img
        src={`/api/public/ig-thumb?url=${encodeURIComponent(avatarUrl)}`}
        alt={`Avatar de ${fullName}`}
        loading="eager"
        decoding="async"
        className="size-16 md:size-20 rounded-full object-cover border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.06)] shrink-0 bg-white"
        onError={(e) => {
          // Fallback gracioso para gradiente quando o thumb falhar.
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="size-16 md:size-20 rounded-full shrink-0 flex items-center justify-center font-display text-xl font-semibold text-white bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-[0_4px_12px_-4px_rgba(59,130,246,0.45)]"
    >
      {initials}
    </div>
  );
}

function CoverageBadge({
  label,
  status,
}: {
  label: string;
  status: "real" | "partial" | "empty" | "placeholder";
}) {
  const toneClass =
    status === "real"
      ? "ring-blue-200 text-blue-700 bg-blue-50"
      : status === "partial"
        ? "ring-amber-200 text-amber-700 bg-amber-50"
        : "ring-slate-200 text-slate-500 bg-white";
  const dot =
    status === "real"
      ? "bg-blue-500"
      : status === "partial"
        ? "bg-amber-500"
        : "bg-slate-400";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full ring-1 px-3 py-1.5",
        "font-mono text-[10px] uppercase tracking-[0.16em]",
        toneClass,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
