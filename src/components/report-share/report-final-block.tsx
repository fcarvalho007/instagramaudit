import { useEffect, useState } from "react";
import { Check, FileDown, Link2, Linkedin, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { BETA_COPY } from "@/components/report-beta/beta-copy";

import { SHARE_COPY } from "./share-copy";

interface ReportFinalBlockProps {
  /** UUID do `analysis_snapshots` actual. Activa o botão de PDF. */
  snapshotId?: string;
  /** URL a partilhar. Resolvida via `window.location.href` quando ausente. */
  reportUrl?: string;
}

/**
 * Bloco final único do relatório público em `/analyze/$username`.
 *
 * Substitui o par anterior `ReportShareActions` (variant `default`) +
 * `BetaFeedbackBlock`, que duplicavam o footer com mensagens sobrepostas.
 * Aqui o PDF é destacado como **deliverable principal**, partilha (link e
 * LinkedIn) fica como apoio secundário e o feedback beta aparece numa
 * linha discreta no fim.
 */
export function ReportFinalBlock({
  snapshotId,
  reportUrl,
}: ReportFinalBlockProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string>(reportUrl ?? "");
  const [copied, setCopied] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<"idle" | "loading">("idle");

  useEffect(() => {
    if (reportUrl) {
      setResolvedUrl(reportUrl);
      return;
    }
    if (typeof window !== "undefined") {
      setResolvedUrl(window.location.href);
    }
  }, [reportUrl]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const linkedinHref = resolvedUrl
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(resolvedUrl)}`
    : "#";

  async function handleCopy() {
    if (!resolvedUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resolvedUrl);
      } else {
        throw new Error("clipboard-unavailable");
      }
      setCopied(true);
      toast.success(SHARE_COPY.toast.success);
    } catch {
      toast.error(SHARE_COPY.toast.error);
    }
  }

  async function handlePdf() {
    if (!snapshotId || pdfStatus === "loading") return;
    setPdfStatus("loading");
    try {
      const res = await fetch("/api/public/public-report-pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot_id: snapshotId }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const body = (await res.json()) as {
        success?: boolean;
        signed_url?: string;
        cached?: boolean;
      };
      if (!body.success || !body.signed_url) throw new Error("invalid_response");
      if (typeof window !== "undefined") {
        window.open(body.signed_url, "_blank", "noopener,noreferrer");
      }
      toast.success(
        body.cached ? SHARE_COPY.toast.pdfCached : SHARE_COPY.toast.pdfReady,
      );
    } catch {
      toast.error(SHARE_COPY.toast.pdfError);
    } finally {
      setPdfStatus("idle");
    }
  }

  const pdfDisabled = !snapshotId || pdfStatus === "loading";
  const pdfLabel =
    pdfStatus === "loading"
      ? SHARE_COPY.actions.pdf.labelLoading
      : SHARE_COPY.actions.pdf.label;
  const { feedback } = BETA_COPY;

  return (
    <section
      aria-label="Concluir relatório"
      className="mx-auto max-w-7xl px-6 pb-16 pt-4"
    >
      <div className="rounded-2xl border border-border-subtle/50 bg-surface-secondary/40 p-6 md:p-10 space-y-8">
        {/* Acção principal: PDF em destaque */}
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <header className="space-y-2 max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-content-tertiary">
              {SHARE_COPY.eyebrow}
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-content-primary leading-tight">
              Levar este relatório
            </h2>
            <p className="text-sm md:text-base text-content-secondary leading-relaxed">
              Exporta em PDF para guardar, enviar a um cliente ou apresentar
              numa reunião. O link público também pode ser partilhado.
            </p>
          </header>

          <button
            type="button"
            onClick={handlePdf}
            disabled={pdfDisabled}
            aria-disabled={pdfDisabled}
            aria-busy={pdfStatus === "loading"}
            title={
              !snapshotId ? SHARE_COPY.actions.pdf.labelDisabled : undefined
            }
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full border border-accent-primary bg-accent-primary px-6 py-3 text-sm font-semibold text-surface-base transition-colors duration-200 hover:bg-accent-luminous hover:border-accent-luminous disabled:cursor-not-allowed disabled:border-border-subtle/40 disabled:bg-transparent disabled:text-text-muted disabled:opacity-70"
          >
            {pdfStatus === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileDown className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{pdfLabel}</span>
          </button>
        </div>

        {/* Acções secundárias: partilha discreta */}
        <div className="flex flex-col gap-2 border-t border-border-subtle/30 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary sm:mr-2">
            Partilhar
          </span>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!resolvedUrl}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border-subtle/60 bg-transparent px-4 py-2 text-sm text-text-primary transition-colors duration-200 hover:border-accent-primary/50 hover:text-accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Link2 className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {copied
                ? SHARE_COPY.actions.copy.labelDone
                : SHARE_COPY.actions.copy.label}
            </span>
          </button>

          <a
            href={linkedinHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!resolvedUrl}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border-subtle/60 bg-transparent px-4 py-2 text-sm text-text-primary transition-colors duration-200 hover:border-accent-primary/50 hover:text-accent-primary"
          >
            <Linkedin className="h-4 w-4" aria-hidden="true" />
            <span>{SHARE_COPY.actions.linkedin.label}</span>
          </a>
        </div>

        {/* Feedback beta: linha discreta no fim */}
        <div className="border-t border-border-subtle/30 pt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 max-w-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
              {feedback.eyebrow}
            </p>
            <p className="text-sm text-content-secondary leading-relaxed">
              {feedback.subtitle}
            </p>
          </div>
          <a
            href={feedback.action.href}
            className="shrink-0 inline-flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-primary hover:text-accent-luminous transition-colors"
          >
            {feedback.action.label}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}