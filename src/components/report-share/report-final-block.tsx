import { ExternalLink, FileDown, Loader2 } from "lucide-react";

import { BETA_COPY } from "@/components/report-beta/beta-copy";
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
export function ReportFinalBlock({
  snapshotId,
  reportUrl,
  result,
}: ReportFinalBlockProps) {
  const share = useReportShareActions({ snapshotId, reportUrl });
  const pdfDisabled = share.pdfDisabled || share.pdfBusy;
  const pdfLabel = share.pdfBusy
    ? SHARE_COPY.actions.pdf.labelLoading
    : SHARE_COPY.actions.pdf.label;
  const { feedback } = BETA_COPY;

  return (
    <section
      aria-label="Concluir relatório"
      className="w-full bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.10),transparent_60%),radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.08),transparent_60%)] border-t border-border-subtle/30"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-6 py-12 md:py-16">
      <div className="rounded-2xl border border-border-subtle/50 bg-surface-base/70 backdrop-blur-sm p-6 md:p-10 space-y-8">
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
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary pt-1">
              O PDF inclui todas as secções deste relatório · link público
              activo durante a fase beta
            </p>
          </header>

          <div className="flex flex-col items-stretch gap-2 md:items-end w-full md:w-auto">
            <button
              type="button"
              onClick={() => void share.exportPdf()}
              disabled={pdfDisabled}
              aria-disabled={pdfDisabled}
              aria-busy={share.pdfBusy}
              title={
                !snapshotId ? SHARE_COPY.actions.pdf.labelDisabled : undefined
              }
              className="w-full md:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-full border border-accent-primary bg-accent-primary px-6 py-3 text-sm font-semibold text-surface-base transition-colors duration-200 hover:bg-accent-luminous hover:border-accent-luminous disabled:cursor-not-allowed disabled:border-border-subtle/40 disabled:bg-transparent disabled:text-text-muted disabled:opacity-70"
            >
              {share.pdfBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileDown className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{pdfLabel}</span>
            </button>

            {/* Fallback sempre visível assim que o PDF está pronto: garante
                que, mesmo que o clique programático não tenha aberto a
                nova aba (Safari/iOS, extensões), o utilizador tem um link
                directo para reabrir. */}
            {share.pdfFallback ? (
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col items-stretch gap-1 md:items-end w-full md:w-auto"
              >
                <a
                  href={share.pdfFallback.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-accent-primary bg-accent-primary/10 px-5 py-2 text-sm font-semibold text-accent-primary transition-colors duration-200 hover:bg-accent-primary/20"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span>{SHARE_COPY.actions.pdfFallback.label}</span>
                </a>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary md:text-right">
                  {SHARE_COPY.actions.pdfFallback.blockedHint}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Acções secundárias: popover unificado de partilha */}
        {result ? (
          <div className="flex flex-col gap-3 border-t border-border-subtle/30 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
              Partilhar com a tua rede
            </span>
            <ShareReportPopover
              result={result}
              url={share.resolvedUrl}
              variant="ghost"
              triggerLabel="Partilhar relatório"
            />
          </div>
        ) : null}

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
      </div>
    </section>
  );
}
