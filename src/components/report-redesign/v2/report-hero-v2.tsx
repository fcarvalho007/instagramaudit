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
 * Hero v2 compacto (Phase 1B.1A) — header inspirado em perfil
 * Instagram, mas em linguagem editorial SaaS.
 *  - banda gradiente mais subtil
 *  - layout 2 colunas em desktop: identidade + ações
 *  - stats row estilo perfil (publicações analisadas, seguidores…)
 *  - strip de posicionamento integrada (substitui o banner standalone)
 *  - target ~280–340px de altura em desktop
 */
export function ReportHeroV2({ result, actions }: ReportHeroV2Props) {
  const profile = result.data.profile;
  const enriched: ReportEnriched = result.enriched;
  const coverage = result.coverage;

  const handle = `@${profile.username}`;
  const fullName = profile.fullName?.trim() || "";
  const bio = enriched.profile.bio;
  const avatarUrl = enriched.profile.avatarUrl;

  const stats = buildStats({
    postsAnalyzed: profile.postsAnalyzed ?? 0,
    followers: profile.followers ?? 0,
    following: profile.following ?? 0,
    postsCount: profile.postsCount ?? 0,
    windowDays: coverage.windowDays ?? 0,
    analyzedAt: profile.analyzedAt ?? "",
  });

  return (
    <section
      aria-label="Cabeçalho do relatório"
      className={cn(
        "relative w-full overflow-hidden",
        REDESIGN_TOKENS.heroBandV2Compact,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-white/70"
      />

      <div className="relative mx-auto max-w-7xl px-5 md:px-6 pt-8 md:pt-10 lg:pt-12 pb-8 md:pb-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          {/* Identidade */}
          <div className="flex items-start gap-4 md:gap-5 min-w-0 flex-1">
            <Avatar avatarUrl={avatarUrl} fullName={fullName || handle} />
            <div className="min-w-0 space-y-2 flex-1">
              <div className="space-y-1">
                <h1 className={REDESIGN_TOKENS.h1HeroV2Compact}>{handle}</h1>
                {fullName ? (
                  <p className="text-sm md:text-base font-medium text-slate-700">
                    {fullName}
                  </p>
                ) : null}
              </div>
              {bio ? (
                <p className="text-[13px] md:text-sm text-slate-600 leading-relaxed line-clamp-2 max-w-xl">
                  {bio}
                </p>
              ) : null}

              {/* Stats row estilo perfil */}
              {stats.length > 0 ? (
                <ul className="!mt-4 flex flex-wrap gap-x-5 gap-y-3 md:gap-x-7">
                  {stats.map((s) => (
                    <li key={s.label} className={REDESIGN_TOKENS.heroStatItem}>
                      <span className={REDESIGN_TOKENS.heroStatValue}>
                        {s.value}
                      </span>
                      <span className={REDESIGN_TOKENS.heroStatLabel}>
                        {s.label}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          {/* Ações + cobertura */}
          <div className="flex flex-col gap-3 lg:items-end lg:shrink-0">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={actions.onExportPdf}
                disabled={actions.pdfDisabled || actions.pdfBusy}
                aria-busy={actions.pdfBusy}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-full",
                  "bg-blue-600 text-white px-4 md:px-5 py-2.5 text-sm font-semibold",
                  "shadow-[0_1px_2px_rgba(15,23,42,0.08),0_8px_20px_-10px_rgba(59,130,246,0.55)]",
                  "transition-all duration-200",
                  "hover:bg-blue-700 hover:-translate-y-0.5",
                  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
                  "min-h-[40px]",
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
            <div className="flex flex-wrap gap-1.5 lg:justify-end">
              <CoverageBadge label="Dados públicos" status="real" />
              {enriched.aiInsights ? (
                <CoverageBadge label="IA editorial" status="real" />
              ) : null}
              <CoverageBadge label="Benchmark" status={coverage.benchmark} />
              <CoverageBadge label="Pesquisa" status="partial" />
            </div>
          </div>
        </div>

        {/* Posicionamento integrado (substitui o banner standalone) */}
        <div className={REDESIGN_TOKENS.positioningStrip}>
          <p className="text-[13px] md:text-sm text-slate-600 leading-relaxed max-w-2xl">
            O <strong className="text-slate-900 font-medium">InstaBench</strong>{" "}
            cruza o que o perfil comunica publicamente, como compara com perfis
            semelhantes e que temas têm procura fora do Instagram.
          </p>
          <ul className="flex flex-wrap gap-1.5 shrink-0">
            {[
              "Conteúdo público",
              "Comparação com pares",
              "Procura externa",
            ].map((chip) => (
              <li key={chip} className={REDESIGN_TOKENS.positioningChip}>
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-blue-500"
                />
                {chip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

interface StatItem {
  label: string;
  value: string;
}

function buildStats(input: {
  postsAnalyzed: number;
  followers: number;
  following: number;
  postsCount: number;
  windowDays: number;
  analyzedAt: string;
}): StatItem[] {
  const items: StatItem[] = [];
  if (input.postsAnalyzed > 0) {
    items.push({
      label: "publicações analisadas",
      value: formatCompact(input.postsAnalyzed),
    });
  }
  if (input.followers > 0) {
    items.push({
      label: "seguidores",
      value: formatCompact(input.followers),
    });
  }
  if (input.following > 0) {
    items.push({
      label: "a seguir",
      value: formatCompact(input.following),
    });
  }
  if (input.postsCount > 0 && input.postsCount !== input.postsAnalyzed) {
    items.push({
      label: "publicações totais",
      value: formatCompact(input.postsCount),
    });
  }
  if (input.windowDays > 0) {
    items.push({
      label: "dias analisados",
      value: String(input.windowDays),
    });
  }
  if (input.analyzedAt) {
    items.push({
      label: "analisado em",
      value: input.analyzedAt,
    });
  }
  return items;
}

function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    return trimZero((n / 1_000_000).toFixed(1)) + "M";
  }
  if (abs >= 10_000) {
    return trimZero((n / 1_000).toFixed(0)) + "K";
  }
  if (abs >= 1_000) {
    return trimZero((n / 1_000).toFixed(1)) + "K";
  }
  return new Intl.NumberFormat("pt-PT").format(n);
}

function trimZero(s: string): string {
  return s.replace(/\.0$/, "");
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
    "ring-4 ring-white shadow-[0_0_0_1px_rgb(191,219,254),0_6px_18px_-10px_rgba(59,130,246,0.40)]";

  if (avatarUrl) {
    return (
      <img
        src={`/api/public/ig-thumb?url=${encodeURIComponent(avatarUrl)}`}
        alt={`Avatar de ${fullName}`}
        loading="eager"
        decoding="async"
        className={cn(
          "size-16 md:size-20 rounded-full object-cover shrink-0 bg-white",
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
        "size-16 md:size-20 rounded-full shrink-0 flex items-center justify-center",
        "font-display text-xl md:text-2xl font-semibold text-white",
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
        "inline-flex items-center gap-1.5 rounded-full ring-1 px-2.5 py-1",
        "font-mono text-[10px] uppercase tracking-[0.14em]",
        toneClass,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
