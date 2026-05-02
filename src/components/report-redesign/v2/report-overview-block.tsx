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

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import type { AiInsightV2Section } from "@/lib/insights/types";

import { ReportOverviewCards } from "./report-overview-cards";
import { ReportTopPosts } from "@/components/report/report-top-posts";

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
export function ReportOverviewBlock({ result, renderInsight }: Props) {

  return (
    <div className="relative space-y-8 md:space-y-10">
      <div className="relative z-10">
        <ReportOverviewCards result={result} />
      </div>

      {/* Top 5 publicações — prova imediata de que o conteúdo foi lido */}
      <div className="relative z-10">
        <ReportTopPosts />
        <div className="mt-4">{renderInsight("topPosts")}</div>
      </div>
    </div>
  );
}
