import { ExternalLink, FileDown, Loader2, Share2 } from "lucide-react";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";

import { SHARE_COPY } from "./share-copy";
import { ShareReportPopover } from "./share-popover";
import { useReportShareActions } from "./use-report-share-actions";

interface ReportFinalBlockProps {
  /** UUID do `analysis_snapshots` actual. Activa o botão de PDF. */
  snapshotId?: string;
  /** URL a partilhar. Resolvida via `window.location.href` quando ausente. */
  reportUrl?: string;
  /**
   * Resultado já adaptado do snapshot. Usado para construir a mensagem
   * de teaser do popover de partilha. Quando ausente, o bloco renderiza
   * apenas a acção de PDF e o feedback beta.
   */
  result?: AdapterResult;
}

/**
 * Bloco final único do relatório público em `/analyze/$username`.
 *
 * PDF é o deliverable principal e a partilha por canais (WhatsApp, LinkedIn,
 * Email, Copiar) aparece num popover compacto com mensagem-teaser. O PDF
 * é entregue via clique programático numa âncora — não usamos
 * `window.open("about:blank")`, que era bloqueado por popup blockers
 * modernos quando o `await` demorava demasiado.
 */
export function ReportFinalBlock({ snapshotId, reportUrl, result }: ReportFinalBlockProps) {
  const share = useReportShareActions({ snapshotId, reportUrl });
  const pdfDisabled = share.pdfDisabled || share.pdfBusy;
  const pdfLabel = share.pdfBusy
    ? SHARE_COPY.actions.pdf.labelLoading
    : SHARE_COPY.actions.pdf.label;

  return (
    <section
      aria-label="Concluir relatório"
      className="w-full bg-white border-t border-slate-200"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-6 py-12 md:py-16">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 md:p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
          {/* Header compacto: eyebrow + título + 1 linha de hint */}
          <header className="space-y-2 max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-blue-600">
              {SHARE_COPY.eyebrow}
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 leading-tight">
              Levar este relatório
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Exporta em PDF, partilha com a tua rede ou copia o link público.
            </p>
          </header>

          {/* 3 botões em linha */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <button
              type="button"
              onClick={() => void share.exportPdf()}
              disabled={pdfDisabled}
              aria-disabled={pdfDisabled}
              aria-busy={share.pdfBusy}
              title={!snapshotId ? SHARE_COPY.actions.pdf.labelDisabled : undefined}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.08),0_8px_20px_-8px_rgba(59,130,246,0.45)] transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none min-h-[44px]"
            >
              {share.pdfBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileDown className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{pdfLabel}</span>
            </button>

            {result ? (
              <ShareReportPopover
                result={result}
                url={share.resolvedUrl}
                variant="ghost"
                triggerLabel="Partilhar"
                triggerClassName="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900 min-h-[44px]"
                triggerIcon={<Share2 className="h-4 w-4" aria-hidden="true" />}
              />
            ) : null}

            <button
              type="button"
              onClick={() => void share.copyLink()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900 min-h-[44px]"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span>{share.linkCopied ? "Link copiado" : "Copiar link"}</span>
            </button>
          </div>

          {/* Fallback PDF (popup blockers) */}
          {share.pdfFallback ? (
            <div role="status" aria-live="polite" className="mt-4 flex flex-col gap-1 sm:items-start">
              <a
                href={share.pdfFallback.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-700 transition-colors duration-200 hover:bg-blue-100"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span>{SHARE_COPY.actions.pdfFallback.label}</span>
              </a>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                {SHARE_COPY.actions.pdfFallback.blockedHint}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
