/**
 * Comment Intelligence subsection for Block 02 → Q05 "Resposta".
 *
 * Renders brand reply analysis when `commentIntelligence` is available (PRO),
 * or a discreet PRO teaser when absent (FREE).
 */

import type { CommentIntelligence } from "@/lib/analysis/types";
import { cn } from "@/lib/utils";
import { MessageCircleReply, Lock } from "lucide-react";

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
}

function classifyBrandReply(ci: CommentIntelligence): { status: BrandReplyStatus; config: StatusConfig } {
  if (ci.sampleComments < 5) {
    return {
      status: "insufficient",
      config: { label: "Sem dados suficientes", tone: "slate" },
    };
  }
  if (ci.ownerReplyRatePct >= 30) {
    return {
      status: "active",
      config: { label: "Marca responde ativamente", tone: "emerald" },
    };
  }
  if (ci.ownerReplyRatePct >= 10) {
    return {
      status: "occasional",
      config: { label: "Responde pontualmente", tone: "amber" },
    };
  }
  if (ci.ownerRepliesCount > 0) {
    return {
      status: "minimal",
      config: { label: "Presença mínima na conversa", tone: "amber" },
    };
  }
  return {
    status: "absent",
    config: { label: "Não foram detetadas respostas da marca", tone: "rose" },
  };
}

const TONE_CLASSES: Record<StatusConfig["tone"], string> = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
};

// ─────────────────────────────────────────────────────────────────────
// PRO Teaser (shown when comment intelligence is not available)
// ─────────────────────────────────────────────────────────────────────

export function CommentIntelligenceTeaser() {
  return (
    <div className="mt-4 flex items-center gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <p className="text-[12px] leading-relaxed text-slate-500">
        Análise de respostas da marca disponível no plano Pro.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Full Comment Intelligence Section (PRO)
// ─────────────────────────────────────────────────────────────────────

interface Props {
  data: CommentIntelligence;
}

export function CommentIntelligenceSection({ data }: Props) {
  const { config } = classifyBrandReply(data);

  return (
    <div className="mt-5 space-y-3">
      {/* Title */}
      <div className="flex items-center gap-2">
        <MessageCircleReply className="h-4 w-4 text-slate-500" />
        <h4 className="text-[13px] font-semibold text-slate-700">
          A marca participa na conversa?
        </h4>
      </div>

      {/* Status badge */}
      <div
        className={cn(
          "inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium",
          TONE_CLASSES[config.tone],
        )}
      >
        {config.label}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <MetricCell
          label="Respostas da marca"
          value={`${data.ownerRepliesCount} em ${data.audienceCommentsCount} comentários`}
        />
        <MetricCell
          label="Publicações com resposta"
          value={`${data.postsWithOwnerReplyPct}% das publicações analisadas`}
        />
      </div>

      {/* Top conversation post */}
      {data.topConversationPost && (
        <div className="rounded-md border border-slate-100 bg-white px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Publicação com mais interação da marca
          </p>
          <p className="mt-1 text-[12.5px] text-slate-600">
            {data.topConversationPost.ownerRepliesCount} respostas em{" "}
            {data.topConversationPost.commentsCount} comentários
          </p>
        </div>
      )}

      {/* Transparency / limitations */}
      <div className="space-y-0.5 pt-1">
        {data.limitations.map((l, i) => (
          <p key={i} className="text-[11px] leading-relaxed text-slate-400">
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-100 bg-white px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-[13px] text-slate-700">{value}</p>
    </div>
  );
}