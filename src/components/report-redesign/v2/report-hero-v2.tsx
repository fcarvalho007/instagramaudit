import { Check, FileDown, Loader2 } from "lucide-react";

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
 * Hero v2 (Phase 1B.1E) — Instagram profile snapshot.
 *
 *  - avatar à esquerda + identidade (handle, nome, bio)
 *  - linha de stats estilo perfil IG: Publicações · Seguidores · A seguir
 *  - meta secundária da análise: publicações analisadas, dias, data
 *  - ações à direita (Exportar PDF, Partilhar) + chips de cobertura
 */
export function ReportHeroV2({ result, actions }: ReportHeroV2Props) {
  const profile = result.data.profile;
  const enriched: ReportEnriched = result.enriched;
  const coverage = result.coverage;

  const handle = `@${profile.username}`;
  const fullName = profile.fullName?.trim() || "";
  const bio = enriched.profile.bio;
  const avatarUrl = enriched.profile.avatarUrl;
  const verified = Boolean(profile.verified);

  const profileStats = buildProfileStats({
    postsCount: profile.postsCount ?? 0,
    followers: profile.followers ?? 0,
    following: profile.following ?? 0,
  });

  const analysisMeta = buildAnalysisMeta({
    postsAnalyzed: profile.postsAnalyzed ?? 0,
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

      <div className="relative mx-auto max-w-7xl px-5 md:px-6 pt-5 md:pt-7 pb-5 md:pb-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          {/* Identidade + stats */}
          <div className="flex items-start gap-4 md:gap-6 min-w-0 flex-1">
            <Avatar avatarUrl={avatarUrl} fullName={fullName || handle} />

            <div className="min-w-0 flex-1 space-y-3">
              {/* Handle + verified */}
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h1 className={REDESIGN_TOKENS.h1HeroV2Compact}>{handle}</h1>
                {verified ? <VerifiedBadge /> : null}
              </div>

              {/* Nome */}
              {fullName ? (
                <p className="text-sm md:text-base font-medium text-slate-700 -mt-1">
                  {fullName}
                </p>
              ) : null}

              {/* Bio */}
              {bio ? (
                <p className="text-[13px] md:text-sm text-slate-600 leading-relaxed line-clamp-3 max-w-xl whitespace-pre-line">
                  {bio}
                </p>
              ) : null}

              {/* Stats estilo perfil IG */}
              {profileStats.length > 0 ? (
                <ul className="!mt-4 grid grid-cols-3 gap-x-4 gap-y-1 max-w-md sm:max-w-lg">
                  {profileStats.map((s) => (
                    <li
                      key={s.label}
                      className="flex flex-col items-start gap-1 min-w-0"
                    >
                      <span className="font-mono text-[1.5rem] md:text-[1.875rem] font-semibold text-slate-900 tabular-nums leading-none tracking-[-0.02em]">
                        {s.value}
                      </span>
                      <span className="text-eyebrow-sm md: text-slate-500">
                        {s.label}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* Meta da análise — separada por divider hairline para
                  sinalizar que é metadata do relatório, não do perfil. */}
              {analysisMeta.length > 0 ? (
                <div className="text-eyebrow-sm !mt-3 pt-2.5 border-t border-slate-200/60 md: text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {analysisMeta.map((m, i) => (
                    <span key={m} className="inline-flex items-center gap-2">
                      {i > 0 ? (
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                      ) : null}
                      <span>{m}</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Ações + cobertura — visualmente secundário */}
          <div className="flex flex-col gap-2 lg:items-end lg:shrink-0">
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button
                type="button"
                onClick={actions.onExportPdf}
                disabled={actions.pdfDisabled || actions.pdfBusy}
                aria-busy={actions.pdfBusy}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-full",
                  "bg-blue-600 text-white px-3.5 py-1.5 text-[13px] font-medium",
                  "shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
                  "transition-colors duration-200 hover:bg-blue-700",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  "h-9",
                )}
              >
                {actions.pdfBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{actions.pdfBusy ? "A preparar…" : "Exportar PDF"}</span>
              </button>
              <ShareReportPopover
                result={result}
                variant="ghost"
                triggerLabel="Partilhar"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 lg:justify-end">
              <CoverageBadge label="Dados públicos" status="real" />
            </div>
          </div>
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

function buildProfileStats(input: {
  postsCount: number;
  followers: number;
  following: number;
}): StatItem[] {
  return [
    {
      label: "publicações",
      value: input.postsCount > 0 ? formatCompact(input.postsCount) : "—",
    },
    {
      label: "seguidores",
      value: input.followers > 0 ? formatCompact(input.followers) : "—",
    },
    {
      label: "a seguir",
      value: input.following > 0 ? formatCompact(input.following) : "—",
    },
  ];
}

function buildAnalysisMeta(input: {
  postsAnalyzed: number;
  windowDays: number;
  analyzedAt: string;
}): string[] {
  const out: string[] = [];
  if (input.postsAnalyzed > 0) {
    out.push(`${input.postsAnalyzed} publicações analisadas`);
  }
  if (input.windowDays > 0) {
    out.push(`${input.windowDays} dias analisados`);
  }
  if (input.analyzedAt) {
    out.push(`analisado em ${input.analyzedAt}`);
  }
  return out;
}

function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return trimZero((n / 1_000_000).toFixed(1)) + "M";
  if (abs >= 10_000) return trimZero((n / 1_000).toFixed(0)) + "K";
  if (abs >= 1_000) return trimZero((n / 1_000).toFixed(1)) + "K";
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

  // Story ring estilo IG: gradient subtil em redor + inset branco.
  const storyRing =
    "p-[2.5px] rounded-full shrink-0 bg-[conic-gradient(from_180deg_at_50%_50%,#FCD34D_0deg,#F472B6_120deg,#A855F7_220deg,#3B82F6_360deg)] shadow-[0_8px_22px_-10px_rgba(59,130,246,0.35)]";
  const innerWhite = "p-[2px] rounded-full bg-white";
  const innerSize = "size-[68px] md:size-[92px]";

  if (avatarUrl) {
    return (
      <div className={storyRing}>
        <div className={innerWhite}>
          <img
            src={`/api/public/ig-thumb?url=${encodeURIComponent(avatarUrl)}`}
            alt={`Avatar de ${fullName}`}
            loading="eager"
            decoding="async"
            className={cn(
              "rounded-full object-cover bg-white",
              innerSize,
            )}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      </div>
    );
  }
  return (
    <div className={storyRing} aria-hidden="true">
      <div className={innerWhite}>
        <div
          className={cn(
            "rounded-full flex items-center justify-center",
            "font-display text-xl md:text-2xl font-semibold text-white",
            "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600",
            innerSize,
          )}
        >
          {initials}
        </div>
      </div>
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span
      aria-label="Conta verificada"
      title="Conta verificada"
      className={cn(
        "inline-flex items-center justify-center shrink-0",
        "h-[18px] w-[18px] md:h-5 md:w-5 rounded-full",
        "bg-blue-500 text-white",
        "shadow-[0_1px_2px_rgba(15,23,42,0.15)]",
      )}
    >
      <Check
        className="h-2.5 w-2.5 md:h-3 md:w-3"
        strokeWidth={3.5}
        aria-hidden="true"
      />
    </span>
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
        "text-eyebrow-sm",
        toneClass,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
