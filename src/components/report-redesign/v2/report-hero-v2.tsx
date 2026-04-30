import { FileDown, Loader2 } from "lucide-react";

import type {
  AdapterResult,
  ReportEnriched,
} from "@/lib/report/snapshot-to-report-data";
import type { ReportPageActions } from "@/components/report/report-page";
import { ShareReportPopover } from "@/components/report-share/share-popover";
import { cn } from "@/lib/utils";

import { REDESIGN_TOKENS } from "../report-tokens";

interface ReportHeroV2Props {
  result: AdapterResult;
  actions: ReportPageActions;
}

/**
 * Hero v2 (Phase 1B.1) — versão evoluída do hero do relatório.
 * Mantém a API e a semântica do hero v1 (locked) mas:
 *  - banda gradiente mais rica (radial duplo + vinheta inferior)
 *  - tipografia maior em desktop (até 3.25rem)
 *  - avatar com ring duplo (branco + azul-100)
 *  - cluster de cobertura coeso por baixo
 *  - meta line monolítica reposicionada por baixo dos badges
 *
 * Não substitui o hero v1 — coexistem para suportar rollback.
 */
export function ReportHeroV2({ result, actions }: ReportHeroV2Props) {
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
      className={cn("relative w-full overflow-hidden", REDESIGN_TOKENS.heroBandV2)}
    >
      {/* Vinheta inferior subtil para transição suave para a banda branca. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white/70"
      />

      <div className="relative mx-auto max-w-7xl px-5 md:px-6 pt-12 md:pt-16 lg:pt-20 pb-12 md:pb-16">
        <p className={cn(REDESIGN_TOKENS.eyebrowAccent, "mb-7")}>
          InstaBench · Relatório editorial
        </p>

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          {/* Identidade */}
          <div className="flex items-start gap-5 md:gap-6 min-w-0 flex-1">
            <Avatar avatarUrl={avatarUrl} fullName={fullName || handle} />
            <div className="min-w-0 space-y-2.5">
              <h1 className={REDESIGN_TOKENS.h1HeroV2}>{handle}</h1>
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
                <p className="text-sm md:text-[15px] text-slate-600/95 leading-relaxed line-clamp-2 max-w-2xl">
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
                "shadow-[0_1px_2px_rgba(15,23,42,0.08),0_10px_24px_-10px_rgba(59,130,246,0.55)]",
                "transition-all duration-200",
                "hover:bg-blue-700 hover:-translate-y-0.5",
                "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
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

        {/* Cluster de cobertura + meta */}
        <div className="mt-10 md:mt-12 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <CoverageBadge label="Dados públicos" status="real" />
            {enriched.aiInsights ? (
              <CoverageBadge label="IA editorial" status="real" />
            ) : null}
            <CoverageBadge label="Benchmark" status={coverage.benchmark} />
            <CoverageBadge label="Pesquisa" status="partial" />
          </div>
          <p
            className={cn(
              REDESIGN_TOKENS.kpiLabel,
              "flex flex-wrap items-center gap-x-3 gap-y-1",
            )}
          >
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

function Avatar({
  avatarUrl,
  fullName,
}: {
  avatarUrl: string | null;
  fullName: string;
}) {
  const initials = fullName
    .replace(/^@/, "")
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const ringCls =
    "ring-4 ring-white shadow-[0_0_0_1px_rgb(191,219,254),0_8px_24px_-12px_rgba(59,130,246,0.40)]";

  if (avatarUrl) {
    return (
      <img
        src={`/api/public/ig-thumb?url=${encodeURIComponent(avatarUrl)}`}
        alt={`Avatar de ${fullName}`}
        loading="eager"
        decoding="async"
        className={cn(
          "size-20 md:size-24 rounded-full object-cover shrink-0 bg-white",
          ringCls,
        )}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn(
        "size-20 md:size-24 rounded-full shrink-0 flex items-center justify-center",
        "font-display text-2xl font-semibold text-white",
        "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600",
        ringCls,
      )}
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