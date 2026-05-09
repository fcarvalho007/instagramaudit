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
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
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
import { Zap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { KANBAN_COLUMNS, type EnrichedLead } from "@/lib/admin/kanban-columns";
import { suggestNextLeadAction } from "@/lib/admin/lead-lifecycle";
import {
  buildReportLinkEmailSubject,
  buildReportLinkPreviewBody,
} from "@/lib/email/report-link-email-template";

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

const USER_TYPE_LABEL: Record<string, string> = {
  marca: "Marca",
  agencia: "Agência",
  freelancer: "Freelancer",
  criador: "Criador de conteúdo",
  estudante: "Estudante",
};

const USER_TYPE_ACCENT: Record<string, "leads" | "revenue" | "expense" | "info" | "signal" | "neutral"> = {
  marca: "leads",
  agencia: "revenue",
  freelancer: "expense",
  criador: "info",
  estudante: "signal",
};

const STATUS_ACCENT: Record<string, "revenue" | "info" | "signal" | "expense" | "danger" | "neutral"> = {
  completed: "revenue",
  ready: "revenue",
  pending: "info",
  pending_review: "info",
  approved: "info",
  processing: "expense",
  failed: "danger",
  rejected: "danger",
  not_generated: "neutral",
  generated: "revenue",
  sent: "revenue",
  not_sent: "neutral",
};

const EVENT_LABELS: Record<string, string> = {
  report_viewed: "Relatório visualizado",
  beta_request_created: "Pedido beta criado",
  report_generated: "Relatório gerado",
  report_link_sent: "Link do relatório enviado",
  feedback_requested: "Feedback pedido ao lead",
  feedback_started: "Feedback iniciado pelo lead",
  feedback_submitted: "Feedback submetido pelo lead",
  unlock_clicked: "CTA de desbloqueio clicado",
  pricing_option_clicked: "Opção de preço clicada",
  module_visibility_published: "Visibilidade publicada",
  request_status_changed: "Estado do pedido alterado",
  pricing_clicked: "Preço clicado",
  public_report_link_copied: "Link público copiado",
  lead_status_changed: "Estado comercial alterado",
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

// ── Main component ──────────────────────────────────────────────

/** Statuses that allow triggering a fresh report generation. */
const GENERATABLE_STATUSES = ["approved", "pending_review", "failed"] as const;

export function LeadDetailSheet({ open, onOpenChange, lead, onUpdate, onRefresh }: LeadDetailSheetProps) {
  const [notesText, setNotesText] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sendLinkOpen, setSendLinkOpen] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  // Reset state when lead changes
  useEffect(() => {
    if (lead) {
      setNotesText(lead.internal_notes ?? "");
      setNotesDirty(false);
    }
  }, [lead?.id]);

  // Fetch timeline on open
  useEffect(() => {
    if (!open || !lead) {
      setTimeline([]);
      return;
    }

    setTimelineLoading(true);
    fetch(`/api/admin/lead-timeline/${lead.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => setTimeline(json.events ?? []))
      .catch(() => setTimeline([]))
      .finally(() => setTimelineLoading(false));
  }, [open, lead?.id]);

  if (!lead) return null;

  const intent = deriveIntentSignal(lead);
  const suggestedStep = suggestNextLeadAction(lead).label;
  const columnDef = KANBAN_COLUMNS.find((c) => c.key === lead.commercial_status);

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

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[520px] overflow-y-auto p-0 scroll-smooth"
        style={columnDef ? { borderTop: `3px solid ${columnDef.color}` } : undefined}
      >
        <SheetDescription className="sr-only">
          Detalhes do lead {lead.name}
        </SheetDescription>

        {/* ── 1. Header ─────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4">
          <SheetTitle className="sr-only">Ficha de cliente</SheetTitle>

          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-3 min-w-0">
              {/* Avatar initials */}
              <div
                className="shrink-0 flex items-center justify-center rounded-full text-white font-semibold"
                style={{
                  width: 48,
                  height: 48,
                  fontSize: 16,
                  backgroundColor: columnDef?.color ?? "#534AB7",
                }}
              >
                {getInitials(lead.name || lead.email)}
              </div>
              <div className="min-w-0">
              <h2
                className="m-0 truncate text-admin-text-primary"
                style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}
              >
                {lead.name}
              </h2>
              <a
                href={`mailto:${lead.email}`}
                className="admin-body text-admin-text-secondary mt-1 truncate block hover:text-admin-text-primary transition-colors"
                title={lead.email}
              >
                {lead.email}
              </a>
              {lead.handle && (
                <a
                  href={`https://instagram.com/${lead.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-meta text-admin-text-tertiary mt-0.5 inline-flex items-center gap-1 hover:text-admin-text-primary transition-colors"
                >
                  <Instagram size={12} /> @{lead.handle}
                </a>
              )}
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

          <div className="flex flex-wrap items-center gap-2 mb-1">
            {lead.user_type && (
              <AdminBadge variant={USER_TYPE_ACCENT[lead.user_type.toLowerCase()] ?? "neutral"}>
                {USER_TYPE_LABEL[lead.user_type.toLowerCase()] ?? lead.user_type}
              </AdminBadge>
            )}
            {lead.company && (
              <span className="admin-meta text-admin-text-tertiary">
                {lead.company}
              </span>
            )}
          </div>

          <p className="admin-meta text-admin-text-tertiary mt-2">
            Criado {formatDate(lead.created_at)}{lead.contacted_at && ` · Contactado ${formatDate(lead.contacted_at)}`}
          </p>
        </div>

        <SectionDivider />

        {/* ── 2. KPI Strip ──────────────────────────────────── */}
        <div className="px-6 py-4">
          <div
            className="grid grid-cols-3 gap-3 rounded-xl p-3"
            style={{ backgroundColor: "rgba(44,44,42,0.04)" }}
          >
            <div className="text-center">
              <p className="admin-eyebrow-sm m-0 mb-1">Views</p>
              <p className="admin-code text-admin-text-primary m-0" style={{ fontSize: 18 }}>
                {lead.report_views}
              </p>
            </div>
            <div className="text-center" style={{ borderLeft: "1px solid rgba(44,44,42,0.08)", borderRight: "1px solid rgba(44,44,42,0.08)" }}>
              <p className="admin-eyebrow-sm m-0 mb-1">Custo</p>
              <p className="admin-code text-admin-text-primary m-0" style={{ fontSize: 18 }}>
                {lead.report_cost_usd != null ? `€${lead.report_cost_usd.toFixed(2)}` : "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="admin-eyebrow-sm m-0 mb-1">Idade</p>
              <p className="admin-code text-admin-text-primary m-0" style={{ fontSize: 18 }}>
                {daysSince(lead.created_at)}d
              </p>
            </div>
          </div>
        </div>

        <SectionDivider />

        {/* ── 3. Perfil ─────────────────────────────────────── */}
        <div className="px-6 py-5">
          <SectionTitle>Perfil</SectionTitle>

          {lead.profile_ownership && (
            <DetailRow label="Propriedade" icon={Shield}>{lead.profile_ownership}</DetailRow>
          )}
          {lead.purpose && (
            <DetailRow label="Objetivo" icon={Target}>{lead.purpose}</DetailRow>
          )}
          <DetailRow label="Origem" icon={Globe}>{lead.source}</DetailRow>
          <DetailRow label="Consentimento beta" icon={User}>
            {lead.beta_consent ? (
              <span className="inline-flex items-center gap-1 text-admin-revenue-700">
                <CheckCircle2 size={14} /> Sim
              </span>
            ) : (
              <span className="text-admin-text-tertiary">Não</span>
            )}
          </DetailRow>
        </div>

        <SectionDivider />

        {/* ── 4. Relatório ──────────────────────────────────── */}
        <div className="px-6 py-5">
          <SectionTitle>Relatório</SectionTitle>

          {/* Progress tracker */}
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

          {lead.handle && (
            <div className="flex gap-2 mt-4">
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
                onClick={() => setSendLinkOpen(true)}
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
          )}
        </div>

        <SectionDivider />

        {/* ── 5. Inteligência comercial ─────────────────────── */}
        <div className="px-6 py-5">
          <SectionTitle>Inteligência comercial</SectionTitle>

          <DetailRow label="Tipo de lead" icon={User}>
            {USER_TYPE_LABEL[lead.user_type?.toLowerCase() ?? ""] ?? "Desconhecido"}
          </DetailRow>
          <DetailRow label="Sinal de intenção" icon={Target}>
            <AdminBadge variant={intent.accent}>{intent.label}</AdminBadge>
          </DetailRow>

          <div
            className="mt-3 rounded-xl p-3.5 flex items-start gap-2.5"
            style={{
              backgroundColor: "rgba(83,74,183,0.06)",
              borderLeft: "3px solid rgba(83,74,183,0.4)",
            }}
          >
            <Lightbulb size={15} className="text-admin-text-tertiary shrink-0 mt-0.5" />
            <div>
            <p className="admin-eyebrow mb-1">Próximo passo sugerido</p>
            <p className="admin-body text-admin-text-primary font-medium m-0">
              {suggestedStep}
            </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="admin-eyebrow mb-2">Estado comercial</p>
            <Select value={lead.commercial_status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-10 text-[13px] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KANBAN_COLUMNS.map((col) => (
                  <SelectItem key={col.key} value={col.key} className="text-[13px]">
                    {col.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SectionDivider />

        {/* ── 6. Timeline ───────────────────────────────────── */}
        <TimelineSection
          timeline={timeline}
          loading={timelineLoading}
        />

        <SectionDivider />

        {/* ── 7. Notas & Ações ──────────────────────────────── */}
        <div className="px-6 py-5 pb-8">
          <SectionTitle>Notas e ações</SectionTitle>

          <Textarea
            value={notesText}
            onChange={(e) => {
              setNotesText(e.target.value);
              setNotesDirty(true);
            }}
            rows={4}
            placeholder="Notas internas sobre este lead..."
            className="text-[13px] mb-1"
          />
          <p className="admin-meta text-admin-text-tertiary mb-3 text-right">
            {notesText.length} caracteres
          </p>
          {notesDirty && (
            <Button size="sm" onClick={handleSaveNotes} className="mb-4">
              Guardar notas
            </Button>
          )}

          <div className="grid grid-cols-2 gap-2">
            {lead.handle && (
              <AdminActionButton
                size="md"
                onClick={() =>
                  window.open(`https://instagram.com/${lead.handle}`, "_blank")
                }
              >
                <Instagram size={14} /> Instagram
              </AdminActionButton>
            )}
            <AdminActionButton size="md" onClick={handleCopyEmail}>
              <Mail size={14} /> Copiar email
            </AdminActionButton>
            <AdminActionButton
              size="md"
              onClick={() => {
                window.open(`https://wa.me/?text=${encodeURIComponent(`Olá ${lead.name}!`)}`, "_blank");
              }}
            >
              <MessageCircle size={14} /> WhatsApp
            </AdminActionButton>
            <AdminActionButton size="md" onClick={handleMarkContacted}>
              <Phone size={14} /> Contactado
            </AdminActionButton>
            <AdminActionButton
              size="md"
              onClick={handleArchive}
              className="text-admin-danger-700 border-admin-danger-500/30 hover:bg-admin-danger-50"
            >
              <Archive size={14} /> Arquivar
            </AdminActionButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>

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
            credentials: "include",
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
      onConfirm={async () => {
        if (!lead.report_request_id) return;
        setSendingLink(true);
        try {
          const res = await fetch("/api/admin/send-report-link", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lead_id: lead.id,
              report_request_id: lead.report_request_id,
            }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok || !body.success) {
            toast.error(mapSendLinkError(body?.error_code));
          } else {
            toast.success("Link enviado por email");
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
          <div
            className="flex items-start gap-2 rounded-lg p-3 text-[13px]"
            style={{
              backgroundColor: "rgba(234,179,8,0.08)",
              border: "1px solid rgba(234,179,8,0.2)",
            }}
          >
            <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: "#D97706" }} />
            <div>
              <p className="font-medium" style={{ color: "#D97706" }}>Aviso de custo</p>
              <p className="mt-0.5 text-admin-text-secondary">
                Esta ação consome créditos Apify (~€0.05–0.10 por perfil).
                Verificar que o modo de execução está em <strong>Fresh</strong> e
                que o provider está ativo.
              </p>
            </div>
          </div>
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
}: {
  timeline: TimelineEvent[];
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const INITIAL_COUNT = 10;
  const visible = expanded ? timeline : timeline.slice(0, INITIAL_COUNT);

  return (
    <div className="px-6 py-5">
      <SectionTitle>Timeline</SectionTitle>

      {loading && (
        <div className="flex items-center gap-2 text-admin-text-tertiary admin-meta py-3">
          <Loader2 size={14} className="animate-spin" /> A carregar...
        </div>
      )}

      {!loading && timeline.length === 0 && (
        <p className="admin-meta text-admin-text-tertiary py-3">
          Sem eventos registados.
        </p>
      )}

      {!loading && timeline.length > 0 && (
        <div className="space-y-0">
          {visible.map((ev) => {
            const IconComp = EVENT_ICONS[ev.event_type] ?? Clock;
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
                  <p className="admin-body text-admin-text-primary m-0">
                    {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                  </p>
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