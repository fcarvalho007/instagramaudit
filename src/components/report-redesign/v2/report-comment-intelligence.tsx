/**
 * Comment Intelligence subsection for Block 02 → Q05 "Resposta".
 * Part of the FREE report — no PRO gating.
 *
 * Two states:
 *   Available   → CommentIntelligenceSection — full analysis
 *   Unavailable → CommentIntelligenceUnavailable — neutral note
 */

import type { CommentIntelligence } from "@/lib/analysis/types";
import { cn } from "@/lib/utils";
import { InsightCallout } from "./insight-callout";
import {
  MessageCircleReply,
  Info,
  MessageCircle,
  ShieldCheck,
  HelpCircle,
  ShoppingCart,
  ThumbsUp,
  AlertTriangle,
  Ban,
  Loader2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────
// Status classification
// ─────────────────────────────────────────────────────────────────────

type BrandReplyStatus =
  | "active"
  | "occasional"
  | "minimal"
  | "absent"
  | "insufficient";

interface StatusConfig {
  label: string;
  tone: "emerald" | "amber" | "rose" | "slate";
  editorial: string;
}

function classifyBrandReply(ci: CommentIntelligence): {
  status: BrandReplyStatus;
  config: StatusConfig;
} {
  if (ci.sampleComments < 5) {
    return {
      status: "insufficient",
      config: {
        label: "Sem dados suficientes",
        tone: "slate",
        editorial:
          "A amostra de comentários analisados é demasiado pequena para determinar se a marca participa na conversa.",
      },
    };
  }
  if (ci.ownerReplyRatePct >= 30) {
    return {
      status: "active",
      config: {
        label: "Responde ativamente",
        tone: "emerald",
        editorial:
          "A marca mantém presença consistente nos comentários — responde a uma parte significativa da audiência.",
      },
    };
  }
  if (ci.ownerReplyRatePct >= 10) {
    return {
      status: "occasional",
      config: {
        label: "Responde pontualmente",
        tone: "amber",
        editorial:
          "Há respostas esporádicas, mas sem consistência que sinalize uma política ativa de community management.",
      },
    };
  }
  if (ci.ownerRepliesCount > 0) {
    return {
      status: "minimal",
      config: {
        label: "Quase não responde",
        tone: "amber",
        editorial:
          "Foram detetadas respostas pontuais, mas em volume insuficiente para indicar participação ativa na conversa.",
      },
    };
  }
  return {
    status: "absent",
    config: {
      label: "Sem respostas detetadas",
      tone: "rose",
      editorial:
        "Não foram encontradas respostas da marca nos comentários analisados. A audiência comenta, mas não recebe retorno público.",
    },
  };
}

const BADGE_CLASSES: Record<StatusConfig["tone"], string> = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
};

const BADGE_ICON_CLASSES: Record<StatusConfig["tone"], string> = {
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  rose: "text-rose-500",
  slate: "text-slate-400",
};

// ─────────────────────────────────────────────────────────────────────
// Scope note — shared
// ─────────────────────────────────────────────────────────────────────

const SCOPE_NOTE =
  "Esta leitura usa comentários públicos acessíveis nos posts analisados. Não inclui DMs, comentários apagados, respostas privadas ou comentários não visíveis sem login.";

function ScopeNote() {
  return (
    <p className="text-[11px] leading-relaxed text-slate-400 italic">
      {SCOPE_NOTE}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Signal chips
// ─────────────────────────────────────────────────────────────────────

interface SignalChip {
  key: string;
  label: string;
  count: number;
  Icon: typeof HelpCircle;
  className: string;
}

function buildSignalChips(ci: CommentIntelligence): SignalChip[] {
  const chips: SignalChip[] = [];
  if (ci.questionsFromAudienceCount > 0) {
    chips.push({
      key: "questions",
      label: "Perguntas",
      count: ci.questionsFromAudienceCount,
      Icon: HelpCircle,
      className: "border-blue-200 bg-blue-50 text-blue-700",
    });
  }
  if (ci.praiseCount > 0) {
    chips.push({
      key: "praise",
      label: "Elogios",
      count: ci.praiseCount,
      Icon: ThumbsUp,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    });
  }
  if (ci.complaintOrIssueCount > 0) {
    chips.push({
      key: "complaint",
      label: "Problemas ou queixas",
      count: ci.complaintOrIssueCount,
      Icon: AlertTriangle,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    });
  }
  if (ci.buyingIntentCount > 0) {
    chips.push({
      key: "buying",
      label: "Intenção de compra",
      count: ci.buyingIntentCount,
      Icon: ShoppingCart,
      className: "border-violet-200 bg-violet-50 text-violet-700",
    });
  }
  if (ci.spamOrLowQualityCount > 0) {
    chips.push({
      key: "spam",
      label: "Ruído ou spam",
      count: ci.spamOrLowQualityCount,
      Icon: Ban,
      className: "border-slate-200 bg-slate-50 text-slate-500",
    });
  }
  return chips;
}

// ─────────────────────────────────────────────────────────────────────
// Unavailable state
// ─────────────────────────────────────────────────────────────────────

const UNAVAILABLE_REASONS: Record<string, { title: string; body: string }> = {
  processing: {
    title: "A aguardar análise de comentários",
    body: "Análise de comentários em processamento. Atualiza o relatório dentro de alguns instantes.",
  },
  budget_blocked: {
    title: "Análise não executada",
    body: "Análise de comentários não executada para manter o custo dentro do limite operacional.",
  },
  comment_scraper_failed: {
    title: "Análise indisponível",
    body: "Não foi possível analisar comentários nesta execução.",
  },
  comment_scraper_disabled: {
    title: "Análise desativada",
    body: "A análise de comentários está temporariamente desativada.",
  },
  no_posts_with_comments: {
    title: "Sem comentários acessíveis",
    body: "As publicações analisadas não contêm comentários públicos acessíveis.",
  },
  no_valid_post_urls: {
    title: "URLs insuficientes",
    body: "Não havia URLs públicos suficientes para analisar comentários.",
  },
};

export function CommentIntelligenceUnavailable({ data }: { data?: CommentIntelligence | null }) {
  const reason = data?.reason;
  const info = reason ? UNAVAILABLE_REASONS[reason] : undefined;
  const title = info?.title ?? "A aguardar análise de comentários";
  const body = info?.body ?? "Comentários públicos não analisados nesta execução.";
  const isProcessing = reason === "processing";

  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircleReply
          className="h-4 w-4 shrink-0 text-slate-400"
          aria-hidden="true"
        />
        <h4 className="text-[13px] font-semibold text-slate-700">
          A marca participa na conversa?
        </h4>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3.5 space-y-1.5">
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 text-slate-400 animate-spin" aria-hidden="true" />
          ) : (
            <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          )}
          <p className="text-[12.5px] font-medium text-slate-500">
            {title}
          </p>
        </div>
        <p className="text-[12px] leading-relaxed text-slate-500">
          {body}
        </p>
      </div>

      <ScopeNote />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Full Comment Intelligence Section
// ─────────────────────────────────────────────────────────────────────

interface Props {
  data: CommentIntelligence;
}

export function CommentIntelligenceSection({ data }: Props) {
  const { config } = classifyBrandReply(data);
  const signalChips = buildSignalChips(data);

  return (
    <div className="mt-5 space-y-4">
      {/* Sub-card header */}
      <div className="flex items-center gap-2">
        <MessageCircleReply
          className="h-4 w-4 shrink-0 text-slate-500"
          aria-hidden="true"
        />
        <h4 className="text-[13px] font-semibold text-slate-700">
          A marca participa na conversa?
        </h4>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium",
            BADGE_CLASSES[config.tone],
          )}
        >
          <MessageCircle
            className={cn("h-3 w-3 shrink-0", BADGE_ICON_CLASSES[config.tone])}
            aria-hidden="true"
          />
          {config.label}
        </div>
      </div>

      {/* Editorial interpretation */}
      <InsightCallout
        tone={config.tone === "emerald" ? "editorial" : config.tone === "rose" ? "warning" : "suggestion"}
        label={config.tone === "emerald" ? "Leitura editorial" : config.tone === "rose" ? "Atenção" : "O que isto sugere"}
      >
        {config.editorial}
      </InsightCallout>

      {/* 6-metric grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MetricCell
          label="Respostas da marca"
          value={String(data.ownerRepliesCount)}
        />
        <MetricCell
          label="Taxa de resposta"
          value={`${data.ownerReplyRatePct}%`}
        />
        <MetricCell
          label="Posts com resposta"
          value={`${data.postsWithOwnerReplyPct}%`}
        />
        <MetricCell
          label="Perguntas do público"
          value={String(data.questionsFromAudienceCount)}
        />
        <MetricCell
          label="Intenção de compra"
          value={String(data.buyingIntentCount)}
        />
        <MetricCell
          label="Queixas detetadas"
          value={String(data.complaintOrIssueCount)}
        />
      </div>

      {/* Conversation quality signals */}
      {signalChips.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-eyebrow-sm text-slate-500">Sinais de conversa</p>
          <div className="flex flex-wrap gap-1.5">
            {signalChips.map((chip) => (
              <div
                key={chip.key}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                  chip.className,
                )}
              >
                <chip.Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="break-words">{chip.label}</span>
                <span className="tabular-nums font-semibold">{chip.count}</span>
              </div>
            ))}
          </div>
          <p className="text-[10.5px] text-slate-400">
            Leitura automática — classificação heurística dos comentários públicos.
          </p>
        </div>
      )}

      {/* Recommended action */}
      {data.recommendedConversationAction && (
        <InsightCallout tone="suggestion" label="Ação recomendada">
          {data.recommendedConversationAction}
        </InsightCallout>
      )}

      {/* Top conversation post */}
      {data.topConversationPost && (
        <div className="rounded-lg border border-slate-100 bg-white px-3.5 py-2.5 space-y-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck
              className="h-3 w-3 shrink-0 text-slate-400"
              aria-hidden="true"
            />
            <p className="text-eyebrow-sm text-slate-500">
              Publicação com mais interação da marca
            </p>
          </div>
          <p className="text-[13px] text-slate-700">
            <span className="font-semibold tabular-nums">
              {data.topConversationPost.ownerRepliesCount}
            </span>{" "}
            {data.topConversationPost.ownerRepliesCount === 1
              ? "resposta"
              : "respostas"}{" "}
            em{" "}
            <span className="tabular-nums">
              {data.topConversationPost.commentsCount}
            </span>{" "}
            comentários
          </p>
        </div>
      )}

      {/* Sample info */}
      <p className="text-[11px] text-slate-400">
        Amostra: {data.sampleComments.toLocaleString("pt-PT")} comentários em {data.samplePosts}{" "}
        {data.samplePosts === 1 ? "publicação" : "publicações"}
        {data.sampleReplies > 0 && ` · ${data.sampleReplies} respostas aninhadas`}
      </p>

      {/* Scope + limitations */}
      <div className="space-y-1 pt-1">
        <ScopeNote />
        {data.limitations
          .filter((l) => !l.includes("comentários públicos"))
          .map((l, i) => (
            <p
              key={i}
              className="text-[11px] leading-relaxed text-slate-400"
            >
              {l}
            </p>
          ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function MetricCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 break-words leading-tight">
        {label}
      </p>
      <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-slate-800">
        {value}
      </p>
    </div>
  );
}
