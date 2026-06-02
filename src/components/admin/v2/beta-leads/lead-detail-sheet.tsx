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
import { Zap, Flame, Repeat, Wallet, FileBarChart, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import {
  KANBAN_COLUMNS,
  COMMERCIAL_STATUS_OPTIONS,
  type EnrichedLead,
} from "@/lib/admin/kanban-columns";
import { suggestNextLeadAction } from "@/lib/admin/lead-lifecycle";
import { USER_TYPE_LABELS, type UserType } from "@/lib/unlock-flow";
import { getEventLabel } from "@/lib/admin/event-labels";
import { LeadCommunicationTimeline } from "./lead-communication-timeline";
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
} from "@/lib/admin/lead-context-labels";

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
    <div
      className="mx-6"
      style={{
        height: 1,
        background: "linear-gradient(to right, rgba(44,44,42,0.10), transparent 80%)",
      }}
    />
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
    <div className="rounded-lg border border-admin-text-primary/10 bg-admin-surface-muted/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon
            size={11}
            className={
              tone === "danger"
                ? "text-admin-expense-500"
                : "text-admin-text-tertiary"
            }
          />
        )}
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            tone === "danger" ? "text-admin-expense-500" : "text-admin-text-tertiary"
          }`}
        >
          {label}
        </span>
      </div>
      <p className="m-0 mt-1 text-[15px] font-semibold text-admin-text-primary tabular-nums">
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

/** Statuses that allow triggering a fresh report generation. */
const GENERATABLE_STATUSES = ["approved", "pending_review", "failed"] as const;

type TabKey = "resumo" | "relatorio" | "feedback" | "comunicacao" | "historico";

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "resumo", label: "Resumo" },
  { key: "relatorio", label: "Relatórios" },
  { key: "feedback", label: "Feedback" },
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

  if (!lead) return null;

  const intent = deriveIntentSignal(lead);
  const lastReportLinkSentAt =
    timeline.find((ev) => ev.event_type === "report_link_sent")?.created_at ??
    null;
  const suggestedStep = suggestNextLeadAction(lead).label;
  const feedbackIntent = interpretFeedback(lead.feedback);
  // When feedback exists, override the heuristic intent with the commercial signal.
  const displayedIntent = lead.feedback
    ? { label: feedbackIntent.label, accent: feedbackIntent.accent }
    : intent;
  const displayedSuggestion = lead.feedback ? feedbackIntent.nextAction : suggestedStep;
  const columnDef = KANBAN_COLUMNS.find((c) => c.key === lead.commercial_status);

  // Commercial follow-up button is only available when the lead has shown
  // measurable purchase intent in their feedback AND is still in the funnel.
  const followupEligible =
    !!lead.email &&
    !!lead.feedback &&
    (feedbackIntent.intent === "alto" || feedbackIntent.intent === "medio") &&
    lead.commercial_status !== "convertido" &&
    lead.commercial_status !== "arquivado";

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

  // CTA do próximo passo — mapeia o estado actual à acção mais relevante.
  const nextStepCta = useMemo<
    { label: string; onClick: () => void } | null
  >(() => {
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
    if (followupEligible) {
      return { label: "Follow-up →", onClick: () => setFollowupOpen(true) };
    }
    return null;
  }, [
    lead.commercial_status,
    lead.report_status,
    lead.report_request_id,
    lead.feedback,
    followupEligible,
  ]);

  // Estado comercial agrupado para o select.
  const statusOptionsManual = COMMERCIAL_STATUS_OPTIONS.filter(
    (o) => o.kind === "manual",
  );
  const statusOptionsAuto = COMMERCIAL_STATUS_OPTIONS.filter(
    (o) => o.kind === "auto",
  );

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
        <div className="px-6 pt-6 pb-4 border-b border-admin-text-primary/10 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="shrink-0 flex items-center justify-center rounded-full text-white font-semibold"
                style={{
                  width: 44,
                  height: 44,
                  fontSize: 15,
                  backgroundColor: columnDef?.color ?? "#534AB7",
                }}
              >
                {getInitials(displayName(lead) !== "Sem nome" ? displayName(lead) : lead.email)}
              </div>
              <div className="min-w-0">
                <h2
                  className="m-0 truncate text-admin-text-primary"
                  style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}
                >
                  {displayName(lead)}
                </h2>
                <a
                  href={`mailto:${lead.email}`}
                  className="admin-body text-admin-text-secondary mt-1 truncate block hover:text-admin-text-primary transition-colors"
                  title={lead.email}
                >
                  {lead.email}
                </a>
              </div>
            </div>
            {columnDef && (
              <span
                className="shrink-0 rounded-lg px-2.5 py-1 text-[12px] font-medium"
                style={{
                  backgroundColor: `${columnDef.color}15`,
                  color: columnDef.color,
                  border: `1px solid ${columnDef.color}30`,
                }}
              >
                {columnDef.label}
              </span>
            )}
          </div>

          {/* KPI strip — 4 métricas accionáveis */}
          <div className="grid grid-cols-4 gap-2 mt-4">
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
            <TabsList className="h-auto bg-transparent p-0 gap-5 rounded-none justify-start">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className="relative h-9 px-0 rounded-none bg-transparent text-[13px] font-medium text-admin-text-tertiary data-[state=active]:text-admin-text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-[2px] data-[state=active]:after:bg-admin-text-primary"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── Tab: Resumo ─────────────────────────────── */}
          <TabsContent value="resumo" className="flex-1 overflow-y-auto mt-0">
            <div className="px-6 py-5 space-y-6">
              {/* (a) Próximo passo — callout com CTA */}
              <div
                className="rounded-xl p-3.5 flex items-center justify-between gap-3"
                style={{
                  backgroundColor: "rgba(55,114,229,0.08)",
                  border: "1px solid rgba(55,114,229,0.18)",
                }}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Lightbulb size={16} className="text-admin-info-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="admin-eyebrow mb-0.5 text-admin-info-700">Próximo passo</p>
                    <p className="admin-body text-admin-text-primary font-medium m-0">
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
                <p className="admin-eyebrow mb-3">Contexto do lead</p>
                <div className="grid grid-cols-2 gap-x-5 gap-y-4">
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
                  <ContextField
                    icon={Flame}
                    label="Intenção"
                    value={displayedIntent.label}
                  />
                </div>
              </div>

              {/* (c) Estado comercial — select agrupado manual/auto */}
              <div>
                <p className="admin-eyebrow mb-2">Estado comercial</p>
                <Select value={lead.commercial_status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-10 text-[13px] rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel className="text-eyebrow-sm text-admin-text-tertiary">
                        Decisão comercial
                      </SelectLabel>
                      {statusOptionsManual.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key} className="text-[13px]">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-eyebrow-sm text-admin-text-tertiary mt-1">
                        Automático · atualizado pelo sistema
                      </SelectLabel>
                      {statusOptionsAuto.map((opt) => {
                        const isCurrent = opt.key === lead.commercial_status;
                        return (
                          <SelectItem
                            key={opt.key}
                            value={opt.key}
                            disabled={!isCurrent}
                            className="text-[13px] text-admin-text-tertiary"
                            title="Estado atualizado automaticamente pelo sistema"
                          >
                            {opt.label}
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* (d) Notas internas */}
              <div>
                <p className="admin-eyebrow mb-2">Notas internas</p>
                <Textarea
                  value={notesText}
                  onChange={(e) => {
                    setNotesText(e.target.value);
                    setNotesDirty(true);
                  }}
                  rows={3}
                  placeholder="Adicionar nota sobre este lead…"
                  className="text-[13px]"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="admin-meta text-admin-text-tertiary">
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
            <div className="px-4 sm:px-6 py-5 border-b" style={{ borderColor: "rgb(var(--admin-border-default))" }}>
              <SectionTitle>Histórico de pedidos</SectionTitle>
              <LeadReportsList leadId={lead.id} />
            </div>

            <div className="px-4 sm:px-6 py-5 pb-8">
              <SectionTitle>Último relatório</SectionTitle>
              <ProgressTracker
                reportStatus={lead.report_status}
                pdfStatus={lead.pdf_status}
              />

              <DetailRow label="Estado" icon={FileText}>
                <AdminBadge variant={STATUS_ACCENT[lead.report_status ?? ""] ?? "neutral"}>
                  {lead.report_status ?? "—"}
                </AdminBadge>
              </DetailRow>
              {lead.pdf_status && lead.pdf_status !== "not_generated" && (
                <DetailRow label="PDF" icon={FileText}>
                  <AdminBadge variant={STATUS_ACCENT[lead.pdf_status] ?? "neutral"}>
                    {lead.pdf_status}
                  </AdminBadge>
                </DetailRow>
              )}
              <DetailRow label="Última interação" icon={Clock}>
                {formatDate(lead.last_interaction)}
              </DetailRow>

              {lead.handle ? (
                <div className="flex flex-wrap gap-2 mt-4">
                  <AdminActionButton
                    size="md"
                    onClick={() => window.open(`/analyze/${lead.handle}`, "_blank")}
                  >
                    <ExternalLink size={14} /> Abrir relatório
                  </AdminActionButton>
                  <AdminActionButton size="md" onClick={handleCopyLink}>
                    <Link2 size={14} /> Copiar link
                  </AdminActionButton>
                  <SendLinkButton
                    lead={lead}
                    lastSentAt={lastReportLinkSentAt}
                    onClick={() => setSendLinkOpen(true)}
                  />
                  <FeedbackRequestButton
                    lead={lead}
                    onClick={() => setFeedbackOpen(true)}
                  />
                  {lead.report_request_id &&
                    GENERATABLE_STATUSES.includes(lead.report_status as typeof GENERATABLE_STATUSES[number]) && (
                    <AdminActionButton
                      size="md"
                      onClick={() => setGenerateOpen(true)}
                      className="!border-admin-signal-500/40 !text-admin-signal-700 hover:!bg-admin-signal-50"
                    >
                      <Zap size={14} /> Gerar relatório
                    </AdminActionButton>
                  )}
                </div>
              ) : (
                <p className="admin-meta text-admin-text-tertiary mt-4">
                  Sem handle Instagram associado — ações de relatório indisponíveis.
                </p>
              )}
            </div>
          </TabsContent>

          {/* ── Tab: Feedback ───────────────────────────── */}
          <TabsContent value="feedback" className="flex-1 overflow-y-auto mt-0">
            <FeedbackBetaSection feedback={lead.feedback} />
          </TabsContent>

          {/* ── Tab: Histórico (inclui comunicação) ─────── */}
          <TabsContent value="historico" className="flex-1 overflow-y-auto mt-0">
            <div className="px-6 py-5 space-y-5">
              {lead.lead_magnet && lead.lead_magnet.status !== "none" && (
                <div className="rounded-lg border border-[var(--color-admin-border)] bg-white p-3">
                  <p className="m-0 text-eyebrow-sm text-admin-text-tertiary">
                    Lead-magnet
                  </p>
                  <p className="m-0 mt-1 text-[13px] text-admin-text-primary">
                    Estado: <strong>{lead.lead_magnet.status}</strong> ·{" "}
                    {lead.lead_magnet.sent_count} envio
                    {lead.lead_magnet.sent_count === 1 ? "" : "s"}
                  </p>
                  {lead.lead_magnet.last_event_at && (
                    <p className="m-0 mt-0.5 text-[12px] text-admin-text-tertiary">
                      Último evento: {lead.lead_magnet.last_event_type} ·{" "}
                      {new Date(lead.lead_magnet.last_event_at).toLocaleString("pt-PT")}
                    </p>
                  )}
                </div>
              )}
              <LeadCommunicationTimeline timeline={timeline} loading={timelineLoading} />
            </div>
            <TimelineSection
              timeline={groupConsecutiveViews(timeline)}
              loading={timelineLoading}
              title="Eventos do produto"
            />
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
    <div className="flex items-center gap-1 mb-4">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1 flex-1">
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
              width: 22,
              height: 22,
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: step.done ? "rgba(5,150,105,0.15)" : "rgba(44,44,42,0.06)",
              color: step.done ? "#059669" : "rgba(44,44,42,0.4)",
            }}
          >
            {step.done ? "✓" : i + 1}
          </div>
          <span
            className="admin-meta"
            style={{ color: step.done ? "#059669" : undefined }}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className="flex-1 mx-1"
              style={{
                height: 1,
                backgroundColor: step.done ? "rgba(5,150,105,0.3)" : "rgba(44,44,42,0.10)",
              }}
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
                className="flex items-start gap-3 py-2.5"
                style={{ borderBottom: "1px solid rgba(44,44,42,0.06)" }}
              >
                <div
                  className="mt-0.5 flex items-center justify-center shrink-0 rounded-md"
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: "rgba(44,44,42,0.06)",
                  }}
                >
                  <IconComp size={13} className="text-admin-text-tertiary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="admin-body text-admin-text-primary m-0 flex items-center gap-2">
                    <span>{getEventLabel(ev.event_type)}</span>
                    {groupedCount && groupedCount > 1 ? (
                      <span
                        className="admin-meta text-admin-text-tertiary rounded-full px-2 py-0.5"
                        style={{ backgroundColor: "rgba(44,44,42,0.06)" }}
                      >
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
                  <p className="admin-meta text-admin-text-tertiary m-0 mt-0.5">
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

function FeedbackBetaSection({
  feedback,
}: {
  feedback: EnrichedLead["feedback"];
}) {
  if (!feedback) {
    return (
      <div className="px-4 sm:px-6 py-5">
        <SectionTitle>Feedback beta</SectionTitle>
        <div
          className="rounded-xl p-4 admin-body text-admin-text-tertiary"
          style={{
            backgroundColor: "rgba(44,44,42,0.03)",
            border: "1px dashed rgba(44,44,42,0.12)",
          }}
        >
          Sem feedback ainda. Usa <strong>Pedir feedback</strong> na secção
          Relatório para enviar o pedido ao lead.
        </div>
      </div>
    );
  }

  const intent = interpretFeedback(feedback);
  const pricingLabel = feedback.pricing_preference
    ? PRICING_PREFERENCE_LABELS[
        feedback.pricing_preference as keyof typeof PRICING_PREFERENCE_LABELS
      ] ?? feedback.pricing_preference
    : "—";

  return (
    <div className="px-4 sm:px-6 py-5">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle>Feedback beta</SectionTitle>
        <span className="admin-meta text-admin-text-tertiary">
          {relativeTime(feedback.created_at)}
        </span>
      </div>

      {/* Score dots */}
      <div className="flex items-center gap-1.5 mb-3" aria-label={`Score ${feedback.usefulness_score} de 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className="rounded-full"
            style={{
              width: 10,
              height: 10,
              backgroundColor:
                n <= feedback.usefulness_score
                  ? "var(--admin-accent-info-500, #3772E5)"
                  : "rgba(44,44,42,0.12)",
            }}
          />
        ))}
        <span className="admin-meta text-admin-text-secondary ml-2 tabular-nums">
          {feedback.usefulness_score}/5
        </span>
      </div>

      <DetailRow label="Disposto a pagar">
        <AdminBadge
          variant={
            feedback.purchase_intent === "sim"
              ? "revenue"
              : feedback.purchase_intent === "talvez"
                ? "signal"
                : "neutral"
          }
        >
          {PURCHASE_INTENT_LABELS[feedback.purchase_intent]}
        </AdminBadge>
      </DetailRow>
      <DetailRow label="Opção preferida">{pricingLabel}</DetailRow>
      <DetailRow label="Permite contacto">
        {feedback.contact_consent ? "Sim" : "Não"}
      </DetailRow>

      {feedback.clarity_text && (
        <div className="mt-3">
          <p className="admin-eyebrow mb-1">O que ficou mais claro</p>
          <p className="admin-body text-admin-text-primary m-0 whitespace-pre-wrap">
            {feedback.clarity_text}
          </p>
        </div>
      )}
      {feedback.missing_text && (
        <div className="mt-3">
          <p className="admin-eyebrow mb-1">O que faltou</p>
          <p className="admin-body text-admin-text-primary m-0 whitespace-pre-wrap">
            {feedback.missing_text}
          </p>
        </div>
      )}

      <div
        className="mt-4 rounded-xl p-3.5 flex items-start gap-2.5"
        style={{
          backgroundColor: "rgba(55,114,229,0.06)",
          borderLeft: "3px solid rgba(55,114,229,0.4)",
        }}
      >
        <Lightbulb size={15} className="text-admin-text-tertiary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="admin-eyebrow mb-1 flex items-center gap-2">
            Sinal comercial
            <AdminBadge variant={intent.accent}>{intent.label}</AdminBadge>
          </p>
          <p className="admin-body text-admin-text-primary font-medium m-0">
            {intent.nextAction}
          </p>
        </div>
      </div>
    </div>
  );
}
// ── LeadReportsList ──────────────────────────────────────────
// Lista todos os report_requests deste contacto. Read-only.

interface LeadReportRow {
  id: string;
  instagram_username: string;
  request_status: string;
  pdf_status: string;
  delivery_status: string;
  analysis_snapshot_id: string | null;
  created_at: string;
}

function LeadReportsList({ leadId }: { leadId: string }) {
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

  if (isLoading) {
    return (
      <p className="text-[12px] text-admin-text-tertiary">A carregar pedidos…</p>
    );
  }

  if (error) {
    return (
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
    );
  }

  const rows = data?.rows ?? [];
  if (rows.length === 0) {
    return (
      <p className="text-[12px] text-admin-text-tertiary">
        Ainda não existem relatórios associados a este contacto.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {rows.map((r) => (
        <li
          key={r.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t py-2.5 first:border-t-0 first:pt-0"
          style={{ borderColor: "rgb(var(--admin-border-default))" }}
        >
          <span className="text-[13px] font-medium text-admin-text-primary">
            @{r.instagram_username}
          </span>
          <span className="text-[11px] text-admin-text-tertiary">
            {formatDate(r.created_at)}
          </span>
          <AdminBadge variant={STATUS_ACCENT[r.request_status] ?? "neutral"}>
            {r.request_status}
          </AdminBadge>
          {r.pdf_status && r.pdf_status !== "not_generated" && (
            <AdminBadge variant={STATUS_ACCENT[r.pdf_status] ?? "neutral"}>
              PDF: {r.pdf_status}
            </AdminBadge>
          )}
          {r.delivery_status && r.delivery_status !== "not_sent" && (
            <AdminBadge variant={STATUS_ACCENT[r.delivery_status] ?? "neutral"}>
              Email: {r.delivery_status}
            </AdminBadge>
          )}
          <div className="ml-auto flex items-center gap-2">
            {r.instagram_username && (
              <a
                href={`/analyze/${r.instagram_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-medium text-admin-text-secondary hover:text-admin-text-primary hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink size={11} /> Abrir
              </a>
            )}
            {r.analysis_snapshot_id && (
              <Link
                to="/admin/report-preview/snapshot/$snapshotId"
                params={{ snapshotId: r.analysis_snapshot_id }}
                target="_blank"
                className="text-[11px] font-medium text-admin-text-secondary hover:text-admin-text-primary hover:underline inline-flex items-center gap-1"
              >
                <FileText size={11} /> Snapshot
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
