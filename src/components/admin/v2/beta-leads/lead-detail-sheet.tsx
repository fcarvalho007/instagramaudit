/**
 * LeadDetailSheet — premium cinematic "ficha de cliente" slide-in drawer.
 *
 * Opens from kanban cards. 7 sections:
 *   1. Header — avatar, name, email, handle, user_type, status, date
 *   2. KPI strip — views, cost, days since creation
 *   3. Perfil — ownership, purpose, source, consent (with icons)
 *   4. Relatório — request/pdf status, progress tracker, actions
 *   5. Inteligência comercial — intent, suggested step, status selector
 *   6. Timeline — product_events with icons & relative time
 *   7. Notas & Ações — notes editor with counter, action grid
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AdminBadge } from "../admin-badge";
import { AdminActionButton } from "../admin-action-button";
import { ConfirmDialog } from "../confirm-dialog";
import {
  ExternalLink,
  Copy,
  Phone,
  Archive,
  Instagram,
  Mail,
  Link2,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import {
  User,
  Target,
  Globe,
  Shield,
  Eye,
  FileText,
  Lightbulb,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import { Zap, Repeat, Wallet, FileBarChart, CalendarClock } from "lucide-react";
import { Plus, Download, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  KANBAN_COLUMNS,
  COMMERCIAL_STATUS_OPTIONS,
  type EnrichedLead,
} from "@/lib/admin/kanban-columns";
import { suggestNextLeadAction } from "@/lib/admin/lead-lifecycle";
import { USER_TYPE_LABELS, type UserType } from "@/lib/unlock-flow";
import { getEventLabel } from "@/lib/admin/event-labels";
import { interpretFeedback } from "@/lib/admin/feedback-intent";
import { AdminCallout } from "@/components/admin/v2/admin-callout";
import {
  PRICING_PREFERENCE_LABELS,
  PURCHASE_INTENT_LABELS,
} from "@/lib/feedback/feedback-schema";
import {
  renderReportReady,
  renderFeedbackRequest,
} from "@/lib/email/templates";
import { CommercialFollowupDialog } from "./commercial-followup-dialog";
import { adminFetch } from "@/lib/admin/fetch";
import {
  labelProfileOwnership,
  labelPurpose,
  labelSource,
  labelQualification,
  labelEmailDomainClass,
} from "@/lib/admin/lead-context-labels";
import {
  deriveWindow,
  windowBadgeVariant,
  windowLabel,
  dataSourceBadgeVariant,
  dataSourceLabel,
} from "@/lib/admin/analysis-window";
import type { AdminAccent } from "@/components/admin/v2/admin-tokens";

// ── Types ────────────────────────────────────────────────────────

interface LeadDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: EnrichedLead | null;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onRefresh?: () => void;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  handle: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────

const USER_TYPE_ACCENT: Record<string, "leads" | "revenue" | "expense" | "info" | "signal" | "neutral"> = {
  brand: "leads",
  agency: "revenue",
  consultant: "expense",
  creator: "info",
  student: "signal",
  ecommerce: "revenue",
  other: "neutral",
};

const STATUS_ACCENT: Record<string, "revenue" | "info" | "signal" | "expense" | "danger" | "neutral"> = {
  completed: "revenue",
  ready: "revenue",
  pending: "info",
  approved: "info",
  processing: "expense",
  failed: "danger",
  rejected: "danger",
  not_generated: "neutral",
  generated: "revenue",
  sent: "revenue",
  not_sent: "neutral",
};

function deriveIntentSignal(lead: EnrichedLead): { label: string; accent: "revenue" | "signal" | "neutral" } {
  if (lead.report_status === "completed" && lead.report_views > 0) {
    return { label: "Alto — relatório visto", accent: "revenue" };
  }
  if (lead.report_status === "completed") {
    return { label: "Médio — relatório não visto", accent: "signal" };
  }
  return { label: "Baixo — sem relatório", accent: "neutral" };
}

// Suggested step is now provided by suggestNextLeadAction (lead-lifecycle).

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Section divider ──────────────────────────────────────────────

function SectionDivider() {
  return (
    <div className="mx-6 h-px bg-admin-text-primary/10" />
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function displayName(lead: EnrichedLead): string {
  const n = lead.name?.trim();
  return n && n.length > 0 ? n : "Sem nome";
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  return `há ${Math.floor(days / 30)}meses`;
}

const EVENT_ICONS: Record<string, typeof Eye> = {
  report_viewed: Eye,
  beta_request_created: FileText,
  report_generated: CheckCircle2,
  report_link_sent: Mail,
  feedback_requested: MessageCircle,
  feedback_started: MessageCircle,
  feedback_submitted: MessageCircle,
  unlock_clicked: Zap,
  pricing_option_clicked: Target,
  module_visibility_published: Globe,
  request_status_changed: Clock,
  pricing_clicked: Target,
  public_report_link_copied: Link2,
  lead_status_changed: AlertCircle,
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="admin-section-title mb-3">{children}</h3>
  );
}

function DetailRow({ label, icon: Icon, children }: { label: string; icon?: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="admin-meta shrink-0 flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-admin-text-tertiary opacity-60" />}
        {label}
      </span>
      <span className="admin-body text-right">{children}</span>
    </div>
  );
}

/** Cartão de KPI do cabeçalho — label + valor grande, ícone discreto. */
function KpiTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  tone?: "default" | "danger";
}) {
  return (
    <div className="rounded-lg border border-admin-text-primary/10 bg-admin-surface-muted/50 px-3 py-3">
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon
            size={12}
            className={
              tone === "danger"
                ? "text-admin-expense-500"
                : "text-admin-text-tertiary"
            }
          />
        )}
        <span
          className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${
            tone === "danger" ? "text-admin-expense-500" : "text-admin-text-tertiary"
          }`}
        >
          {label}
        </span>
      </div>
      <p className="m-0 mt-1.5 text-[16px] leading-none font-semibold text-admin-text-primary tabular-nums">
        {value}
      </p>
    </div>
  );
}

/** Linha da grelha "Contexto do lead" — ícone + label eyebrow + valor humano. */
function ContextField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <Icon size={14} className="text-admin-text-tertiary shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="admin-eyebrow-sm m-0 mb-0.5">{label}</p>
        <p className="admin-body text-admin-text-primary m-0 truncate" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────

// ── Commercial status select (3 grupos) ──────────────────────────

/** Data curta DD/MM (Inter tabular-nums, sem o ano). */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** Data + hora compacta DD/MM · HH:MM (Inter tabular-nums). */
function formatShortDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

/**
 * Devolve o timestamp em que cada estado automático aconteceu, ou `null`
 * quando ainda não há sinal. Usado para mostrar ✓ + data nas linhas do
 * grupo "Automático" do dropdown de estado comercial.
 */
function getAutoStateTimestamp(
  lead: EnrichedLead,
  key: string,
  timeline: TimelineEvent[],
  lastReportLinkSentAt: string | null,
): string | null {
  switch (key) {
    case "lead_magnet": {
      if (lead.lead_magnet?.last_event_at) return lead.lead_magnet.last_event_at;
      if (lead.is_lead_magnet_subscriber) return lead.beta_consent_at ?? lead.created_at;
      return null;
    }
    case "relatorio_gerado": {
      const ev = timeline.find((e) => e.event_type === "report_generated");
      if (ev) return ev.created_at;
      const generated =
        lead.report_status === "completed" ||
        lead.report_status === "ready" ||
        lead.report_status === "generated";
      return generated ? lead.last_interaction : null;
    }
    case "link_enviado":
      return lastReportLinkSentAt;
    case "relatorio_visto": {
      const ev = timeline.find((e) => e.event_type === "report_viewed");
      if (ev) return ev.created_at;
      return lead.report_views > 0 ? lead.last_interaction : null;
    }
    case "checkout_iniciado": {
      const pay = lead.payment_summary;
      return pay?.pending_checkout_started_at ?? pay?.last_payment_at ?? null;
    }
    default:
      return null;
  }
}

/** Marcador circular para um item do select (filled = activo, ring = inactivo). */
function StatusBullet({
  active,
  done,
  color,
}: {
  active: boolean;
  done: boolean;
  color?: string;
}) {
  if (active) {
    return (
      <span
        className="inline-block h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: color ?? "rgb(var(--admin-info-500))" }}
      />
    );
  }
  if (done) {
    return (
      <CheckCircle2
        size={13}
        className="shrink-0 text-admin-text-tertiary"
        strokeWidth={2}
      />
    );
  }
  return (
    <span className="inline-block h-2 w-2 rounded-full shrink-0 border border-admin-text-primary/25" />
  );
}

/** Header eyebrow de um grupo do dropdown, com ícone à esquerda. */
function GroupLabel({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <SelectLabel className="flex items-center gap-1.5 text-eyebrow-sm text-admin-text-tertiary px-2 pt-2 pb-1">
      <Icon size={11} className="opacity-70" />
      <span>{children}</span>
    </SelectLabel>
  );
}

/**
 * Dropdown de Estado comercial com 3 grupos:
 *   1. Automático — sinais que o sistema atualiza (não clicáveis).
 *   2. Pagamento  — marcos com valor em € (clicáveis).
 *   3. A tua decisão — estados que o operador define (clicáveis).
 */
function CommercialStatusSelect({
  lead,
  value,
  onChange,
  timeline,
  lastReportLinkSentAt,
}: {
  lead: EnrichedLead;
  value: string;
  onChange: (v: string) => void;
  timeline: TimelineEvent[];
  lastReportLinkSentAt: string | null;
}) {
  const visible = COMMERCIAL_STATUS_OPTIONS.filter((o) => !o.hidden);
  const autoOpts = visible.filter((o) => o.kind === "auto");
  const paymentOpts = visible.filter((o) => o.kind === "payment");
  const manualOpts = visible.filter((o) => o.kind === "manual");

  const paidProducts = lead.payment_summary?.paid_products ?? [];
  const isPaid = (key: string): boolean => {
    if (key === "pago_report") return paidProducts.includes("report_single");
    if (key === "pago_pack5") return paidProducts.includes("pack_5");
    return false;
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 text-[13px] rounded-lg" data-testid="commercial-status-trigger">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-[480px]">
        {/* ── Grupo: Automático ───────────────────────────── */}
        <SelectGroup>
          <GroupLabel icon={Zap}>Automático · o sistema atualiza</GroupLabel>
          {autoOpts.map((opt) => {
            const isCurrent = opt.key === value;
            const ts = getAutoStateTimestamp(lead, opt.key, timeline, lastReportLinkSentAt);
            const done = !!ts;
            return (
              <SelectItem
                key={opt.key}
                value={opt.key}
                disabled={!isCurrent}
                hideIndicator
                className={`text-[13px] ${
                  isCurrent
                    ? "bg-admin-info-50 text-admin-info-700"
                    : done
                      ? "text-admin-text-secondary"
                      : "text-admin-text-tertiary"
                }`}
                title={
                  isCurrent
                    ? undefined
                    : "Estado atualizado automaticamente pelo sistema"
                }
              >
                <span className="flex items-center justify-between gap-3 w-full">
                  <span className="flex items-center gap-2 min-w-0">
                    <StatusBullet active={isCurrent} done={done} />
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {ts && (
                    <span className="text-[11px] tabular-nums text-admin-text-tertiary shrink-0">
                      {shortDate(ts)}
                    </span>
                  )}
                </span>
              </SelectItem>
            );
          })}
        </SelectGroup>

        <SelectSeparator />

        {/* ── Grupo: Pagamento ───────────────────────────── */}
        <SelectGroup>
          <GroupLabel icon={Wallet}>Pagamento</GroupLabel>
          {paymentOpts.map((opt) => {
            const isCurrent = opt.key === value;
            const paid = isPaid(opt.key) || isCurrent;
            return (
              <SelectItem
                key={opt.key}
                value={opt.key}
                hideIndicator
                className={`text-[13px] ${
                  isCurrent
                    ? "bg-admin-info-50 text-admin-info-700"
                    : "text-admin-text-primary"
                }`}
              >
                <span className="flex items-center justify-between gap-3 w-full">
                  <span className="flex items-center gap-2 min-w-0">
                    <StatusBullet
                      active={isCurrent}
                      done={paid}
                      color={opt.color}
                    />
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {opt.amount_eur !== undefined && (
                    <span className="text-[12px] font-semibold tabular-nums text-admin-text-secondary shrink-0">
                      {opt.amount_eur}€
                    </span>
                  )}
                </span>
              </SelectItem>
            );
          })}
        </SelectGroup>

        <SelectSeparator />

        {/* ── Grupo: A tua decisão ───────────────────────── */}
        <SelectGroup>
          <GroupLabel icon={Sparkles}>A tua decisão</GroupLabel>
          {manualOpts.map((opt) => {
            const isCurrent = opt.key === value;
            const isArchive = opt.key === "arquivado";
            return (
              <SelectItem
                key={opt.key}
                value={opt.key}
                hideIndicator
                className={`text-[13px] ${
                  isCurrent
                    ? "bg-admin-info-50 text-admin-info-700 font-medium"
                    : isArchive
                      ? "text-admin-text-tertiary"
                      : "text-admin-text-primary"
                }`}
              >
                <span className="flex items-center justify-between gap-3 w-full">
                  <span className="flex items-center gap-2 min-w-0">
                    {isArchive ? (
                      <Archive size={13} className="shrink-0 text-admin-text-tertiary" />
                    ) : (
                      <StatusBullet active={isCurrent} done={false} color={opt.color} />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {isCurrent && (
                    <CheckCircle2 size={13} className="shrink-0 text-admin-info-500" />
                  )}
                </span>
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

/** Statuses that allow triggering a fresh report generation. */
const GENERATABLE_STATUSES = ["approved", "pending_review", "failed"] as const;

type TabKey = "resumo" | "relatorio" | "feedback" | "comunicacao" | "historico" | "credits";

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "resumo", label: "Resumo" },
  { key: "relatorio", label: "Relatórios" },
  { key: "feedback", label: "Feedback" },
  { key: "credits", label: "Créditos" },
  { key: "historico", label: "Histórico" },
];

/**
 * Collapses runs of consecutive `report_viewed` events (same handle) into a
 * single synthetic event with `metadata.grouped_count` for compact display.
 */
function groupConsecutiveViews(events: TimelineEvent[]): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  let i = 0;
  while (i < events.length) {
    const ev = events[i];
    if (ev.event_type !== "report_viewed") {
      out.push(ev);
      i++;
      continue;
    }
    let j = i + 1;
    while (
      j < events.length &&
      events[j].event_type === "report_viewed" &&
      events[j].handle === ev.handle
    ) {
      j++;
    }
    const count = j - i;
    if (count === 1) {
      out.push(ev);
    } else {
      out.push({
        ...ev,
        metadata: { ...(ev.metadata ?? {}), grouped_count: count },
      });
    }
    i = j;
  }
  return out;
}

export function LeadDetailSheet({ open, onOpenChange, lead, onUpdate, onRefresh }: LeadDetailSheetProps) {
  const [notesText, setNotesText] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sendLinkOpen, setSendLinkOpen] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [sendingFollowup, setSendingFollowup] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("resumo");

  // Reset state when lead changes
  useEffect(() => {
    if (lead) {
      setNotesText(lead.internal_notes ?? "");
      setNotesDirty(false);
      setActiveTab("resumo");
    }
  }, [lead?.id]);

  // Fetch timeline on open
  useEffect(() => {
    if (!open || !lead) {
      setTimeline([]);
      return;
    }

    setTimelineLoading(true);
    adminFetch(`/api/admin/lead-timeline/${lead.id}`)
      .then((r) => r.json())
      .then((json) => setTimeline(json.events ?? []))
      .catch(() => setTimeline([]))
      .finally(() => setTimelineLoading(false));
  }, [open, lead?.id]);

  // ── CTA do próximo passo (memo) ─────────────────────────────
  // IMPORTANTE: este `useMemo` tem de ser chamado em TODOS os renders,
  // mesmo quando `lead` é null, para preservar a ordem dos hooks
  // (caso contrário: "Rendered fewer hooks than expected").
  const nextStepCta = useMemo<
    { label: string; onClick: () => void } | null
  >(() => {
    if (!lead) return null;
    const status = lead.commercial_status ?? "";
    if (
      lead.report_request_id &&
      GENERATABLE_STATUSES.includes(
        lead.report_status as typeof GENERATABLE_STATUSES[number],
      )
    ) {
      return { label: "Gerar →", onClick: () => setGenerateOpen(true) };
    }
    if (status === "relatorio_gerado" || status === "novo_pedido") {
      return { label: "Gerar →", onClick: () => setGenerateOpen(true) };
    }
    if (
      ["link_enviado", "relatorio_visto"].includes(status) &&
      !lead.feedback
    ) {
      return { label: "Pedir feedback →", onClick: () => setFeedbackOpen(true) };
    }
    // Follow-up depends on feedback intent — recalculated below when lead exists.
    if (
      lead.email &&
      lead.feedback &&
      lead.commercial_status !== "convertido" &&
      lead.commercial_status !== "arquivado"
    ) {
      const fi = interpretFeedback(lead.feedback);
      if (fi.intent === "alto" || fi.intent === "medio") {
        return { label: "Follow-up →", onClick: () => setFollowupOpen(true) };
      }
    }
    return null;
  }, [
    lead,
  ]);

  if (!lead) return null;

  const intent = deriveIntentSignal(lead);
  const lastReportLinkSentAt =
    timeline.find((ev) => ev.event_type === "report_link_sent")?.created_at ??
    null;
  const suggestedStep = suggestNextLeadAction(lead).label;
  const feedbackIntent = interpretFeedback(lead.feedback);
  // `intent` heuristic is kept for the suggestion text fallback; the dedicated
  // "Intenção" field was removed from the context grid because it is derived,
  // not provided by the lead in the onboarding modal.
  void intent;
  const displayedSuggestion = lead.feedback ? feedbackIntent.nextAction : suggestedStep;
  const columnDef = KANBAN_COLUMNS.find((c) => c.key === lead.commercial_status);
  // (Follow-up eligibility now lives inside the `nextStepCta` memo above so
  // hooks order stays stable when `lead` is null.)
  void feedbackIntent;

  const handleSaveNotes = () => {
    onUpdate(lead.id, { internal_notes: notesText });
    setNotesDirty(false);
    toast.success("Notas guardadas");
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(lead.email);
    toast.success("Email copiado");
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/analyze/${lead.handle}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  const handleMarkContacted = () => {
    onUpdate(lead.id, { mark_contacted: true });
    toast.success("Marcado como contactado");
  };

  const handleArchive = () => {
    onUpdate(lead.id, { commercial_status: "arquivado" });
    onOpenChange(false);
  };

  const handleStatusChange = (status: string) => {
    onUpdate(lead.id, { commercial_status: status });
  };

  // Métricas do cabeçalho — derivadas de campos reais. Mostrar "—" em vez de
  // zero quando o campo não existe (não inflacionar).
  const kpiReports = lead.report_request_id ? "1" : "0";
  const kpiCredits =
    lead.credits_granted > 0
      ? `${lead.credits_remaining} / ${lead.credits_granted}`
      : "—";
  const creditsExhausted =
    lead.credits_granted > 0 && lead.credits_remaining <= 0;
  const totalPaidEur = (lead.payment_summary?.total_paid_cents ?? 0) / 100;
  const kpiSpent = totalPaidEur > 0 ? `€${totalPaidEur.toFixed(0)}` : "€0";
  const kpiAge = `${daysSince(lead.created_at)}d`;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 max-w-[640px] w-[calc(100vw-2rem)] max-h-[88vh] overflow-hidden rounded-2xl flex flex-col gap-0 bg-white"
      >
        <DialogDescription className="sr-only">
          Detalhes do lead {displayName(lead)}
        </DialogDescription>
        <DialogTitle className="sr-only">Ficha de cliente · {displayName(lead)}</DialogTitle>

        {/* ── Cabeçalho (identidade + estado) ─────────────── */}
        <div className="px-6 pt-6 pb-5 border-b border-admin-text-primary/10 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="shrink-0 flex items-center justify-center rounded-full text-white font-semibold"
                style={{
                  width: 44,
                  height: 44,
                  fontSize: 15,
                  backgroundColor: columnDef?.color ?? "rgb(var(--admin-leads-500))",
                }}
              >
                {getInitials(displayName(lead) !== "Sem nome" ? displayName(lead) : lead.email)}
              </div>
              <div className="min-w-0">
                <h2
                  className="m-0 truncate text-admin-text-primary"
                  style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.01em" }}
                >
                  {displayName(lead)}
                </h2>
                <a
                  href={`mailto:${lead.email}`}
                  className="admin-body text-admin-text-secondary mt-0.5 truncate block hover:text-admin-text-primary transition-colors"
                  title={lead.email}
                >
                  {lead.email}
                </a>
              </div>
            </div>
            {columnDef && (
              <span
                className="shrink-0 rounded-md px-2.5 py-1 text-[12px] font-medium leading-none"
                style={{
                  backgroundColor: `${columnDef.color}1A`,
                  color: columnDef.color,
                  border: `1px solid ${columnDef.color}33`,
                }}
              >
                {columnDef.label}
              </span>
            )}
          </div>

          {/* KPI strip — 4 métricas accionáveis */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            <KpiTile label="Relatórios" value={kpiReports} icon={FileBarChart} />
            <KpiTile
              label="Créditos"
              value={kpiCredits}
              icon={Repeat}
              tone={creditsExhausted ? "danger" : "default"}
            />
            <KpiTile label="Gasto" value={kpiSpent} icon={Wallet} />
            <KpiTile label="Inscrito há" value={kpiAge} icon={CalendarClock} />
          </div>
        </div>

        {/* ── Tabs — estilo underline (mockup) ─────────────── */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabKey)}
          className="flex-1 min-h-0 flex flex-col"
        >
          <div className="px-6 border-b border-admin-text-primary/10 shrink-0">
            <TabsList className="h-auto bg-transparent p-0 gap-7 rounded-none justify-start">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className="relative h-10 px-0 rounded-none bg-transparent text-[13px] font-medium text-admin-text-secondary hover:text-admin-text-primary transition-colors data-[state=active]:text-admin-text-primary data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-[2px] data-[state=active]:after:bg-admin-info-500"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── Tab: Resumo ─────────────────────────────── */}
          <TabsContent value="resumo" className="flex-1 overflow-y-auto mt-0">
            <div className="px-6 py-6 space-y-7">
              {/* (a) Próximo passo — callout com CTA */}
              <div className="rounded-xl p-4 flex items-center justify-between gap-3 bg-admin-info-50 border border-admin-info-500/20">
                <div className="flex items-start gap-3 min-w-0">
                  <Lightbulb size={16} className="text-admin-info-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="admin-eyebrow mb-1 text-admin-info-700">Próximo passo</p>
                    <p className="admin-body text-admin-text-primary font-medium m-0 leading-snug">
                      {displayedSuggestion}
                    </p>
                  </div>
                </div>
                {nextStepCta && (
                  <Button
                    size="sm"
                    onClick={nextStepCta.onClick}
                    className="shrink-0 bg-admin-info-500 hover:bg-admin-info-700 text-white"
                  >
                    {nextStepCta.label}
                  </Button>
                )}
              </div>

              {/* (b) Contexto do lead — grelha 2×2 traduzida */}
              <div>
                <p className="admin-eyebrow mb-4">Contexto do lead</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <ContextField
                    icon={User}
                    label="Relação"
                    value={labelProfileOwnership(lead.profile_ownership)}
                  />
                  <ContextField
                    icon={Target}
                    label="Objetivo"
                    value={labelPurpose(lead.purpose)}
                  />
                  <ContextField
                    icon={Globe}
                    label="Origem"
                    value={labelSource(lead.source)}
                  />
                </div>
                <p className="admin-meta text-admin-text-tertiary mt-2">
                  Só o que o lead respondeu no onboarding. Sinais derivados
                  (intenção, próximo passo) aparecem acima.
                </p>
              </div>

              {/* (c) Estado comercial — select agrupado manual/auto */}
              <div>
                <p className="admin-eyebrow mb-2.5">Estado comercial</p>
                <CommercialStatusSelect
                  lead={lead}
                  value={lead.commercial_status}
                  onChange={handleStatusChange}
                  timeline={timeline}
                  lastReportLinkSentAt={lastReportLinkSentAt}
                />
              </div>

              {/* (d) Notas internas */}
              <div>
                <p className="admin-eyebrow mb-2.5">Notas internas</p>
                <Textarea
                  value={notesText}
                  onChange={(e) => {
                    setNotesText(e.target.value);
                    setNotesDirty(true);
                  }}
                  rows={3}
                  placeholder="Adicionar nota sobre este lead…"
                  className="text-[13px] leading-relaxed"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="admin-meta text-admin-text-tertiary tabular-nums">
                    {notesText.length} caracteres
                  </span>
                  {notesDirty && (
                    <Button size="sm" onClick={handleSaveNotes}>
                      Guardar notas
                    </Button>
                  )}
                </div>
              </div>

              {/* (e) Acções rápidas */}
              <div className="space-y-2 pb-2">
                <div className="grid grid-cols-3 gap-2">
                  <AdminActionButton size="md" onClick={handleCopyEmail}>
                    <Mail size={14} /> Email
                  </AdminActionButton>
                  <AdminActionButton
                    size="md"
                    onClick={() => {
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(`Olá ${lead.name ?? ""}!`)}`,
                        "_blank",
                      );
                    }}
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </AdminActionButton>
                  <AdminActionButton size="md" onClick={handleMarkContacted}>
                    <CheckCircle2 size={14} /> Contactado
                  </AdminActionButton>
                </div>
                <AdminActionButton
                  size="md"
                  onClick={handleArchive}
                  className="w-full text-admin-text-secondary"
                >
                  <Archive size={14} /> Arquivar
                </AdminActionButton>
                {lead.handle && (
                  <AdminActionButton
                    size="md"
                    onClick={() => window.open(`https://instagram.com/${lead.handle}`, "_blank")}
                    className="w-full"
                  >
                    <Instagram size={14} /> Abrir Instagram
                    {lead.handle ? ` @${lead.handle}` : ""}
                  </AdminActionButton>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Tab: Relatório ──────────────────────────── */}
          <TabsContent value="relatorio" className="flex-1 overflow-y-auto mt-0">
            <LeadReportsList
              leadId={lead.id}
              lead={lead}
              canGenerate={
                !!lead.report_request_id &&
                GENERATABLE_STATUSES.includes(
                  lead.report_status as typeof GENERATABLE_STATUSES[number],
                )
              }
              generateDisabledReason={
                !lead.report_request_id
                  ? "Sem pedido de relatório associado"
                  : !GENERATABLE_STATUSES.includes(
                      lead.report_status as typeof GENERATABLE_STATUSES[number],
                    )
                    ? "Já existe um relatório gerado para este pedido"
                    : null
              }
              onGenerateClick={() => setGenerateOpen(true)}
              onResendLink={() => setSendLinkOpen(true)}
            />
          </TabsContent>

          {/* ── Tab: Feedback ───────────────────────────── */}
          <TabsContent value="feedback" className="flex-1 overflow-y-auto mt-0">
            <FeedbackBetaSection
              lead={lead}
              onPedirFeedback={() => setFeedbackOpen(true)}
              pedirDisabledReason={
                !lead.report_request_id
                  ? "Sem pedido de relatório associado"
                  : !lead.email
                    ? "Lead sem email"
                    : !lead.handle
                      ? "Handle Instagram em falta"
                      : null
              }
            />
          </TabsContent>

          {/* ── Tab: Histórico (inclui comunicação) ─────── */}
          <TabsContent value="historico" className="flex-1 overflow-y-auto mt-0">
            <LeadHistoryTimeline
              lead={lead}
              timeline={timeline}
              loading={timelineLoading}
              suggestedStep={displayedSuggestion}
            />
          </TabsContent>

          {/* ── Tab: Créditos & análises ─────────────── */}
          <TabsContent value="credits" className="flex-1 overflow-y-auto mt-0">
            <LeadCreditsTab leadId={lead.id} active={activeTab === "credits"} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* ── Generate report confirmation dialog ────────────── */}
    <GenerateReportDialog
      open={generateOpen}
      onOpenChange={setGenerateOpen}
      loading={generating}
      handle={lead.handle}
      onConfirm={async () => {
        if (!lead.report_request_id) return;
        setGenerating(true);
        try {
          const res = await fetch("/api/admin/generate-beta-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ report_request_id: lead.report_request_id }),
          });
          const body = await res.json();
          if (!res.ok || !body.success) {
            const errorMsg = body.error ?? "Erro desconhecido";
            toast.error(`Geração falhou: ${errorMsg}`);
          } else {
            toast.success("Relatório gerado com sucesso!");
            onRefresh?.();
          }
        } catch (err) {
          toast.error("Erro de rede ao gerar relatório.");
        } finally {
          setGenerating(false);
          setGenerateOpen(false);
        }
      }}
    />

    {/* ── Send public link confirmation dialog ───────────── */}
    <SendLinkDialog
      open={sendLinkOpen}
      onOpenChange={setSendLinkOpen}
      loading={sendingLink}
      lead={lead}
      lastSentAt={lastReportLinkSentAt}
      onConfirm={async () => {
        if (!lead.report_request_id) return;
        setSendingLink(true);
        try {
          const res = await fetch("/api/admin/send-report-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lead_id: lead.id,
              report_request_id: lead.report_request_id,
            }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok || !body.success) {
            toast.error(mapSendLinkError(body?.error_code, body?.details));
          } else {
            toast.success(
              lastReportLinkSentAt ? "Link reenviado por email" : "Link enviado por email",
            );
            setSendLinkOpen(false);
            onRefresh?.();
          }
        } catch {
          toast.error("Erro de rede ao enviar email.");
        } finally {
          setSendingLink(false);
        }
      }}
    />

    {/* ── Send feedback request dialog ────────────────────── */}
    <FeedbackRequestDialog
      open={feedbackOpen}
      onOpenChange={setFeedbackOpen}
      loading={sendingFeedback}
      lead={lead}
      onConfirm={async () => {
        if (!lead.report_request_id) return;
        setSendingFeedback(true);
        try {
          const res = await fetch("/api/admin/send-feedback-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lead_id: lead.id,
              report_request_id: lead.report_request_id,
            }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok || !body.success) {
            toast.error(mapFeedbackError(body?.error_code));
          } else if (body.skipped_duplicate) {
            toast.info(
              body.message ??
                "Já foi enviado um pedido de feedback para este relatório.",
            );
            setFeedbackOpen(false);
            onRefresh?.();
          } else {
            toast.success("Pedido de feedback enviado");
            setFeedbackOpen(false);
            onRefresh?.();
          }
        } catch {
          toast.error("Erro de rede ao enviar email.");
        } finally {
          setSendingFeedback(false);
        }
      }}
    />

    {/* ── Send commercial follow-up dialog ─────────────────── */}
    <CommercialFollowupDialog
      open={followupOpen}
      onOpenChange={setFollowupOpen}
      lead={lead}
      loading={sendingFollowup}
      onConfirm={async ({ checkoutUrl }) => {
        setSendingFollowup(true);
        try {
          const res = await fetch("/api/admin/send-commercial-followup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lead_id: lead.id,
              ...(checkoutUrl ? { checkout_url: checkoutUrl } : {}),
            }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok || !body.success) {
            const code = body?.error_code as string | undefined;
            const map: Record<string, string> = {
              EMAIL_PROVIDER_NOT_CONFIGURED: "Provider de email não configurado.",
              LEAD_EMAIL_MISSING: "Lead sem email.",
              LEAD_EMAIL_INVALID: "Email do lead inválido.",
              RESEND_SANDBOX_RECIPIENT_BLOCKED:
                "Sandbox: domínio não verificado. Configurar RESEND_FROM.",
              RESEND_TIMEOUT: "Timeout do provider.",
              RESEND_FAILED: "Falha no envio.",
            };
            toast.error(map[code ?? ""] ?? "Falha ao enviar follow-up.");
          } else {
            toast.success("Follow-up comercial enviado");
            setFollowupOpen(false);
            onRefresh?.();
          }
        } catch {
          toast.error("Erro de rede ao enviar email.");
        } finally {
          setSendingFollowup(false);
        }
      }}
    />
    </>
  );
}

// ── Progress Tracker ────────────────────────────────────────────

function GenerateReportDialog({
  open,
  onOpenChange,
  loading,
  handle,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loading: boolean;
  handle: string | null;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Gerar relatório Fresh"
      description={
        <div className="space-y-3">
          <p>
            Isto vai executar uma análise completa via Apify para{" "}
            <strong>@{handle}</strong> e gerar um snapshot novo.
          </p>
          <AdminCallout title="Aviso de custo">
            Esta ação consome créditos Apify (~€0.05–0.10 por perfil).
            Verificar que o modo de execução está em <strong>Fresh</strong> e
            que o provider está ativo.
          </AdminCallout>
        </div>
      }
      confirmLabel={loading ? "A gerar…" : "Confirmar geração"}
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}

function ProgressTracker({
  reportStatus,
  pdfStatus,
}: {
  reportStatus: string | null;
  pdfStatus: string | null;
}) {
  const steps = [
    { label: "Pedido", done: true },
    {
      label: "Geração",
      done: ["completed", "ready", "generated"].includes(reportStatus ?? ""),
    },
    {
      label: "Entrega",
      done: pdfStatus === "generated" || pdfStatus === "sent",
    },
  ];

  return (
    <div className="flex items-center gap-1.5 mb-4">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1.5 flex-1">
          <div
            className={`flex items-center justify-center rounded-full shrink-0 text-[11px] font-semibold ${
              step.done
                ? "bg-admin-revenue-500/15 text-admin-revenue-500"
                : "bg-admin-text-primary/5 text-admin-text-tertiary"
            }`}
            style={{ width: 22, height: 22 }}
          >
            {step.done ? "✓" : i + 1}
          </div>
          <span
            className={`admin-meta ${step.done ? "text-admin-revenue-500 font-medium" : ""}`}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 mx-1 h-px ${
                step.done ? "bg-admin-revenue-500/30" : "bg-admin-text-primary/10"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Timeline Section ────────────────────────────────────────────

function TimelineSection({
  timeline,
  loading,
  title = "Timeline",
  emptyText = "Sem eventos registados.",
}: {
  timeline: TimelineEvent[];
  loading: boolean;
  title?: string;
  emptyText?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const INITIAL_COUNT = 10;
  const visible = expanded ? timeline : timeline.slice(0, INITIAL_COUNT);

  return (
    <div className="px-4 sm:px-6 py-5">
      <SectionTitle>{title}</SectionTitle>

      {loading && (
        <div className="flex items-center gap-2 text-admin-text-tertiary admin-meta py-3">
          <Loader2 size={14} className="animate-spin" /> A carregar...
        </div>
      )}

      {!loading && timeline.length === 0 && (
        <p className="admin-meta text-admin-text-tertiary py-3">
          {emptyText}
        </p>
      )}

      {!loading && timeline.length > 0 && (
        <div className="space-y-0">
          {visible.map((ev) => {
            const IconComp = EVENT_ICONS[ev.event_type] ?? Clock;
            const groupedCount =
              typeof ev.metadata?.grouped_count === "number"
                ? (ev.metadata.grouped_count as number)
                : null;
            return (
              <div
                key={ev.id}
                className="flex items-start gap-3 py-3 border-b border-admin-text-primary/5 last:border-b-0"
              >
                <div
                  className="mt-0.5 flex items-center justify-center shrink-0 rounded-md bg-admin-text-primary/5"
                  style={{ width: 24, height: 24 }}
                >
                  <IconComp size={13} className="text-admin-text-tertiary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="admin-body text-admin-text-primary m-0 flex items-center gap-2">
                    <span>{getEventLabel(ev.event_type)}</span>
                    {groupedCount && groupedCount > 1 ? (
                      <span className="admin-meta text-admin-text-tertiary rounded-full px-2 py-0.5 bg-admin-text-primary/5 tabular-nums">
                        ×{groupedCount}
                      </span>
                    ) : null}
                  </p>
                  {ev.event_type === "pricing_option_clicked" &&
                    ev.metadata?.pricing_option ? (
                    <p className="admin-meta text-admin-text-secondary m-0 mt-0.5">
                      Opção: {String(ev.metadata.pricing_option)}
                      {ev.metadata.source_component
                        ? ` · ${String(ev.metadata.source_component)}`
                        : ""}
                    </p>
                  ) : null}
                  {ev.event_type === "unlock_clicked" &&
                    ev.metadata?.source_component ? (
                    <p className="admin-meta text-admin-text-secondary m-0 mt-0.5">
                      Origem: {String(ev.metadata.source_component)}
                    </p>
                  ) : null}
                  <p className="admin-meta text-admin-text-tertiary m-0 mt-1 tabular-nums">
                    {relativeTime(ev.created_at)} · {formatDate(ev.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          {timeline.length > INITIAL_COUNT && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="admin-meta text-admin-text-secondary hover:text-admin-text-primary flex items-center gap-1 pt-2 transition-colors"
            >
              <ChevronDown size={13} /> Ver mais {timeline.length - INITIAL_COUNT} eventos
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Send link button + dialog ───────────────────────────────────

function SendLinkButton({
  lead,
  lastSentAt,
  onClick,
}: {
  lead: EnrichedLead;
  lastSentAt: string | null;
  onClick: () => void;
}) {
  const reportReady =
    lead.report_status != null &&
    ["completed", "ready", "generated"].includes(lead.report_status);
  const hasEmail = Boolean(lead.email);
  const hasHandle = Boolean(lead.handle);
  const hasRequest = Boolean(lead.report_request_id);

  let disabledReason: string | null = null;
  if (!hasRequest) disabledReason = "Sem pedido de relatório associado.";
  else if (!reportReady)
    disabledReason = "Este lead ainda não tem relatório público disponível.";
  else if (!hasEmail) disabledReason = "Lead sem email — não é possível enviar.";
  else if (!hasHandle) disabledReason = "Handle Instagram em falta.";

  const disabled = disabledReason != null;
  const isResend = lastSentAt != null;

  return (
    <AdminActionButton
      size="md"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={
        disabledReason ??
        (isResend ? "Reenviar link público por email" : "Enviar link público por email")
      }
      className={
        disabled
          ? undefined
          : "!border-admin-revenue-500/40 !text-admin-revenue-700 hover:!bg-admin-revenue-50"
      }
    >
      <Send size={14} /> {isResend ? "Reenviar link" : "Enviar link"}
    </AdminActionButton>
  );
}

function SendLinkDialog({
  open,
  onOpenChange,
  loading,
  lead,
  lastSentAt,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loading: boolean;
  lead: EnrichedLead;
  lastSentAt: string | null;
  onConfirm: () => void;
}) {
  const publicUrl =
    typeof window !== "undefined" && lead.handle
      ? `${window.location.origin}/analyze/${lead.handle}`
      : lead.handle
        ? `/analyze/${lead.handle}`
        : "";
  const firstName = lead.name?.trim().split(/\s+/)[0] ?? null;
  const { subject, text: previewBody } = renderReportReady({
    firstName,
    instagramHandle: lead.handle ?? "",
    reportUrl: publicUrl || "https://auditprofiles.example/relatorio",
  });
  const isResend = lastSentAt != null;
  const lastSentLabel = lastSentAt
    ? new Date(lastSentAt).toLocaleString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isResend ? "Reenviar link ao beta tester" : "Enviar link ao beta tester"}
      description={
        <div className="space-y-3 text-[13px]">
          {isResend && lastSentLabel && (
            <AdminCallout title="Link já enviado">
              Já foi enviado um link a este lead em <strong>{lastSentLabel}</strong>.
              Confirma o reenvio.
            </AdminCallout>
          )}
          <div className="grid grid-cols-[80px_1fr] gap-y-1.5">
            <span className="admin-meta text-admin-text-tertiary">Para</span>
            <span className="text-admin-text-primary break-all">{lead.email}</span>
            <span className="admin-meta text-admin-text-tertiary">Perfil</span>
            <span className="text-admin-text-primary">@{lead.handle}</span>
            <span className="admin-meta text-admin-text-tertiary">Assunto</span>
            <span className="text-admin-text-primary">{subject}</span>
          </div>
          <div>
            <p className="admin-eyebrow-sm mb-1">Link público</p>
            <p className="admin-code text-admin-text-primary break-all rounded-md bg-admin-text-primary/[0.04] border border-admin-text-primary/10 px-2.5 py-1.5 text-[12px]">
              {publicUrl || "—"}
            </p>
          </div>
          <div>
            <p className="admin-eyebrow-sm mb-1">Pré-visualização</p>
            <pre className="text-admin-text-secondary whitespace-pre-wrap rounded-md bg-admin-text-primary/[0.03] border border-admin-text-primary/10 px-3 py-2 text-[12px] leading-relaxed font-sans m-0">
              {previewBody}
            </pre>
          </div>
          <p className="admin-meta text-admin-text-tertiary">
            Em sucesso: regista o evento <code>report_link_sent</code> e move o
            estado para <strong>Link enviado</strong>.
          </p>
        </div>
      }
      confirmLabel={loading ? "A enviar…" : "Enviar email"}
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}

function mapSendLinkError(
  code: string | undefined,
  details?: string | null,
): string {
  const suffix = details ? ` Resend: ${details}` : "";
  switch (code) {
    case "EMAIL_PROVIDER_NOT_CONFIGURED":
      return "Email provider não configurado.";
    case "LEAD_EMAIL_MISSING":
      return "Lead sem email.";
    case "LEAD_EMAIL_INVALID":
      return "Email do lead inválido.";
    case "REPORT_NOT_READY":
      return "Este lead ainda não tem relatório público disponível.";
    case "REQUEST_NOT_FOUND":
      return "Pedido de relatório não encontrado.";
    case "HANDLE_MISSING":
      return "Handle Instagram em falta.";
    case "RESEND_SANDBOX_RECIPIENT_BLOCKED":
      return `Resend está em modo sandbox — verifica o domínio para enviar a outros destinatários.${suffix}`;
    case "RESEND_TIMEOUT":
      return "Email provider demorou demasiado a responder.";
    case "RESEND_FAILED":
      return `Falha ao enviar email.${suffix || " Tenta novamente."}`;
    case "UNAUTHORIZED":
    case "UNAUTHENTICATED":
    case "NOT_ALLOWED":
      return "Sessão admin inválida.";
    default:
      return "Erro ao enviar email.";
  }
}

// ── Feedback request button + dialog ─────────────────────────────

const FEEDBACK_ELIGIBLE = new Set([
  "link_enviado",
  "relatorio_visto",
  "feedback_pedido",
]);

function FeedbackRequestButton({
  lead,
  onClick,
}: {
  lead: EnrichedLead;
  onClick: () => void;
}) {
  const hasEmail = Boolean(lead.email);
  const hasHandle = Boolean(lead.handle);
  const hasRequest = Boolean(lead.report_request_id);
  const eligibleStatus = FEEDBACK_ELIGIBLE.has(lead.commercial_status ?? "");

  let disabledReason: string | null = null;
  if (!hasRequest) disabledReason = "Sem pedido de relatório associado.";
  else if (!hasEmail) disabledReason = "Lead sem email.";
  else if (!hasHandle) disabledReason = "Handle Instagram em falta.";
  else if (lead.feedback) disabledReason = "Feedback já recebido.";
  else if (!eligibleStatus)
    disabledReason =
      "Disponível depois de o link ser enviado e antes do feedback ser recebido.";

  const disabled = disabledReason != null;

  return (
    <AdminActionButton
      size="md"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabledReason ?? "Pedir feedback ao beta tester"}
    >
      <MessageSquareText size={14} /> Pedir feedback
    </AdminActionButton>
  );
}

function FeedbackRequestDialog({
  open,
  onOpenChange,
  loading,
  lead,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loading: boolean;
  lead: EnrichedLead;
  onConfirm: () => void;
}) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const feedbackUrl = lead.report_request_id
    ? `${origin}/feedback/${lead.report_request_id}`
    : "";
  const reportUrl = lead.handle ? `${origin}/analyze/${lead.handle}` : "";
  const firstName = lead.name?.trim().split(/\s+/)[0] ?? null;
  const { subject, text: previewBody } = renderFeedbackRequest({
    firstName,
    instagramHandle: lead.handle ?? "",
    reportUrl,
    feedbackUrl,
  });
  const notViewed = (lead.report_views ?? 0) === 0;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pedir feedback ao beta tester"
      description={
        <div className="space-y-3 text-[13px]">
          <div className="grid grid-cols-[80px_1fr] gap-y-1.5">
            <span className="admin-meta text-admin-text-tertiary">Para</span>
            <span className="text-admin-text-primary break-all">{lead.email}</span>
            <span className="admin-meta text-admin-text-tertiary">Perfil</span>
            <span className="text-admin-text-primary">@{lead.handle}</span>
            <span className="admin-meta text-admin-text-tertiary">Assunto</span>
            <span className="text-admin-text-primary">{subject}</span>
          </div>
          {notViewed && (
            <AdminCallout title="Sem visualização registada">
              Este relatório ainda não foi registado como visto. Podes
              enviar mesmo assim — o pedido continuará válido quando o
              lead abrir o link.
            </AdminCallout>
          )}
          <div>
            <p className="admin-eyebrow-sm mb-1">Link de feedback</p>
            <p className="admin-code text-admin-text-primary break-all rounded-md bg-admin-text-primary/[0.04] border border-admin-text-primary/10 px-2.5 py-1.5 text-[12px]">
              {feedbackUrl || "—"}
            </p>
          </div>
          <div>
            <p className="admin-eyebrow-sm mb-1">Pré-visualização</p>
            <pre className="text-admin-text-secondary whitespace-pre-wrap rounded-md bg-admin-text-primary/[0.03] border border-admin-text-primary/10 px-3 py-2 text-[12px] leading-relaxed font-sans m-0">
              {previewBody}
            </pre>
          </div>
          <p className="admin-meta text-admin-text-tertiary">
            Em sucesso: regista o evento <code>feedback_requested</code> e
            move o estado para <strong>Feedback pedido</strong>.
          </p>
        </div>
      }
      confirmLabel={loading ? "A enviar…" : "Enviar pedido"}
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}

function mapFeedbackError(code: string | undefined): string {
  switch (code) {
    case "STATUS_NOT_ELIGIBLE":
      return "Estado do lead não permite pedir feedback agora.";
    case "EMAIL_PROVIDER_NOT_CONFIGURED":
      return "Email provider não configurado.";
    case "LEAD_EMAIL_MISSING":
      return "Lead sem email.";
    case "LEAD_EMAIL_INVALID":
      return "Email do lead inválido.";
    case "REQUEST_NOT_FOUND":
      return "Pedido de relatório não encontrado.";
    case "HANDLE_MISSING":
      return "Handle Instagram em falta.";
    case "RESEND_SANDBOX_RECIPIENT_BLOCKED":
      return "Resend em modo sandbox — verifica o domínio.";
    case "RESEND_TIMEOUT":
      return "Email provider demorou demasiado a responder.";
    case "RESEND_FAILED":
      return "Falha ao enviar email.";
    case "UNAUTHORIZED":
    case "UNAUTHENTICATED":
    case "NOT_ALLOWED":
      return "Sessão admin inválida.";
    default:
      return "Erro ao enviar pedido de feedback.";
  }
}

// ── Feedback beta section ───────────────────────────────────────

export const FEEDBACK_SCORE_EMOJI: Record<number, { emoji: string; label: string }> = {
  5: { emoji: "😍", label: "Muito útil" },
  4: { emoji: "😊", label: "Útil" },
  3: { emoji: "🙂", label: "Razoável" },
  2: { emoji: "😐", label: "Pouco útil" },
  1: { emoji: "😞", label: "Nada útil" },
};

function FeedbackBetaSection({
  lead,
  onPedirFeedback,
  pedirDisabledReason,
}: {
  lead: EnrichedLead;
  onPedirFeedback: () => void;
  pedirDisabledReason: string | null;
}) {
  const feedback = lead.feedback;
  const pedirDisabled = pedirDisabledReason != null;

  if (!feedback) {
    return (
      <div className="px-4 sm:px-6 py-6 space-y-6">
        {/* (A) Empty state — emoji + CTA */}
        <div className="rounded-xl border border-admin-text-primary/10 bg-white p-7 text-center">
          <p className="m-0 text-[44px] leading-none">😊</p>
          <p className="m-0 mt-4 text-[14px] text-admin-text-secondary">
            Ainda sem feedback deste lead.
          </p>
          <Button
            size="sm"
            onClick={pedirDisabled ? undefined : onPedirFeedback}
            disabled={pedirDisabled}
            title={pedirDisabledReason ?? undefined}
            className="mt-5 bg-admin-info-500 hover:bg-admin-info-700 text-white"
          >
            <Send size={13} className="mr-1.5" /> Pedir feedback por email
          </Button>
        </div>

        {/* Illustrative preview — clearly labelled "Exemplo" */}
        <div>
          <p className="admin-eyebrow mb-2.5 flex items-center gap-2">
            <span>Como aparece quando responde</span>
            <span className="text-[11px] font-medium text-admin-text-tertiary px-1.5 py-0.5 rounded bg-admin-surface-muted normal-case tracking-normal">
              Exemplo
            </span>
          </p>
          <div className="rounded-xl border border-dashed border-admin-text-primary/15 bg-admin-surface-muted/40 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[20px] leading-none">😍</span>
              <span className="text-[13px] font-semibold text-admin-text-primary">
                Muito útil
              </span>
            </div>
            <p className="m-0 text-[12px] text-admin-text-tertiary mb-2">
              sobre o relatório de @{lead.handle ?? "exemplo"} · há 2 dias
            </p>
            <p className="m-0 text-[13px] italic text-admin-text-secondary">
              &ldquo;Adorei a clareza do diagnóstico. Faltou comparar com concorrentes.&rdquo;
            </p>
          </div>
        </div>
      </div>
    );
  }

  // (B) With feedback — emoji + label + texts + commercial signal
  const intent = interpretFeedback(feedback);
  const scoreInfo =
    FEEDBACK_SCORE_EMOJI[feedback.usefulness_score] ??
    { emoji: "🙂", label: `${feedback.usefulness_score}/5` };
  const pricingLabel = feedback.pricing_preference
    ? PRICING_PREFERENCE_LABELS[
        feedback.pricing_preference as keyof typeof PRICING_PREFERENCE_LABELS
      ] ?? feedback.pricing_preference
    : null;

  return (
    <div className="px-4 sm:px-6 py-6 space-y-5">
      <div className="rounded-xl border border-admin-text-primary/10 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[26px] leading-none shrink-0">{scoreInfo.emoji}</span>
            <div className="min-w-0">
              <p className="m-0 text-[14px] font-semibold text-admin-text-primary leading-tight">
                {scoreInfo.label}
              </p>
              <p className="m-0 mt-0.5 text-[12px] text-admin-text-tertiary tabular-nums">
                sobre o relatório de @{lead.handle ?? "—"} ·{" "}
                {relativeTime(feedback.created_at)}
              </p>
            </div>
          </div>
          <AdminBadge variant={intent.accent}>{intent.label}</AdminBadge>
        </div>

        {feedback.clarity_text && (
          <div className="mt-4 pt-4 border-t border-admin-text-primary/10">
            <p className="admin-eyebrow-sm mb-1.5">O que ficou mais claro</p>
            <p className="m-0 text-[13px] leading-relaxed text-admin-text-primary whitespace-pre-wrap">
              {feedback.clarity_text}
            </p>
          </div>
        )}
        {feedback.missing_text && (
          <div className="mt-4 pt-4 border-t border-admin-text-primary/10">
            <p className="admin-eyebrow-sm mb-1.5">O que faltou</p>
            <p className="m-0 text-[13px] leading-relaxed text-admin-text-primary whitespace-pre-wrap">
              {feedback.missing_text}
            </p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-admin-text-primary/10 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[12px]">
          <span className="text-admin-text-tertiary">Disposto a pagar</span>
          <span className="text-admin-text-primary">
            {PURCHASE_INTENT_LABELS[feedback.purchase_intent]}
          </span>
          {pricingLabel && (
            <>
              <span className="text-admin-text-tertiary">Opção preferida</span>
              <span className="text-admin-text-primary">{pricingLabel}</span>
            </>
          )}
          <span className="text-admin-text-tertiary">Permite contacto</span>
          <span className="text-admin-text-primary">
            {feedback.contact_consent ? "Sim" : "Não"}
          </span>
        </div>
      </div>

      <div className="rounded-xl p-4 flex items-start gap-3 bg-admin-info-50/60 border-l-[3px] border-admin-info-500/50">
        <Lightbulb size={15} className="text-admin-info-500 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="admin-eyebrow mb-1.5 text-admin-info-700">Sinal comercial</p>
          <p className="m-0 text-[13px] leading-snug font-medium text-admin-text-primary">
            {intent.nextAction}
          </p>
        </div>
      </div>
    </div>
  );
}
// ── LeadReportsList ──────────────────────────────────────────
// Lista os relatórios deste lead com cabeçalho compacto (créditos + CTA).

interface LeadReportRow {
  id: string;
  instagram_username: string;
  request_status: string;
  pdf_status: string;
  delivery_status: string;
  analysis_snapshot_id: string | null;
  created_at: string;
}

const REPORT_STATE_LABEL: Record<
  string,
  { label: string; tone: "revenue" | "info" | "signal" | "danger" | "neutral" }
> = {
  completed: { label: "Gerado", tone: "revenue" },
  ready: { label: "Gerado", tone: "revenue" },
  generated: { label: "Gerado", tone: "revenue" },
  pending: { label: "A processar", tone: "info" },
  processing: { label: "A processar", tone: "info" },
  approved: { label: "Por aprovar", tone: "neutral" },
  pending_review: { label: "Por aprovar", tone: "neutral" },
  failed: { label: "Falhou", tone: "danger" },
  rejected: { label: "Rejeitado", tone: "danger" },
};

function LeadReportsList({
  leadId,
  lead,
  canGenerate,
  generateDisabledReason,
  onGenerateClick,
  onResendLink,
}: {
  leadId: string;
  lead: EnrichedLead;
  canGenerate: boolean;
  generateDisabledReason: string | null;
  onGenerateClick: () => void;
  onResendLink: () => void;
}) {
  const { data, isLoading, error, refetch } = useQuery<{ rows: LeadReportRow[] }>({
    queryKey: ["admin", "lead-reports", leadId],
    queryFn: async () => {
      const res = await adminFetch(
        `/api/admin/report-requests?lead_id=${leadId}&pageSize=100`,
      );
      if (!res.ok) throw new Error("Falha ao carregar pedidos");
      return res.json();
    },
    staleTime: 30_000,
  });

  const rows = data?.rows ?? [];
  const count = rows.length;
  const creditsExhausted =
    lead.credits_granted > 0 && lead.credits_remaining <= 0;
  const creditsLabel =
    lead.credits_granted > 0
      ? `${lead.credits_remaining} / ${lead.credits_granted} créditos por usar`
      : "Sem créditos atribuídos";

  return (
    <div className="px-4 sm:px-6 py-6 space-y-5">
      {/* Cabeçalho compacto — contador + CTA "Gerar para este lead" */}
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-[13px] text-admin-text-primary tabular-nums leading-tight">
          <span className="font-semibold">{count}</span>{" "}
          {count === 1 ? "relatório" : "relatórios"}
          <span className="mx-1.5 text-admin-text-tertiary">·</span>
          <span
            className={
              creditsExhausted
                ? "text-admin-expense-500 font-medium"
                : "text-admin-text-secondary"
            }
          >
            {creditsLabel}
          </span>
        </p>
        <button
          type="button"
          onClick={canGenerate ? onGenerateClick : undefined}
          disabled={!canGenerate}
          title={generateDisabledReason ?? "Gerar nova análise para este lead"}
          className={`inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
            canGenerate
              ? "text-admin-info-500 hover:text-admin-info-700"
              : "text-admin-text-tertiary cursor-not-allowed"
          }`}
        >
          <Plus size={13} /> Gerar para este lead
        </button>
      </div>

      {/* Lista de relatórios */}
      {isLoading ? (
        <p className="text-[12px] text-admin-text-tertiary">A carregar pedidos…</p>
      ) : error ? (
        <div className="flex items-center gap-2">
          <p className="text-[12px] text-admin-danger-700">
            Não foi possível carregar pedidos.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-[12px] underline text-admin-text-secondary hover:text-admin-text-primary"
          >
            Tentar de novo
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-admin-text-primary/15 bg-admin-surface-muted/40 p-6 text-center">
          <p className="m-0 text-[13px] text-admin-text-tertiary">
            Este lead ainda não pediu nenhum relatório.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5 list-none p-0 m-0">
          {rows.map((r, idx) => {
            const state =
              REPORT_STATE_LABEL[r.request_status] ??
              { label: r.request_status, tone: "neutral" as const };
            const isLatest = idx === 0;
            const isGenerated = state.label === "Gerado";
            const showViewed = isLatest && isGenerated && lead.report_views > 0;
            const showNotViewed =
              isLatest && isGenerated && lead.report_views === 0;
            const hasSnapshot = !!r.analysis_snapshot_id;
            return (
              <li
                key={r.id}
                className="rounded-xl border border-admin-text-primary/10 bg-white p-3.5 hover:border-admin-text-primary/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar quadrado */}
                  <div
                    className="shrink-0 rounded-lg flex items-center justify-center bg-admin-text-primary/5"
                    style={{ width: 36, height: 36 }}
                  >
                    <Instagram size={16} className="text-admin-text-tertiary" />
                  </div>

                  {/* Meta — handle + estado + data */}
                  <div className="min-w-0 flex-1 flex items-center gap-2.5 flex-wrap">
                    <span className="text-[13px] font-semibold text-admin-text-primary">
                      @{r.instagram_username}
                    </span>
                    <AdminBadge variant={state.tone}>{state.label}</AdminBadge>
                    <span className="text-[12px] text-admin-text-tertiary tabular-nums">
                      {formatShortDateTime(r.created_at)}
                    </span>
                  </div>

                  {/* Acções rápidas */}
                  <div className="shrink-0 flex items-center gap-1">
                    <a
                      href={`/analyze/${r.instagram_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir relatório público"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-admin-text-primary/10 text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-surface-muted/50 transition-colors"
                    >
                      <ExternalLink size={13} />
                    </a>
                    {hasSnapshot ? (
                      <Link
                        to="/admin_/report-preview/snapshot/$snapshotId"
                        params={{ snapshotId: r.analysis_snapshot_id! }}
                        target="_blank"
                        title="Abrir snapshot"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-admin-text-primary/10 text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-surface-muted/50 transition-colors"
                      >
                        <Download size={13} />
                      </Link>
                    ) : (
                      <span
                        title="Snapshot ainda não gerado"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-admin-text-primary/10 text-admin-text-tertiary/40 cursor-not-allowed"
                      >
                        <Download size={13} />
                      </span>
                    )}
                    {isLatest && isGenerated && (
                      <button
                        type="button"
                        onClick={lead.email ? onResendLink : undefined}
                        title={
                          lead.email
                            ? "Reenviar link por email"
                            : "Lead sem email"
                        }
                        disabled={!lead.email}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-admin-text-primary/10 text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-surface-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Send size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {(showViewed || showNotViewed) && (
                  <p className="m-0 mt-2 pl-[48px] text-[12px] text-admin-text-tertiary flex items-center gap-1.5">
                    {showViewed ? (
                      <>
                        <CheckCircle2
                          size={12}
                          className="text-admin-revenue-500"
                        />
                        Visto {lead.report_views}{" "}
                        {lead.report_views === 1 ? "vez" : "vezes"} pelo lead
                      </>
                    ) : (
                      <>
                        <EyeOff size={12} />
                        Ainda não foi visto pelo lead.
                      </>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── LeadHistoryTimeline ──────────────────────────────────────
// Timeline vertical da ficha — entradas humanas derivadas dos product_events.

type HistoryDotStyle = "filled" | "ring" | "pending";

interface HistoryEntry {
  id: string;
  label: string;
  meta: string | null;
  timestamp: string | null;
  style: HistoryDotStyle;
  color?: string;
}

const TERMINAL_STATUSES = new Set(["convertido", "arquivado", "expirado"]);

export function buildLeadHistoryEntries(
  lead: EnrichedLead,
  timeline: TimelineEvent[],
  suggestedStep: string,
): HistoryEntry[] {
  // Timeline arrives DESC — process in ASC for chronological order.
  const asc = [...timeline].sort((a, b) =>
    a.created_at < b.created_at ? -1 : 1,
  );
  const entries: HistoryEntry[] = [];

  for (const ev of asc) {
    const t = ev.event_type;
    if (t === "beta_request_created" || t === "unlock_email_submitted") {
      const handle =
        (ev.metadata?.handle as string | undefined) ?? lead.handle ?? "";
      entries.push({
        id: ev.id,
        label: handle
          ? `Criou conta e pediu análise de @${handle}`
          : "Criou conta e pediu análise",
        meta:
          lead.source === "onboarding_modal" || t === "beta_request_created"
            ? "via modal de onboarding"
            : "via desbloqueio direto",
        timestamp: ev.created_at,
        style: "filled",
        color: "rgb(var(--admin-info-500))",
      });
    } else if (t === "report_generated") {
      entries.push({
        id: ev.id,
        label: "Relatório gerado",
        meta: lead.credits_granted > 0 ? "1 crédito usado" : null,
        timestamp: ev.created_at,
        style: "filled",
        color: "rgb(var(--admin-revenue-500))",
      });
    } else if (t === "report_link_sent") {
      entries.push({
        id: ev.id,
        label: "Email com o link enviado",
        meta: null,
        timestamp: ev.created_at,
        style: "ring",
      });
    } else if (t === "report_viewed") {
      // Collapse consecutive views into a single entry.
      const last = entries[entries.length - 1];
      if (last && last.id.startsWith("view-")) continue;
      entries.push({
        id: `view-${ev.id}`,
        label: "Lead abriu o relatório",
        meta: null,
        timestamp: ev.created_at,
        style: "filled",
        color: "rgb(var(--admin-leads-500))",
      });
    } else if (t === "feedback_requested") {
      entries.push({
        id: ev.id,
        label: "Feedback pedido por email",
        meta: null,
        timestamp: ev.created_at,
        style: "ring",
      });
    } else if (t === "feedback_submitted") {
      entries.push({
        id: ev.id,
        label: "Feedback recebido",
        meta: null,
        timestamp: ev.created_at,
        style: "filled",
        color: "rgb(var(--admin-expense-500))",
      });
    } else if (t === "commercial_followup_sent") {
      entries.push({
        id: ev.id,
        label: "Follow-up comercial enviado",
        meta: null,
        timestamp: ev.created_at,
        style: "ring",
      });
    }
  }

  // Pending projection — only when the lead isn't in a terminal state.
  const terminal = TERMINAL_STATUSES.has(lead.commercial_status ?? "");
  if (!terminal && suggestedStep) {
    entries.push({
      id: "pending",
      label: suggestedStep,
      meta: null,
      timestamp: null,
      style: "pending",
    });
  }

  return entries;
}

function HistoryDot({
  style,
  color,
}: {
  style: HistoryDotStyle;
  color?: string;
}) {
  if (style === "filled") {
    return (
      <span
        className="block rounded-full"
        style={{
          width: 11,
          height: 11,
          backgroundColor: color ?? "rgb(var(--admin-info-500))",
        }}
      />
    );
  }
  if (style === "ring") {
    return (
      <span
        className="block rounded-full bg-white border-2 border-admin-info-500"
        style={{
          width: 11,
          height: 11,
        }}
      />
    );
  }
  return (
    <span
      className="block rounded-full bg-white border-[1.5px] border-dashed border-admin-text-primary/40"
      style={{
        width: 11,
        height: 11,
      }}
    />
  );
}

function LeadHistoryTimeline({
  lead,
  timeline,
  loading,
  suggestedStep,
}: {
  lead: EnrichedLead;
  timeline: TimelineEvent[];
  loading: boolean;
  suggestedStep: string;
}) {
  const entries = useMemo(
    () => buildLeadHistoryEntries(lead, timeline, suggestedStep),
    [lead, timeline, suggestedStep],
  );

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-6 flex items-center gap-2 text-[12px] text-admin-text-tertiary">
        <Loader2 size={13} className="animate-spin" /> A carregar histórico…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="px-4 sm:px-6 py-6">
        <p className="text-[12px] text-admin-text-tertiary">
          Sem eventos registados para este lead.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6">
      <ol className="list-none p-0 m-0">
        {entries.map((entry, i) => {
          const isLast = i === entries.length - 1;
          const isPending = entry.style === "pending";
          const nextIsPending = !isLast && entries[i + 1].style === "pending";
          return (
            <li key={entry.id} className="relative pl-7 pb-5 last:pb-0">
              {/* Vertical rail */}
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[5px] top-3.5"
                  style={{
                    width: 1,
                    bottom: 0,
                    backgroundColor: nextIsPending
                      ? "transparent"
                      : "rgb(var(--admin-neutral-900) / 0.15)",
                    backgroundImage: nextIsPending
                      ? "linear-gradient(to bottom, rgb(var(--admin-neutral-900) / 0.3) 50%, transparent 50%)"
                      : undefined,
                    backgroundSize: nextIsPending ? "1px 5px" : undefined,
                    backgroundRepeat: nextIsPending ? "repeat-y" : undefined,
                  }}
                />
              )}
              <span className="absolute left-0 top-1.5">
                <HistoryDot style={entry.style} color={entry.color} />
              </span>
              <p
                className={`m-0 text-[13px] leading-snug ${
                  isPending
                    ? "italic text-admin-text-tertiary"
                    : "font-medium text-admin-text-primary"
                }`}
              >
                {entry.label}
                {isPending && "…"}
              </p>
              {entry.meta && (
                <p className="m-0 mt-1 text-[12px] text-admin-text-tertiary">
                  {entry.meta}
                  {entry.timestamp && (
                    <>
                      {" · "}
                      <span className="tabular-nums">
                        {formatShortDateTime(entry.timestamp)}
                      </span>
                    </>
                  )}
                </p>
              )}
              {!entry.meta && entry.timestamp && (
                <p className="m-0 mt-1 text-[12px] text-admin-text-tertiary tabular-nums">
                  {formatShortDateTime(entry.timestamp)}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── LeadCreditsTab ───────────────────────────────────────────────

interface LedgerEntry {
  id: string;
  delta: number;
  reason: string;
  handle: string | null;
  cache_key: string | null;
  analysis_snapshot_id: string | null;
  analysis_event_id: string | null;
  reservation_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface AnalysisEventEntry {
  id: string;
  handle: string;
  analysis_window: string | null;
  cache_key: string | null;
  data_source: string | null;
  outcome: string | null;
  analysis_snapshot_id: string | null;
  estimated_cost_usd: number | null;
  competitor_handles: string[];
  created_at: string;
}

interface CreditActivityResponse {
  success: boolean;
  balance: number;
  summary: { granted: number; confirmed: number; reserved: number; released: number };
  ledger: LedgerEntry[];
  events: AnalysisEventEntry[];
}

/**
 * Maps a ledger row to a single human-readable kind chip. Distinguishes:
 *  - Crédito inicial (initial_grant)
 *  - Bónus beta (admin_adjust + metadata.kind=post_purchase_beta_bonus)
 *  - Smoke test top-up (admin_adjust + metadata.kind=smoke_*)
 *  - Ajuste manual (other admin_adjust)
 *  - Análise período 30d/90d (reserve with :w= suffix)
 *  - Análise baseline (plain reserve)
 *  - Confirmado (confirm)
 *  - Estorno (release)
 * TODO: distinguish competitor-only reserves when backend stops bundling them.
 */
function ledgerKind(
  e: LedgerEntry,
  win: ReturnType<typeof deriveWindow>,
  isPeriod: boolean,
): { label: string; variant: AdminAccent } {
  if (e.reason === "initial_grant") {
    return { label: "Crédito inicial", variant: "info" };
  }
  if (e.reason === "admin_adjust") {
    const kind =
      typeof e.metadata?.kind === "string" ? (e.metadata.kind as string) : "";
    if (kind === "post_purchase_beta_bonus") {
      return { label: "Bónus beta", variant: "signal" };
    }
    if (kind.startsWith("smoke_")) {
      return { label: "Top-up de teste", variant: "neutral" };
    }
    return { label: "Ajuste manual", variant: "neutral" };
  }
  if (e.reason === "reserve") {
    if (isPeriod) {
      return {
        label: `Análise · ${windowLabel(win)}`,
        variant: windowBadgeVariant(win),
      };
    }
    return { label: "Análise baseline", variant: "neutral" };
  }
  if (e.reason === "confirm") return { label: "Confirmado", variant: "revenue" };
  if (e.reason === "release") return { label: "Estorno", variant: "neutral" };
  return { label: e.reason, variant: "neutral" };
}

function LeadCreditsTab({ leadId, active }: { leadId: string; active: boolean }) {
  const { data, isLoading, error } = useQuery<CreditActivityResponse>({
    queryKey: ["admin", "lead-credit-activity", leadId],
    enabled: active && !!leadId,
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/lead-credit-activity/${leadId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 10_000,
  });

  if (isLoading) {
    return (
      <div className="px-6 py-10 text-[13px] text-admin-text-tertiary">
        A carregar créditos…
      </div>
    );
  }
  if (error || !data?.success) {
    return (
      <div className="px-6 py-10 text-[13px] text-admin-danger-500">
        Falhou a carregar créditos.
      </div>
    );
  }

  const { balance, summary, ledger, events } = data;

  return (
    <div className="px-6 py-6 space-y-7">
      {/* Saldo */}
      <section>
        <h3 className="admin-section-title mb-3">Saldo actual</h3>
        <div className="flex items-baseline gap-3">
          <span className="text-[32px] font-semibold tabular-nums leading-none text-admin-text-primary">
            {balance}
          </span>
          <span className="text-[12px] text-admin-text-tertiary">
            granted {summary.granted} · usados {summary.confirmed} · reservados {summary.reserved}
            {summary.released > 0 ? ` · libertados ${summary.released}` : ""}
          </span>
        </div>
      </section>

      {/* Movimentos */}
      <section>
        <h3 className="admin-section-title mb-3">Movimentos ({ledger.length})</h3>
        {ledger.length === 0 ? (
          <p className="text-[12px] text-admin-text-tertiary">Sem movimentos.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-admin-border">
            <table className="w-full border-collapse text-left text-[12px]">
              <thead>
                <tr className="text-admin-text-tertiary">
                  <th className="admin-eyebrow px-3 py-2 font-normal">Δ</th>
                  <th className="admin-eyebrow px-3 py-2 font-normal">Tipo</th>
                  <th className="admin-eyebrow px-3 py-2 font-normal">Handle</th>
                  <th className="admin-eyebrow px-3 py-2 font-normal">Snapshot</th>
                  <th className="admin-eyebrow px-3 py-2 font-normal">Evento</th>
                  <th className="admin-eyebrow px-3 py-2 font-normal">Quando</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((e) => {
                  const win = deriveWindow(null, e.cache_key);
                  const isPeriod = !!e.cache_key && /:w=\d+d$/i.test(e.cache_key);
                  const kind = ledgerKind(e, win, isPeriod);
                  const deltaColor =
                    e.delta < 0
                      ? "text-admin-danger-500"
                      : e.delta > 0
                        ? "text-admin-revenue-700"
                        : "text-admin-text-tertiary";
                  return (
                    <tr key={e.id} className="border-t border-admin-border">
                      <td className={`px-3 py-2 tabular-nums font-semibold ${deltaColor}`}>
                        {e.delta > 0 ? `+${e.delta}` : e.delta}
                      </td>
                      <td className="px-3 py-2">
                        <AdminBadge variant={kind.variant}>{kind.label}</AdminBadge>
                      </td>
                      <td className="px-3 py-2 text-admin-text-secondary">
                        {e.handle ? `@${e.handle}` : "—"}
                      </td>
                      <td className="px-3 py-2 admin-code text-admin-text-secondary">
                        {e.analysis_snapshot_id ? e.analysis_snapshot_id.slice(0, 8) : "—"}
                      </td>
                      <td className="px-3 py-2 admin-code text-admin-text-secondary" title={e.analysis_event_id ?? undefined}>
                        {e.analysis_event_id ? e.analysis_event_id.slice(0, 8) : "—"}
                      </td>
                      <td className="px-3 py-2 admin-code text-admin-text-tertiary tabular-nums">
                        {new Date(e.created_at).toLocaleString("pt-PT", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Análises recentes */}
      <section>
        <h3 className="admin-section-title mb-3">Análises recentes ({events.length})</h3>
        {events.length === 0 ? (
          <p className="text-[12px] text-admin-text-tertiary">Sem análises registadas para os handles deste lead.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-admin-border">
            <table className="w-full border-collapse text-left text-[12px]">
              <thead>
                <tr className="text-admin-text-tertiary">
                  <th className="admin-eyebrow px-3 py-2 font-normal">Handle</th>
                  <th className="admin-eyebrow px-3 py-2 font-normal">Janela</th>
                  <th className="admin-eyebrow px-3 py-2 font-normal">Origem</th>
                  <th className="admin-eyebrow px-3 py-2 font-normal">Outcome</th>
                  <th className="admin-eyebrow px-3 py-2 font-normal">Snapshot</th>
                  <th className="admin-eyebrow px-3 py-2 font-normal">Custo</th>
                  <th className="admin-eyebrow px-3 py-2 font-normal">Quando</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const win = deriveWindow(ev.analysis_window, ev.cache_key);
                  return (
                    <tr key={ev.id} className="border-t border-admin-border">
                      <td className="px-3 py-2 text-admin-text-secondary">@{ev.handle}</td>
                      <td className="px-3 py-2">
                        <AdminBadge variant={windowBadgeVariant(win)}>
                          {windowLabel(win)}
                        </AdminBadge>
                      </td>
                      <td className="px-3 py-2">
                        {ev.data_source ? (
                          <AdminBadge variant={dataSourceBadgeVariant(ev.data_source)}>
                            {dataSourceLabel(ev.data_source)}
                          </AdminBadge>
                        ) : (
                          <span className="text-admin-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-admin-text-secondary">{ev.outcome ?? "—"}</td>
                      <td className="px-3 py-2 admin-code text-admin-text-secondary">
                        {ev.analysis_snapshot_id ? ev.analysis_snapshot_id.slice(0, 8) : "—"}
                      </td>
                      <td className="px-3 py-2 admin-code text-admin-text-secondary tabular-nums">
                        {ev.estimated_cost_usd != null
                          ? `$${ev.estimated_cost_usd.toFixed(3)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 admin-code text-admin-text-tertiary tabular-nums">
                        {new Date(ev.created_at).toLocaleString("pt-PT", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
