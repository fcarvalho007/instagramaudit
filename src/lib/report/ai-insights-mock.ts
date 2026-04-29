import type { AIInsightEmphasis } from "@/components/report/ai-insight-box";

export type { AIInsightEmphasis };

export interface AIInsightEntry {
  emphasis: AIInsightEmphasis;
  text: string;
}

/**
 * Static "Leitura IA" copy attached to each report section. These are the
 * editorial annotations rendered under the data — written for non-expert
 * readers. Prompt R2 will swap this for a live, profile-specific generation
 * via the OpenAI insights pipeline; the keys here are the contract.
 */
export const AI_INSIGHTS_MOCK: Record<string, AIInsightEntry> = {
  hero: {
    emphasis: "negative",
    text: "Perfil micro com cadência alta (6 publicações por semana) mas envolvimento de 0,11% — significativamente abaixo do benchmark de 4,2% para o tier nano. Foco prioritário: testar Reels e gancho mais forte nos primeiros 3 segundos.",
  },
  marketSignals: {
    emphasis: "positive",
    text: "Tema 'IA' com forte tendência de subida nos últimos 60 dias — sinal claro de procura crescente. Reforçar conteúdo sobre IA nas próximas 4 semanas para capturar este interesse e converter em alcance.",
  },
  temporal: {
    emphasis: "default",
    text: "Pico de visualizações em 22 Abr (1200+) sugere conteúdo viral pontual — analisar o que diferenciou esse post (formato, tema, hora) e replicar a estrutura nos próximos 5 posts.",
  },
  benchmark: {
    emphasis: "negative",
    text: "55% abaixo do benchmark de contas Micro com Reels. Causa principal: performance individual de cada Reel. Para fechar o gap de 4,1pp, foco em formato Reel (24% mais potencial de envolvimento neste tier).",
  },
  format: {
    emphasis: "neutral",
    text: "Carrosséis dominam (75% do conteúdo) mas com envolvimento de 0,13%. Reels representam apenas 25% mas têm o maior potencial nesta categoria. Recomendação: testar split 50/50 nas próximas 2 semanas e medir.",
  },
  topPosts: {
    emphasis: "default",
    text: "Os 5 posts com melhor desempenho têm 1 padrão claro: todos são carrosséis sobre IA. Confirma o sinal de mercado da secção anterior — IA é o tema com tração real para este perfil.",
  },
  heatmap: {
    emphasis: "default",
    text: "Pico de envolvimento Terça 17h (0,24%). 2x mais do que a média geral (0,11%). Republicar conteúdo de maior potencial neste horário pode duplicar o alcance médio.",
  },
  bestDays: {
    emphasis: "positive",
    text: "Terças destacam-se claramente acima dos restantes dias. Concentrar lançamentos importantes neste dia e usar os outros para testes de formato.",
  },
  hashtagsKeywords: {
    emphasis: "neutral",
    text: "#IA é a hashtag com maior envolvimento associado (0,15%). Vocabulário 'marketing' aparece 9x — reforçar com palavras emergentes como 'estratégia' e 'método' para diversificar e aumentar alcance.",
  },
} as const;