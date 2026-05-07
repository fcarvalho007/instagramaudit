/**
 * LeadDetailSheet — premium "ficha de cliente" slide-in drawer.
 *
 * Opens from kanban cards. 6 sections:
 *   1. Header — name, email, handle, user_type, status, date
 *   2. Perfil — ownership, purpose, source, consent
 *   3. Relatório — request/pdf status, views, cost, actions
 *   4. Inteligência comercial — intent, suggested step, status selector
 *   5. Timeline — product_events (on-demand fetch)
 *   6. Notas & Ações — notes editor, quick actions
 */

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { KANBAN_COLUMNS, type EnrichedLead } from "@/lib/admin/kanban-columns";

// ── Types ────────────────────────────────────────────────────────

interface LeadDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: EnrichedLead | null;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
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

function deriveSuggestedStep(lead: EnrichedLead): string {
  const s = lead.commercial_status;
  if (s === "novo_pedido") return "Aprovar pedido e gerar relatório";
  if (s === "em_analise") return "Aguardar geração do relatório";
  if (s === "relatorio_gerado") return "Aguardar visualização do relatório";
  if (s === "relatorio_visto") return "Enviar email de follow-up";
  if (s === "feedback_pedido") return "Aguardar resposta do lead";
  if (s === "interessado") return "Agendar chamada ou demo";
  if (s === "potencial_cliente") return "Enviar proposta comercial";
  if (s === "convertido") return "Configurar conta e onboarding";
  return "Sem ação sugerida";
}

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
      className="my-1"
      style={{
        height: 1,
        background: "linear-gradient(to right, rgba(44,44,42,0.12), transparent)",
      }}
    />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="admin-section-title mb-3">{children}</h3>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="admin-meta shrink-0">{label}</span>
      <span className="admin-body text-right">{children}</span>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────

export function LeadDetailSheet({ open, onOpenChange, lead, onUpdate }: LeadDetailSheetProps) {
  const [notesText, setNotesText] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

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
  const suggestedStep = deriveSuggestedStep(lead);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] overflow-y-auto p-0"
      >
        <SheetDescription className="sr-only">
          Detalhes do lead {lead.name}
        </SheetDescription>

        {/* ── 1. Header ─────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-5">
          <SheetTitle className="sr-only">Ficha de cliente</SheetTitle>

          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2
                className="admin-panel-title m-0 truncate text-admin-text-primary"
              >
                {lead.name}
              </h2>
              <p className="admin-body text-admin-text-secondary mt-1 truncate">
                {lead.email}
              </p>
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

          <div className="flex flex-wrap items-center gap-2">
            {lead.handle && (
              <span className="admin-body text-admin-text-primary font-medium">
                @{lead.handle}
              </span>
            )}
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
            Criado {formatDate(lead.created_at)}
          </p>
        </div>

        <SectionDivider />

        {/* ── 2. Perfil ─────────────────────────────────────── */}
        <div className="px-6 py-5">
          <SectionTitle>Perfil</SectionTitle>

          {lead.handle && (
            <DetailRow label="Handle">@{lead.handle}</DetailRow>
          )}
          {lead.profile_ownership && (
            <DetailRow label="Propriedade">{lead.profile_ownership}</DetailRow>
          )}
          {lead.purpose && (
            <DetailRow label="Objetivo">{lead.purpose}</DetailRow>
          )}
          <DetailRow label="Origem">{lead.source}</DetailRow>
          <DetailRow label="Consentimento beta">
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

        {/* ── 3. Relatório ──────────────────────────────────── */}
        <div className="px-6 py-5">
          <SectionTitle>Relatório</SectionTitle>

          <div className="flex flex-wrap gap-2 mb-3">
            {lead.report_status && (
              <AdminBadge variant={STATUS_ACCENT[lead.report_status] ?? "neutral"}>
                {lead.report_status}
              </AdminBadge>
            )}
            {lead.pdf_status && lead.pdf_status !== "not_generated" && (
              <AdminBadge variant={STATUS_ACCENT[lead.pdf_status] ?? "neutral"}>
                PDF: {lead.pdf_status}
              </AdminBadge>
            )}
          </div>

          <DetailRow label="Visualizações">
            <span className="font-mono">{lead.report_views}</span>
          </DetailRow>
          {lead.report_cost_usd != null && (
            <DetailRow label="Custo estimado">
              <span className="font-mono">€{lead.report_cost_usd.toFixed(2)}</span>
            </DetailRow>
          )}
          <DetailRow label="Última interação">
            {formatDate(lead.last_interaction)}
          </DetailRow>
          {lead.contacted_at && (
            <DetailRow label="Contactado">
              {formatDate(lead.contacted_at)}
            </DetailRow>
          )}

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
            </div>
          )}
        </div>

        <SectionDivider />

        {/* ── 4. Inteligência comercial ─────────────────────── */}
        <div className="px-6 py-5">
          <SectionTitle>Inteligência comercial</SectionTitle>

          <DetailRow label="Tipo de lead">
            {USER_TYPE_LABEL[lead.user_type?.toLowerCase() ?? ""] ?? "Desconhecido"}
          </DetailRow>
          <DetailRow label="Sinal de intenção">
            <AdminBadge variant={intent.accent}>{intent.label}</AdminBadge>
          </DetailRow>

          <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: "rgba(83,74,183,0.06)" }}>
            <p className="admin-eyebrow mb-1.5">Próximo passo sugerido</p>
            <p className="admin-body text-admin-text-primary font-medium">
              {suggestedStep}
            </p>
          </div>

          <div className="mt-4">
            <p className="admin-eyebrow mb-2">Estado comercial</p>
            <Select value={lead.commercial_status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-9 text-[13px] rounded-lg">
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

        {/* ── 5. Timeline ───────────────────────────────────── */}
        <div className="px-6 py-5">
          <SectionTitle>Timeline</SectionTitle>

          {timelineLoading && (
            <div className="flex items-center gap-2 text-admin-text-tertiary admin-meta py-3">
              <Loader2 size={14} className="animate-spin" /> A carregar...
            </div>
          )}

          {!timelineLoading && timeline.length === 0 && (
            <p className="admin-meta text-admin-text-tertiary py-3">
              Sem eventos registados.
            </p>
          )}

          {!timelineLoading && timeline.length > 0 && (
            <div className="space-y-0">
              {timeline.slice(0, 20).map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 py-2"
                  style={{ borderBottom: "1px solid rgba(44,44,42,0.06)" }}
                >
                  <div
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: "rgb(var(--admin-leads-500))" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="admin-body text-admin-text-primary m-0">
                      {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                    </p>
                    <p className="admin-meta text-admin-text-tertiary m-0 mt-0.5">
                      {formatDate(ev.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <SectionDivider />

        {/* ── 6. Notas & Ações ──────────────────────────────── */}
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
            className="text-[13px] mb-3"
          />
          {notesDirty && (
            <Button size="sm" onClick={handleSaveNotes} className="mb-4">
              Guardar notas
            </Button>
          )}

          <div className="flex flex-wrap gap-2">
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
  );
}