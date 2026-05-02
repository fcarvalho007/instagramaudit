/**
 * Comment Intelligence subsection for Block 02 → Q05 "Resposta".
 *
 * Two states:
 *   Available   → CommentIntelligenceSection — "Marca na conversa" sub-card
 *   Unavailable → CommentIntelligenceUnavailable — neutral note (no upsell)
 */

import type { CommentIntelligence } from "@/lib/analysis/types";
import { cn } from "@/lib/utils";
import {
  MessageCircleReply,
  Info,
  MessageCircle,
  ShieldCheck,
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
        label: "Marca responde ativamente",
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
        label: "Presença mínima",
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
// Scope note — shared between both states
// ─────────────────────────────────────────────────────────────────────

const SCOPE_NOTE =
  "Esta leitura usa comentários públicos acessíveis. Não inclui DMs, comentários apagados, respostas privadas ou comentários não visíveis sem login.";

function ScopeNote() {
  return (
    <p className="text-[11px] leading-relaxed text-slate-400 italic">
      {SCOPE_NOTE}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Unavailable state (shown when comment intelligence data is absent)
// ─────────────────────────────────────────────────────────────────────

export function CommentIntelligenceUnavailable() {
  return (
    <div className="mt-5 space-y-3">
      {/* Sub-card header */}
      <div className="flex items-center gap-2">
        <MessageCircleReply
          className="h-4 w-4 shrink-0 text-slate-400"
          aria-hidden="true"
        />
        <h4 className="text-[13px] font-semibold text-slate-700">
          A marca participa na conversa?
        </h4>
      </div>

      {/* Info box */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <p className="text-[12.5px] font-medium text-slate-500">
            Análise de respostas indisponível
          </p>
        </div>
        <p className="text-[12px] leading-relaxed text-slate-500">
          A análise de comentários não está disponível para este relatório.
          Esta funcionalidade verifica se a marca responde aos comentários
          públicos dos posts analisados.
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

  return (
    <div className="mt-5 space-y-4">
      {/* Sub-card header */}
      <div className="flex items-center gap-2">
        <MessageCircleReply
          className="h-4 w-4 shrink-0 text-slate-500"
          aria-hidden="true"
        />
        <h4 className="text-[13px] font-semibold text-slate-700">
          Marca na conversa
        </h4>
      </div>

      {/* Status badge with icon */}
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

      {/* Editorial reading */}
      <p className="text-[12.5px] leading-relaxed text-slate-600">
        {config.editorial}
      </p>

      {/* 4-metric grid */}
      <div className="grid grid-cols-2 gap-2">
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
          label="Comentários analisados"
          value={data.sampleComments.toLocaleString("pt-PT")}
        />
      </div>

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

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 break-words">
        {label}
      </p>
      <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-slate-800">
        {value}
      </p>
    </div>
  );
}
