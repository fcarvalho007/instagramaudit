import { Copy, FileDown, Loader2, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import type {
  AdapterResult,
  ReportEnriched,
} from "@/lib/report/snapshot-to-report-data";
import type { ReportPageActions } from "@/components/report/report-page";
import { cn } from "@/lib/utils";

interface ReportHeroProps {
  result: AdapterResult;
  actions: ReportPageActions;
}

/**
 * Hero premium e cinematográfico do relatório público.
 * Combina identidade do perfil, badges de cobertura, meta editorial
 * e CTAs (PDF + copiar link) sobre fundo com gradiente pastel suave.
 * Substitui visualmente o `ReportHeader` locked sem o modificar.
 */
export function ReportHero({ result, actions }: ReportHeroProps) {
  const profile = result.data.profile;
  const enriched: ReportEnriched = result.enriched;
  const coverage = result.coverage;

  const handle = `@${profile.username}`;
  const fullName = profile.fullName?.trim() || handle;
  const bio = enriched.profile.bio;
  const avatarUrl = enriched.profile.avatarUrl;

  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  async function handleCopy() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  }

  return (
    <section
      aria-label="Cabeçalho do relatório"
      className={cn(
        "relative w-full overflow-hidden",
        "bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.12),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.10),transparent_60%)]",
        "border-b border-border-subtle/30",
      )}
    >
      <div className="mx-auto max-w-7xl px-5 md:px-6 pt-10 md:pt-16 pb-10 md:pb-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent-primary mb-6">
          InstaBench · Relatório editorial
        </p>

        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-5 md:gap-6 min-w-0">
            <Avatar avatarUrl={avatarUrl} fullName={fullName} />
            <div className="space-y-2 min-w-0">
              <h1 className="font-display text-[1.75rem] sm:text-3xl md:text-4xl lg:text-[2.75rem] font-medium tracking-tight text-content-primary leading-[1.05] break-all">
                {handle}
              </h1>
              <p className="text-sm md:text-base text-content-secondary">
                {fullName !== handle ? fullName : "Perfil público no Instagram"}
              </p>
              {bio ? (
                <p className="text-sm text-content-secondary/90 leading-relaxed line-clamp-2 md:line-clamp-2 max-w-xl">
                  {bio}
                </p>
              ) : null}
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary pt-2">
                {profile.postsAnalyzed ?? 0} publicações analisadas
                <span className="mx-2 text-content-tertiary/50">·</span>
                {coverage.windowDays > 0
                  ? `${coverage.windowDays} dias`
                  : "amostra recolhida"}
                <span className="mx-2 text-content-tertiary/50">·</span>
                {profile.analyzedAt}
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:flex-col md:items-end">
            <button
              type="button"
              onClick={actions.onExportPdf}
              disabled={actions.pdfDisabled || actions.pdfBusy}
              aria-busy={actions.pdfBusy}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-full",
                "bg-accent-primary text-surface-base",
                "px-6 py-3 text-sm font-semibold",
                "border border-accent-primary",
                "transition-colors duration-200",
                "hover:bg-accent-luminous hover:border-accent-luminous",
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
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-full",
                "bg-transparent text-content-primary",
                "px-5 py-3 text-sm font-medium",
                "border border-border-subtle/50",
                "transition-colors duration-200",
                "hover:border-accent-primary/60 hover:text-accent-primary",
                "min-h-[44px]",
              )}
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{copied ? "Link copiado" : "Copiar link"}</span>
            </button>
          </div>
        </div>

        {/* Badges de cobertura */}
        <div className="mt-8 md:mt-10 flex flex-wrap items-center gap-2">
          <CoverageBadge label="Dados públicos" status="real" />
          <CoverageBadge
            label="IA editorial"
            status={enriched.aiInsights ? "real" : "empty"}
          />
          <CoverageBadge
            label="Benchmark"
            status={coverage.benchmark}
          />
          <CoverageBadge label="Pesquisa" status="partial" />
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

  if (avatarUrl) {
    return (
      <img
        src={`/api/public/ig-thumb?url=${encodeURIComponent(avatarUrl)}`}
        alt={`Avatar de ${fullName}`}
        loading="eager"
        decoding="async"
        className="size-16 md:size-20 rounded-full object-cover border border-border-subtle/40 shrink-0"
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
      className="size-16 md:size-20 rounded-full shrink-0 flex items-center justify-center font-display text-xl text-surface-base bg-gradient-to-br from-accent-primary via-accent-luminous to-accent-violet"
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
      ? "border-accent-primary/40 text-accent-primary bg-accent-primary/5"
      : status === "partial"
        ? "border-accent-gold/40 text-accent-gold bg-accent-gold/5"
        : "border-border-subtle/40 text-content-tertiary bg-surface-secondary/30";
  const dot =
    status === "real"
      ? "bg-accent-primary"
      : status === "partial"
        ? "bg-accent-gold"
        : "bg-content-tertiary/60";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
        "font-mono text-[10px] uppercase tracking-[0.16em]",
        toneClass,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden="true" />
      {label}
    </span>
  );
}