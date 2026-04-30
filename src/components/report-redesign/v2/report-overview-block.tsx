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
 *    Mostra a identidade pública do perfil Instagram e factos públicos
 *    básicos: avatar, handle, verified, nome, bio, publicações,
 *    seguidores, a seguir, mais a meta da análise (publicações
 *    analisadas, dias, data).
 *
 * 2. Três cartões de overview (`ReportOverviewCards`)
 *    Resumem o estado geral do perfil em três lentes:
 *      a) Taxa de engagement     — ER vs. referência.
 *      b) Ritmo de publicação    — frequência semanal e amostra.
 *      c) Formato mais regular   — formato dominante e mistura.
 *    Cada cartão tem valor grande, indicador visual e uma frase de
 *    interpretação curta. Sem tabelas, sem listas longas.
 *
 * 3. Linha "O que merece atenção primeiro" (`ReportOverviewAttentionRow`)
 *    Até 3 sinais derivados do `AdapterResult`. Aparecem só quando os
 *    dados os suportam (sem placeholders). Servem de aperitivo do
 *    diagnóstico — nunca o substituem.
 *
 * 4. NÃO pertence ao Bloco 01:
 *      • explicações longas / diagnóstico completo
 *      • detalhe dos top posts
 *      • análise profunda Google / Search / procura externa
 *      • comparação detalhada com concorrentes
 *      • placeholders de "history will appear later" (ex.: crescimento
 *        de seguidores)
 *      • repetição de stats de perfil já mostradas no hero
 *      • mais do que 3 sinais na attention row
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
import { ReportOverviewAttentionRow } from "./report-overview-attention-row";

interface Props {
  result: AdapterResult;
  /**
   * Renderer de insight v2 já provido pelo `ReportShellV2`. Mantém-se
   * a mesma assinatura — devolve `ReactNode | null` para a chave.
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
  const insightNode = renderInsight("hero");

  return (
    <div className="relative space-y-8 md:space-y-10">
      {/* Watermark "01" — decorativo, não empurra layout. */}
      <div
        aria-hidden="true"
        className={cn(
          "hidden lg:block absolute -top-16 right-0 lg:right-2 z-0 select-none pointer-events-none",
          REDESIGN_TOKENS.blockNumberDecor,
        )}
      >
        01
      </div>

      <div className="relative z-10">
        <ReportOverviewCards result={result} />
      </div>

      <div className="relative z-10">
        <ReportOverviewAttentionRow result={result} />
      </div>

      {insightNode ? (
        <div className="relative z-10 max-w-3xl mt-2">
          <div className="mb-3 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[linear-gradient(135deg,#EFF6FF,#DBEAFE)] text-blue-600 ring-1 ring-blue-100"
            >
              <Bot className="h-3.5 w-3.5" />
            </span>
            <p className={REDESIGN_TOKENS.eyebrowAccent}>Leitura IA</p>
          </div>
          <p className="mb-3 text-[13px] md:text-sm text-slate-500 leading-relaxed">
            Síntese gerada a partir dos dados públicos do perfil, da
            referência de mercado e dos sinais de procura externa.
          </p>
          <div className={REDESIGN_TOKENS.insightFrameV2}>{insightNode}</div>
        </div>
      ) : null}
    </div>
  );
}
