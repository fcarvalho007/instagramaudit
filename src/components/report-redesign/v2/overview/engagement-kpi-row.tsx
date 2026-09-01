/**
 * EngagementKpiRow — bloco comparativo único do card de Engagement.
 *
 * Substitui as três caixas de igual peso por uma só unidade de leitura:
 *   taxa deste perfil → referência do escalão → distância.
 *
 * Apresentação apenas: não calcula nada, recebe já formatado.
 */
import { cn } from "@/lib/utils";

interface Props {
  /** Taxa do perfil já formatada (sem o símbolo %). */
  rateLabel: string;
  /** Eyebrow do KPI principal (versão longa e curta). */
  rateEyebrowFull: string;
  rateEyebrowShort: string;
  /** Legenda curta abaixo do KPI principal. */
  rateCaptionFull: string;
  rateCaptionShort: string;
  /** Benchmark do escalão já formatado (sem o símbolo %). */
  benchmarkLabel: string;
  benchmarkEyebrowFull: string;
  benchmarkEyebrowShort: string;
  benchmarkCaptionFull: string;
  benchmarkCaptionShort: string;
  /** Distância — ex.: "98%" + "inferior". */
  gapLabel: string;
  gapDirection: string;
  gapEyebrowFull: string;
  gapEyebrowShort: string;
  gapCaption: string;
  isPositive: boolean;
}

export function EngagementKpiRow({
  rateLabel,
  rateEyebrowFull,
  rateEyebrowShort,
  rateCaptionFull,
  rateCaptionShort,
  benchmarkLabel,
  benchmarkEyebrowFull,
  benchmarkEyebrowShort,
  benchmarkCaptionFull,
  benchmarkCaptionShort,
  gapLabel,
  gapDirection,
  gapEyebrowFull,
  gapEyebrowShort,
  gapCaption,
  isPositive,
}: Props) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-muted/40 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-5">
        {/* KPI principal — taxa deste perfil */}
        <div className="min-w-0 sm:flex-1">
          <span className="text-eyebrow-sm text-content-secondary block mb-1.5">
            <span className="hidden sm:inline">{rateEyebrowFull}</span>
            <span className="sm:hidden">{rateEyebrowShort}</span>
          </span>
          <div className="flex items-baseline">
            <span className="tabular-nums text-[2rem] sm:text-[2.75rem] font-bold text-content-primary leading-none tracking-tight">
              {rateLabel}
            </span>
            <span className="tabular-nums text-[1.5rem] sm:text-[2rem] font-light text-content-secondary/50 ml-0.5">
              %
            </span>
          </div>
          <span className="block text-sm text-content-secondary mt-1.5 leading-snug">
            <span className="hidden sm:inline">{rateCaptionFull}</span>
            <span className="sm:hidden">{rateCaptionShort}</span>
          </span>
        </div>

        {/* Separador subtil — vertical em desktop, horizontal em mobile */}
        <div
          aria-hidden
          className="h-px w-full bg-border-default sm:h-auto sm:w-px sm:self-stretch"
        />

        {/* Contexto — referência + consequência */}
        <div className="min-w-0 sm:flex-1 flex flex-col gap-3 sm:justify-center">
          {/* Referência do escalão */}
          <div className="min-w-0">
            <span className="text-eyebrow-sm text-content-tertiary block mb-1">
              <span className="hidden sm:inline">{benchmarkEyebrowFull}</span>
              <span className="sm:hidden">{benchmarkEyebrowShort}</span>
            </span>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-sm text-content-tertiary">vs.</span>
              <span className="tabular-nums text-[1.375rem] sm:text-[1.5rem] font-semibold text-content-secondary leading-none">
                {benchmarkLabel}
                <span className="font-light text-content-secondary/60">%</span>
              </span>
              <span className="text-sm text-content-tertiary leading-snug">
                <span className="hidden sm:inline">{benchmarkCaptionFull}</span>
                <span className="sm:hidden">{benchmarkCaptionShort}</span>
              </span>
            </div>
          </div>

          {/* Consequência — distância ao benchmark */}
          <div className="min-w-0">
            <span className="text-eyebrow-sm text-content-tertiary block mb-1">
              <span className="hidden sm:inline">{gapEyebrowFull}</span>
              <span className="sm:hidden">{gapEyebrowShort}</span>
            </span>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-sm text-content-tertiary">→</span>
              <span
                className={cn(
                  "tabular-nums text-[1.375rem] sm:text-[1.5rem] font-semibold leading-none",
                  isPositive ? "text-signal-success" : "text-signal-danger",
                )}
              >
                {gapLabel}
              </span>
              {gapDirection && (
                <span
                  className={cn(
                    "text-sm font-medium",
                    isPositive ? "text-signal-success" : "text-signal-danger",
                  )}
                >
                  {gapDirection}
                </span>
              )}
              <span className="text-sm text-content-tertiary leading-snug">
                {gapCaption}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
