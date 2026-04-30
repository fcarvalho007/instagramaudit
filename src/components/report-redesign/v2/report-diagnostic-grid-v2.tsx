/**
 * Block 02 · Diagnóstico — V2-only 6-card editorial diagnostic grid.
 *
 * Substitui a antiga grelha de 4 cards (que ainda é usada pelo
 * `ReportShell` legacy do PDF). Apenas o `ReportShellV2` consome este
 * componente. Tudo é derivado de heurísticas deterministas sobre os
 * posts já presentes no snapshot — sem chamadas a OpenAI / Apify /
 * DataForSEO / Supabase, sem novos dados.
 *
 * As 6 cartas respondem a perguntas humanas:
 *   01. Tipo de conteúdo dominante
 *   02. Fase do funil mais presente
 *   03. Formato dominante
 *   04. Temas e hashtags recorrentes
 *   05. Padrão das captions
 *   06. Resposta do público
 *
 * Os cartões são *evidência* curta e factual — a síntese narrativa
 * vive na Leitura IA acima, não aqui.
 */

import {
  Sparkles,
  Layers,
  Hash,
  Type,
  MessageCircle,
  Compass,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { ReportData } from "@/components/report/report-mock-data";
import type { SnapshotPost } from "@/lib/report/snapshot-to-report-data";
import {
  classifyContentType,
  classifyFunnelStage,
  classifyCaptionPattern,
  classifyAudienceResponse,
  type ContentTypeResult,
  type FunnelStageResult,
  type CaptionPatternResult,
  type AudienceResponseResult,
} from "@/lib/report/block02-diagnostic";

import { ReportFramedBlock } from "../report-framed-block";

type Tone = "blue" | "amber" | "rose" | "emerald";

interface CardModel {
  index: number;
  eyebrow: string;
  title: string;
  primary: string;
  body: ReactNode;
  micro?: string;
  icon: ReactNode;
  tone: Tone;
}

interface Props {
  keyMetrics: ReportData["keyMetrics"];
  posts: SnapshotPost[];
  topHashtags: ReportData["topHashtags"];
}

const TONE: Record<
  Tone,
  { dot: string; iconWrap: string; icon: string; primary: string }
> = {
  blue: {
    dot: "bg-blue-500",
    iconWrap: "bg-blue-50 ring-blue-100",
    icon: "text-blue-600",
    primary: "text-slate-900",
  },
  amber: {
    dot: "bg-amber-500",
    iconWrap: "bg-amber-50 ring-amber-100",
    icon: "text-amber-600",
    primary: "text-slate-900",
  },
  rose: {
    dot: "bg-rose-500",
    iconWrap: "bg-rose-50 ring-rose-100",
    icon: "text-rose-600",
    primary: "text-rose-700",
  },
  emerald: {
    dot: "bg-emerald-500",
    iconWrap: "bg-emerald-50 ring-emerald-100",
    icon: "text-emerald-600",
    primary: "text-emerald-700",
  },
};

export function ReportDiagnosticGridV2({
  keyMetrics,
  posts,
  topHashtags,
}: Props) {
  const cards: CardModel[] = [
    buildContentTypeCard(classifyContentType(posts)),
    buildFunnelStageCard(classifyFunnelStage(posts)),
    buildFormatCard(keyMetrics),
    buildHashtagsCard(topHashtags),
    buildCaptionCard(classifyCaptionPattern(posts)),
    buildAudienceCard(classifyAudienceResponse(posts)),
  ];

  return (
    <ReportFramedBlock tone="canvas" ariaLabel="Cartões de diagnóstico">
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
          "gap-5 md:gap-6",
          "auto-rows-fr",
        )}
      >
        {cards.map((c) => (
          <DiagnosticCard key={c.index} card={c} />
        ))}
      </div>
    </ReportFramedBlock>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Card chrome
// ─────────────────────────────────────────────────────────────────────

function DiagnosticCard({ card }: { card: CardModel }) {
  const tone = TONE[card.tone];
  return (
    <article
      className={cn(
        "h-full flex flex-col gap-3",
        "rounded-2xl border border-slate-200/70 bg-white",
        "p-5 md:p-6",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.08)]",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={cn("size-1.5 rounded-full shrink-0", tone.dot)}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
          {card.eyebrow}
        </span>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-slate-400">
          {String(card.index).padStart(2, "0")} / 06
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1",
            tone.iconWrap,
          )}
        >
          <span className={tone.icon} aria-hidden>
            {card.icon}
          </span>
        </div>
        <h3
          className={cn(
            "font-display text-[1.05rem] md:text-[1.125rem] font-semibold leading-snug tracking-tight text-slate-900",
            "min-w-0",
          )}
        >
          {card.title}
        </h3>
      </div>

      <p
        className={cn(
          "font-mono text-[1.5rem] md:text-[1.75rem] font-semibold tracking-[-0.015em] leading-tight tabular-nums",
          tone.primary,
        )}
      >
        {card.primary}
      </p>

      {card.micro ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
          {card.micro}
        </p>
      ) : null}

      <p className="text-sm text-slate-600 leading-relaxed mt-auto">
        {card.body}
      </p>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Card builders
// ─────────────────────────────────────────────────────────────────────

function buildContentTypeCard(r: ContentTypeResult): CardModel {
  if (!r.available || !r.label) {
    return {
      index: 1,
      eyebrow: "Natureza",
      icon: <Sparkles className="size-5" aria-hidden />,
      tone: "blue",
      title: "Tipo de conteúdo dominante",
      primary: "Sem padrão claro",
      body: <>Amostra ainda insuficiente para inferir uma natureza dominante.</>,
    };
  }
  if (r.label === "Misto / pouco claro") {
    return {
      index: 1,
      eyebrow: "Natureza",
      icon: <Sparkles className="size-5" aria-hidden />,
      tone: "blue",
      title: "Tipo de conteúdo dominante",
      primary: "Padrão pouco claro",
      body: (
        <>
          Nenhuma natureza concentra mais de um terço das publicações
          analisadas — a comunicação alterna entre vários registos.
        </>
      ),
    };
  }
  return {
    index: 1,
    eyebrow: "Natureza",
    icon: <Sparkles className="size-5" aria-hidden />,
    tone: "blue",
    title: "Tipo de conteúdo dominante",
    primary: `Predominância provável: ${r.label}`,
    micro: `${r.sharePct} % da amostra`,
    body: (
      <>
        {r.label} aparece em cerca de {r.sharePct} % das {r.sampleSize}
        {" "}publicações analisadas, com base em legendas e hashtags.
      </>
    ),
  };
}

function buildFunnelStageCard(r: FunnelStageResult): CardModel {
  if (!r.available || !r.label) {
    return {
      index: 2,
      eyebrow: "Funil",
      icon: <Compass className="size-5" aria-hidden />,
      tone: "blue",
      title: "Fase do funil mais presente",
      primary: "Sem dados suficientes",
      body: <>Necessárias mais publicações para identificar a fase dominante.</>,
    };
  }
  if (r.label === "Comunicação dispersa") {
    return {
      index: 2,
      eyebrow: "Funil",
      icon: <Compass className="size-5" aria-hidden />,
      tone: "amber",
      title: "Fase do funil mais presente",
      primary: "Comunicação dispersa",
      body: (
        <>
          Os sinais de atrair, educar, converter e fidelizar aparecem
          misturados, sem uma fase claramente dominante.
        </>
      ),
    };
  }
  const bodyByLabel: Record<string, string> = {
    "Topo do funil":
      "A maior parte das publicações procura captar atenção e gerar curiosidade.",
    "Meio do funil":
      "A maioria do conteúdo educa e explica, posicionando o perfil como referência.",
    "Fundo do funil":
      "Há sinais frequentes de chamada à ação — links, ofertas ou pedidos de contacto.",
    "Pós-venda / fidelização":
      "O perfil dá protagonismo a clientes, comunidade e agradecimentos.",
  };
  return {
    index: 2,
    eyebrow: "Funil",
    icon: <Compass className="size-5" aria-hidden />,
    tone: "blue",
    title: "Fase do funil mais presente",
    primary: r.label,
    micro: `${r.sharePct} % da amostra`,
    body: <>{bodyByLabel[r.label]}</>,
  };
}

function buildFormatCard(km: ReportData["keyMetrics"]): CardModel {
  const share = km.dominantFormatShare ?? 0;
  if (!km.dominantFormat || share <= 0) {
    return {
      index: 3,
      eyebrow: "Formato",
      icon: <Layers className="size-5" aria-hidden />,
      tone: "blue",
      title: "Formato dominante",
      primary: "Sem dados suficientes",
      body: <>Sem distribuição de formatos disponível na amostra.</>,
    };
  }
  const label = humanFormat(km.dominantFormat);
  const high = share >= 60;
  return {
    index: 3,
    eyebrow: "Formato",
    icon: <Layers className="size-5" aria-hidden />,
    tone: high ? "amber" : "blue",
    title: "Formato dominante",
    primary: label,
    micro: `${Math.round(share)} % da amostra`,
    body: high ? (
      <>
        A maioria das publicações analisadas é em {label.toLowerCase()} —
        diversificar pode equilibrar a leitura do perfil.
      </>
    ) : (
      <>
        {label} é o formato mais usado, sem chegar a uma dependência clara
        de um único tipo de publicação.
      </>
    ),
  };
}

function buildHashtagsCard(
  tags: ReportData["topHashtags"],
): CardModel {
  if (!Array.isArray(tags) || tags.length === 0) {
    return {
      index: 4,
      eyebrow: "Temas",
      icon: <Hash className="size-5" aria-hidden />,
      tone: "blue",
      title: "Temas e hashtags recorrentes",
      primary: "Sem hashtags recorrentes",
      body: (
        <>
          As publicações analisadas usam poucas hashtags ou variam de tema
          a cada publicação.
        </>
      ),
    };
  }
  const top = tags.slice(0, 4);
  const primary = top
    .map((t) => (t.tag.startsWith("#") ? t.tag : `#${t.tag}`))
    .join("  ");
  return {
    index: 4,
    eyebrow: "Temas",
    icon: <Hash className="size-5" aria-hidden />,
    tone: "blue",
    title: "Temas e hashtags recorrentes",
    primary,
    micro: `${tags.length} hashtags recorrentes`,
    body: (
      <>
        Estes temas voltam com frequência ao longo da amostra e descrevem o
        território editorial mais consistente do perfil.
      </>
    ),
  };
}

function buildCaptionCard(r: CaptionPatternResult): CardModel {
  if (!r.available) {
    return {
      index: 5,
      eyebrow: "Legendas",
      icon: <Type className="size-5" aria-hidden />,
      tone: "blue",
      title: "Padrão das captions",
      primary: "Sem dados suficientes",
      body: <>Necessárias mais publicações com legenda para inferir o padrão.</>,
    };
  }
  const ctaLine =
    r.ctaSharePct >= 30
      ? ` Cerca de ${r.ctaSharePct} % incluem chamada à ação ou pergunta direta.`
      : "";
  return {
    index: 5,
    eyebrow: "Legendas",
    icon: <Type className="size-5" aria-hidden />,
    tone: "blue",
    title: "Padrão das captions",
    primary: r.label,
    micro: `~${r.avgLength} caracteres em média`,
    body: (
      <>
        As legendas analisadas tendem a ser {r.label.toLowerCase()}.{ctaLine}
      </>
    ),
  };
}

function buildAudienceCard(r: AudienceResponseResult): CardModel {
  if (!r.available) {
    return {
      index: 6,
      eyebrow: "Audiência",
      icon: <MessageCircle className="size-5" aria-hidden />,
      tone: "blue",
      title: "Resposta do público",
      primary: "Sem dados suficientes",
      body: <>Faltam interações suficientes para caracterizar a resposta.</>,
    };
  }
  const tone: Tone =
    r.label === "Audiência ativa"
      ? "emerald"
      : r.label === "Audiência silenciosa"
        ? "amber"
        : "blue";
  const bodyByLabel: Record<string, string> = {
    "Audiência ativa":
      "Os comentários surgem de forma consistente em relação aos likes — sinal de conversa, não apenas consumo.",
    "Resposta moderada":
      "Os comentários aparecem, mas em volume moderado face aos likes recebidos.",
    "Audiência silenciosa":
      "O público reage sobretudo com likes; os comentários são pouco frequentes.",
  };
  return {
    index: 6,
    eyebrow: "Audiência",
    icon: <MessageCircle className="size-5" aria-hidden />,
    tone,
    title: "Resposta do público",
    primary: r.label,
    micro: `~${r.avgComments} comentários · ${r.commentsToLikesPct} % do total de likes`,
    body: <>{bodyByLabel[r.label]}</>,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function humanFormat(raw: string): string {
  const map: Record<string, string> = {
    Reels: "Reels",
    Reel: "Reels",
    Carousels: "Carrosséis",
    Carrosseis: "Carrosséis",
    Carrosséis: "Carrosséis",
    Carousel: "Carrosséis",
    Imagens: "Imagens",
    Image: "Imagens",
    Photo: "Imagens",
    Photos: "Imagens",
    Video: "Vídeo",
  };
  return map[raw] ?? raw;
}