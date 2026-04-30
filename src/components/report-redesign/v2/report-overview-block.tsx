/**
 * ─────────────────────────────────────────────────────────────────────
 * Bloco 01 · Overview — papel editorial (NÃO transformar em dashboard)
 * ─────────────────────────────────────────────────────────────────────
 *
 * Este ficheiro compõe o Bloco 01 do relatório `/analyze/$username`. A
 * sua função é dar ao leitor uma leitura de SEGUNDOS sobre o estado
 * geral do perfil, antes do diagnóstico detalhado. Toda a interpretação
 * profunda pertence ao Bloco 02 em diante.
 *
 * 1. Hero (acima deste bloco — ver `ReportHeroV2`)
 *    Mostra a identidade pública do perfil Instagram.
 *
 * 2. Três cartões de overview (`ReportOverviewCards`) com hierarquia
 *    assimétrica: Taxa de envolvimento como cartão primário e Ritmo /
 *    Formato como cartões secundários empilhados.
 *
 * 3. Síntese "Leitura IA" — calma, editorial. NUNCA renderizar como
 *    alerta vermelho/rosa, mesmo quando o emphasis v2 é "negative".
 *    Usamos o texto v2 directamente, não o componente partilhado
 *    `AIInsightBox`, para garantir tratamento neutro.
 *
 * 4. NÃO pertence ao Bloco 01:
 *      • explicações longas / diagnóstico completo
 *      • detalhe dos top posts
 *      • análise profunda Google / Search / procura externa
 *      • comparação detalhada com concorrentes
 *      • placeholders de "history will appear later" (ex.: crescimento
 *        de seguidores)
 *      • repetição de stats de perfil já mostradas no hero
 *      • duplicação dos diagnósticos dos cartões numa attention row
 *
 * 5. Handoff
 *    A interpretação detalhada (motivos, recomendações, sinais de
 *    procura, comparação com pares, top posts, hashtags, melhor
 *    horário, etc.) vive no Bloco 02 e seguintes. O Bloco 01 deve
 *    permanecer leve, editorial e cinematográfico.
 * ─────────────────────────────────────────────────────────────────────
 */
import type { ReactNode } from "react";
import { Bot } from "lucide-react";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import type { AiInsightV2Section } from "@/lib/insights/types";
import { cn } from "@/lib/utils";

import { REDESIGN_TOKENS } from "../report-tokens";
import { ReportOverviewCards } from "./report-overview-cards";

interface Props {
  result: AdapterResult;
  /**
   * Renderer de insight v2 partilhado pelo `ReportShellV2`. Mantido
   * para compatibilidade da assinatura, mas o Bloco 01 usa o texto v2
   * directamente para impor um tratamento calmo (não-alerta).
   */
  renderInsight: (key: AiInsightV2Section) => ReactNode;
}

/**
 * Composição visual do Bloco 01 · Overview (Phase 1B.1F).
 *
 *  - watermark "01" decorativo (não empurra layout)
 *  - 3 cartões cinematográficos: Saúde do envolvimento, Ritmo, Motor
 *  - frame editorial "Leitura IA" com pista visual de IA
 */
export function ReportOverviewBlock({ result, renderInsight: _renderInsight }: Props) {
  void _renderInsight;
  const heroInsight = result.enriched.aiInsightsV2?.sections.hero ?? null;
  const insightText = heroInsight?.text?.trim() || null;

  return (
    <div className="relative space-y-8 md:space-y-10">
<div className="relative z-10">
        <ReportOverviewCards result={result} />
      </div>

      {insightText ? (
        <aside
          role="note"
          aria-label="Leitura IA"
          className={cn(
            "relative z-10 max-w-3xl",
            "rounded-2xl bg-white border border-blue-100 ring-1 ring-blue-50",
            "border-l-2 border-l-blue-300",
            "px-5 py-4 md:px-6 md:py-5",
            "shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-16px_rgba(59,130,246,0.18)]",
          )}
        >
          <div className="flex items-start gap-3 md:gap-4">
            <span
              aria-hidden="true"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 ring-1 ring-blue-100"
            >
              <Bot className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className={REDESIGN_TOKENS.eyebrowAccent}>Leitura IA</p>
              <p className="text-[14px] md:text-[15px] leading-relaxed text-slate-700">
                {insightText}
              </p>
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
