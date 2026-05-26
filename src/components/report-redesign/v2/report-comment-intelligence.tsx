/**
 * Comment Intelligence subsection for Block 02 → Q05 "Resposta".
 * Part of the FREE report — no PRO gating.
 *
 * Two states:
 *   Available   → CommentIntelligenceSection — full analysis
 *   Unavailable → CommentIntelligenceUnavailable — neutral note
 */

import type { CommentIntelligence } from "@/lib/analysis/types";
import { useVariantFeatures } from "@/lib/report/report-variant";
import { useTranslation } from "react-i18next";
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
  BarChart3,
  Sparkles,
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

function classifyBrandReply(
  ci: CommentIntelligence,
  t: (key: string) => string,
): {
  status: BrandReplyStatus;
  config: StatusConfig;
} {
  if (ci.sampleComments < 5) {
    return {
      status: "insufficient",
      config: {
        label: t("comments.status.insufficient_label"),
        tone: "slate",
        editorial: t("comments.status.insufficient_body"),
      },
    };
  }
  if (ci.ownerReplyRatePct >= 30) {
    return {
      status: "active",
      config: {
        label: t("comments.status.active_label"),
        tone: "emerald",
        editorial: t("comments.status.active_body"),
      },
    };
  }
  if (ci.ownerReplyRatePct >= 10) {
    return {
      status: "occasional",
      config: {
        label: t("comments.status.occasional_label"),
        tone: "amber",
        editorial: t("comments.status.occasional_body"),
      },
    };
  }
  if (ci.ownerRepliesCount > 0) {
    return {
      status: "minimal",
      config: {
        label: t("comments.status.minimal_label"),
        tone: "amber",
        editorial: t("comments.status.minimal_body"),
      },
    };
  }
  return {
    status: "absent",
    config: {
      label: t("comments.status.absent_label"),
      tone: "rose",
      editorial: t("comments.status.absent_body"),
    },
  };
}

/* Badge classes — local tone map using semantic tokens where possible.
 * "rose" uses tint-danger with softened text to avoid aggressive red. */
const BADGE_CLASSES: Record<StatusConfig["tone"], string> = {
  emerald: "border-signal-success/20 bg-tint-success text-signal-success",
  amber: "border-signal-warning/20 bg-tint-warning text-signal-warning",
  rose: "border-signal-danger/20 bg-tint-danger text-signal-danger",
  slate: "border-border-default bg-surface-muted text-content-secondary",
};

const BADGE_ICON_CLASSES: Record<StatusConfig["tone"], string> = {
  emerald: "text-signal-success",
  amber: "text-signal-warning",
  rose: "text-signal-danger",
  slate: "text-content-tertiary",
};

// ─────────────────────────────────────────────────────────────────────
// Scope note — shared
// ─────────────────────────────────────────────────────────────────────

function ScopeNote() {
  const { t } = useTranslation("report");
  return (
    <p className="text-xs leading-relaxed text-content-tertiary italic">
      {t("comments.scope_note")}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Transparency strip — "Amostra analisada"
// ─────────────────────────────────────────────────────────────────────

function TransparencyStrip({ data }: { data: CommentIntelligence }) {
  const { t, i18n } = useTranslation("report");
  const lng = i18n.language?.startsWith("en") ? "en-US" : "pt-PT";
  const items: { label: string; value: string }[] = [
    { label: t("comments.sample.posts"), value: `${data.samplePosts} / 12` },
    { label: t("comments.sample.public_comments"), value: data.sampleComments.toLocaleString(lng) },
  ];
  if (data.sampleReplies > 0) {
    items.push({ label: t("comments.sample.thread_replies"), value: data.sampleReplies.toLocaleString(lng) });
  }
  items.push(
    { label: t("comments.sample.audience_comments"), value: data.audienceCommentsCount.toLocaleString(lng) },
    { label: t("comments.sample.brand_replies"), value: String(data.ownerRepliesCount) },
    { label: t("comments.sample.brand_reply_rate"), value: `${data.ownerReplyRatePct}%` },
  );

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-muted/40 p-3 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <BarChart3 className="h-3.5 w-3.5 shrink-0 text-content-tertiary" aria-hidden="true" />
        <p className="text-eyebrow-sm text-content-tertiary">{t("comments.sample_title")}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-[10.5px] font-medium uppercase tracking-wide text-content-tertiary leading-tight break-words">
              {item.label}
            </p>
            <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-content-secondary">
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <p className="text-[10.5px] leading-relaxed text-content-tertiary">
        {t("comments.methodology_note")}
      </p>
    </div>
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

function buildSignalChips(
  ci: CommentIntelligence,
  t: (key: string) => string,
): SignalChip[] {
  const chips: SignalChip[] = [];
  if (ci.questionsFromAudienceCount > 0) {
    chips.push({
      key: "questions",
      label: t("comments.signals.questions"),
      count: ci.questionsFromAudienceCount,
      Icon: HelpCircle,
      className: "border-accent-primary/20 bg-tint-primary text-accent-primary",
    });
  }
  if (ci.praiseCount > 0) {
    chips.push({
      key: "praise",
      label: t("comments.signals.praise"),
      count: ci.praiseCount,
      Icon: ThumbsUp,
      className: "border-signal-success/20 bg-tint-success text-signal-success",
    });
  }
  if (ci.complaintOrIssueCount > 0) {
    chips.push({
      key: "complaint",
      label: t("comments.signals.complaint"),
      count: ci.complaintOrIssueCount,
      Icon: AlertTriangle,
      className: "border-signal-warning/20 bg-tint-warning text-signal-warning",
    });
  }
  if (ci.buyingIntentCount > 0) {
    chips.push({
      key: "buying",
      label: t("comments.signals.buying"),
      count: ci.buyingIntentCount,
      Icon: ShoppingCart,
      /* No semantic violet token — using accent-primary as closest match */
      className: "border-accent-primary/20 bg-tint-primary text-accent-primary",
    });
  }
  if (ci.spamOrLowQualityCount > 0) {
    chips.push({
      key: "spam",
      label: t("comments.signals.spam"),
      count: ci.spamOrLowQualityCount,
      Icon: Ban,
      className: "border-border-default bg-surface-muted text-content-tertiary",
    });
  }
  return chips;
}

// ─────────────────────────────────────────────────────────────────────
// Unavailable state
// ─────────────────────────────────────────────────────────────────────

const UNAVAILABLE_REASON_KEYS = new Set([
  "processing", "budget_blocked", "comment_scraper_failed",
  "comment_scraper_disabled", "no_posts_with_comments",
  "no_valid_post_urls", "comment_scraper_timeout",
]);

const TECHNICAL_REASONS = new Set([
  "processing", "budget_blocked", "comment_scraper_failed",
  "comment_scraper_timeout", "no_valid_post_urls",
]);

export function CommentIntelligenceUnavailable({ data }: { data?: CommentIntelligence | null }) {
  const features = useVariantFeatures();
  const { t } = useTranslation("report");
  const isPublic = features.debugLabels === "hidden";
  const reason = data?.reason;

  // ── public_mvp: Pro teaser ──
  if (isPublic) {
    return (
      <div className="mt-5">
        <div className="rounded-lg border border-accent-gold/20 bg-accent-gold/5 px-4 py-3.5 space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent-gold" aria-hidden="true" />
            <p className="text-[12.5px] font-semibold text-content-secondary">
              {t("comments.unavailable.pro_title")}
            </p>
          </div>
          <p className="text-[12px] leading-relaxed text-content-tertiary">
            {t("comments.unavailable.pro_body")}
          </p>
        </div>
      </div>
    );
  }

  // ── internal_lab: full technical detail ──
  const effectiveReason = (reason && TECHNICAL_REASONS.has(reason))
    ? undefined
    : reason;
  const validReason = effectiveReason && UNAVAILABLE_REASON_KEYS.has(effectiveReason)
    ? effectiveReason
    : null;
  const title = validReason
    ? t(`comments.unavailable.reasons.${validReason}.title`)
    : t("comments.unavailable.default_title");
  const body = validReason
    ? t(`comments.unavailable.reasons.${validReason}.body`)
    : t("comments.unavailable.default_body");
  const isProcessing = reason === "processing";

  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircleReply
          className="h-4 w-4 shrink-0 text-content-tertiary"
          aria-hidden="true"
        />
        <h4 className="text-[13px] font-semibold text-content-secondary">
          {t("comments.subtitle")}
        </h4>
      </div>

      <div className="rounded-lg border border-border-default bg-surface-muted/60 px-4 py-3.5 space-y-1.5">
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 text-content-tertiary animate-spin" aria-hidden="true" />
          ) : (
            <Info className="h-3.5 w-3.5 shrink-0 text-content-tertiary" aria-hidden="true" />
          )}
          <p className="text-[12.5px] font-medium text-content-tertiary">
            {title}
          </p>
        </div>
        <p className="text-[12px] leading-relaxed text-content-tertiary">
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
  const { t } = useTranslation("report");
  const { config } = classifyBrandReply(data, t);
  const signalChips = buildSignalChips(data, t);

  return (
    <div className="mt-5 space-y-4">
      {/* Sub-card header */}
      <div className="flex items-center gap-2">
        <MessageCircleReply
          className="h-4 w-4 shrink-0 text-content-tertiary"
          aria-hidden="true"
        />
        <h4 className="text-[13px] font-semibold text-content-secondary">
          {t("comments.subtitle")}
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
        label={
          config.tone === "emerald"
            ? t("comments.callout.editorial")
            : config.tone === "rose"
              ? t("comments.callout.warning")
              : t("comments.callout.suggestion")
        }
      >
        {config.editorial}
      </InsightCallout>

      {/* 6-metric grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MetricCell
          label={t("comments.metrics.brand_replies")}
          value={String(data.ownerRepliesCount)}
        />
        <MetricCell
          label={t("comments.metrics.reply_rate")}
          value={`${data.ownerReplyRatePct}%`}
        />
        <MetricCell
          label={t("comments.metrics.posts_with_reply")}
          value={`${data.postsWithOwnerReplyPct}%`}
        />
        <MetricCell
          label={t("comments.metrics.audience_questions")}
          value={String(data.questionsFromAudienceCount)}
        />
        <MetricCell
          label={t("comments.metrics.buying_intent")}
          value={String(data.buyingIntentCount)}
        />
        <MetricCell
          label={t("comments.metrics.complaints")}
          value={String(data.complaintOrIssueCount)}
        />
      </div>

      {/* Conversation quality signals */}
      {signalChips.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-eyebrow-sm text-content-tertiary">{t("comments.signals.title")}</p>
          <div className="flex flex-wrap gap-1.5">
            {signalChips.map((chip) => (
              <div
                key={chip.key}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  chip.className,
                )}
              >
                <chip.Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="break-words">{chip.label}</span>
                <span className="tabular-nums font-semibold">{chip.count}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-content-tertiary">
            {t("comments.signals.hint")}
          </p>
        </div>
      )}

      {/* Recommended action */}
      {data.recommendedConversationAction && (
        <InsightCallout tone="suggestion" label={t("comments.callout.action_label")}>
          {data.recommendedConversationAction}
        </InsightCallout>
      )}

      {/* Top conversation post */}
      {data.topConversationPost && (
        <div className="rounded-lg border border-border-subtle bg-surface-secondary px-3.5 py-2.5 space-y-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck
              className="h-3 w-3 shrink-0 text-content-tertiary"
              aria-hidden="true"
            />
            <p className="text-eyebrow-sm text-content-tertiary">
              {t("comments.top.label")}
            </p>
          </div>
          <p className="text-[13px] text-content-secondary">
            <span className="font-semibold tabular-nums">
              {data.topConversationPost.ownerRepliesCount}
            </span>{" "}
            {data.topConversationPost.ownerRepliesCount === 1
              ? t("comments.top.reply_one")
              : t("comments.top.reply_other")}{" "}
            {t("comments.top.in")}{" "}
            <span className="tabular-nums">
              {data.topConversationPost.commentsCount}
            </span>{" "}
            {t("comments.top.comments")}
          </p>
        </div>
      )}

      {/* Transparency strip */}
      <TransparencyStrip data={data} />

      {/* Scope + limitations */}
      <div className="space-y-1 pt-1">
        <ScopeNote />
        {data.limitations
          .filter((l) => !l.includes("comentários públicos"))
          .map((l, i) => (
            <p
              key={i}
              className="text-xs leading-relaxed text-content-tertiary"
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
    <div className="rounded-lg border border-border-subtle bg-surface-secondary px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-content-tertiary break-words leading-tight">
        {label}
      </p>
      <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-content-primary">
        {value}
      </p>
    </div>
  );
}
