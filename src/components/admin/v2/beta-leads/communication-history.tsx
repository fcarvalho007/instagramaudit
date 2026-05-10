import { useState } from "react";
import {
  Loader2,
  Mail,
  MessageCircle,
  Eye,
  FileText,
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────

export interface CommunicationTimelineEvent {
  id: string;
  event_type: string;
  handle: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

type BadgeKind = "sent" | "failed" | "received" | "opened" | "submitted";

interface EventConfig {
  label: string;
  badgeKind: BadgeKind;
  icon: typeof Eye;
}

// ── Mapping ───────────────────────────────────────────────────────

const EVENT_CONFIG: Record<string, EventConfig> = {
  beta_request_created: {
    label: "Pedido recebido",
    badgeKind: "received",
    icon: FileText,
  },
  report_link_sent: {
    label: "Link do relatório enviado",
    badgeKind: "sent",
    icon: Mail,
  },
  feedback_requested: {
    label: "Pedido de feedback enviado",
    badgeKind: "sent",
    icon: Mail,
  },
  report_viewed: {
    label: "Relatório aberto pelo lead",
    badgeKind: "opened",
    icon: Eye,
  },
  feedback_started: {
    label: "Formulário de feedback iniciado",
    badgeKind: "opened",
    icon: MessageCircle,
  },
  feedback_submitted: {
    label: "Feedback submetido",
    badgeKind: "submitted",
    icon: CheckCircle2,
  },
  email_failed: {
    label: "Falha no envio de email",
    badgeKind: "failed",
    icon: AlertCircle,
  },
  email_bounced: {
    label: "Email devolvido",
    badgeKind: "failed",
    icon: AlertCircle,
  },
};

const COMMUNICATION_TYPES = new Set(Object.keys(EVENT_CONFIG));

const BADGE_LABEL: Record<BadgeKind, string> = {
  sent: "Enviado",
  failed: "Falhou",
  received: "Recebido",
  opened: "Aberto",
  submitted: "Submetido",
};

// Map BadgeKind → admin token base name (rgb triplet variable).
const BADGE_TOKEN: Record<BadgeKind, string> = {
  sent: "--admin-revenue-500",
  failed: "--admin-danger-500",
  received: "--admin-info-500",
  opened: "--admin-signal-500",
  submitted: "--admin-leads-500",
};

// ── Helpers ───────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function shortId(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

/** Collapse consecutive `report_viewed` events into one with grouped_count. */
function groupConsecutiveViews(
  events: CommunicationTimelineEvent[],
): CommunicationTimelineEvent[] {
  const out: CommunicationTimelineEvent[] = [];
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

// ── Components ────────────────────────────────────────────────────

function StatusBadge({ kind }: { kind: BadgeKind }) {
  const token = BADGE_TOKEN[kind];
  return (
    <span
      className="admin-meta inline-flex items-center rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap"
      style={{
        backgroundColor: `rgb(var(${token}) / 0.12)`,
        color: `rgb(var(${token}))`,
      }}
    >
      {BADGE_LABEL[kind]}
    </span>
  );
}

export function CommunicationHistory({
  timeline,
  loading,
}: {
  timeline: CommunicationTimelineEvent[];
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const filtered = timeline.filter((ev) =>
    COMMUNICATION_TYPES.has(ev.event_type),
  );
  // Endpoint devolve ordem DESC (mais recente primeiro). A colapsagem de
  // `report_viewed` agrupa runs consecutivos independentemente da direção.
  const events = groupConsecutiveViews(filtered);

  const INITIAL_COUNT = 10;
  const visible = expanded ? events : events.slice(0, INITIAL_COUNT);

  // Stats agregados (apenas após filtragem/colapsagem).
  const stats = events.reduce(
    (acc, ev) => {
      const kind = EVENT_CONFIG[ev.event_type]?.badgeKind;
      if (kind === "sent") acc.sent += 1;
      if (kind === "opened") acc.opened += 1;
      if (kind === "submitted") acc.submitted += 1;
      return acc;
    },
    { sent: 0, opened: 0, submitted: 0 },
  );

  const handleCopyId = (id: string) => {
    void navigator.clipboard
      .writeText(id)
      .then(() => toast.success("ID copiado"))
      .catch(() => toast.error("Não foi possível copiar"));
  };

  return (
    <div className="px-6 py-5">
      <h3 className="admin-section-title mb-3">Comunicação</h3>

      {loading && (
        <div className="flex items-center gap-2 text-admin-text-tertiary admin-meta py-3">
          <Loader2 size={14} className="animate-spin" /> A carregar...
        </div>
      )}

      {!loading && events.length === 0 && (
        <p className="admin-meta text-admin-text-tertiary py-3">
          Sem comunicações registadas para este lead.
        </p>
      )}

      {!loading && events.length > 0 && (
        <div className="space-y-0">
          <p className="admin-meta text-admin-text-tertiary mb-2">
            Enviados: {stats.sent} · Aberturas: {stats.opened} · Submissões:{" "}
            {stats.submitted}
          </p>
          {visible.map((ev) => {
            const cfg = EVENT_CONFIG[ev.event_type];
            const IconComp = cfg?.icon ?? Clock;
            const recipient =
              typeof ev.metadata?.recipient === "string"
                ? (ev.metadata.recipient as string)
                : null;
            const messageId =
              typeof ev.metadata?.message_id === "string"
                ? (ev.metadata.message_id as string)
                : null;
            const groupedCount =
              typeof ev.metadata?.grouped_count === "number"
                ? (ev.metadata.grouped_count as number)
                : null;
            const errorCode =
              typeof ev.metadata?.error_code === "string"
                ? (ev.metadata.error_code as string)
                : null;
            const publicUrl =
              typeof ev.metadata?.public_url === "string"
                ? (ev.metadata.public_url as string)
                : typeof ev.metadata?.feedback_url === "string"
                  ? (ev.metadata.feedback_url as string)
                  : null;

            return (
              <div
                key={ev.id}
                className="flex items-start gap-3 py-2.5"
                style={
                  visible.indexOf(ev) < visible.length - 1
                    ? { borderBottom: "1px solid rgba(44,44,42,0.06)" }
                    : undefined
                }
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
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="admin-body text-admin-text-primary m-0 flex items-center gap-2 min-w-0">
                      <span className="truncate">{cfg?.label ?? ev.event_type}</span>
                      {groupedCount && groupedCount > 1 ? (
                        <span
                          className="admin-meta text-admin-text-tertiary rounded-full px-2 py-0.5 shrink-0"
                          style={{ backgroundColor: "rgba(44,44,42,0.06)" }}
                        >
                          ×{groupedCount}
                        </span>
                      ) : null}
                    </p>
                    {cfg ? <StatusBadge kind={cfg.badgeKind} /> : null}
                  </div>

                  {recipient ? (
                    <p className="admin-meta text-admin-text-secondary m-0 mt-0.5 truncate">
                      Para: {recipient}
                    </p>
                  ) : null}

                  {messageId ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="admin-code text-admin-text-tertiary">
                        ID: {shortId(messageId)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyId(messageId)}
                        className="text-admin-text-tertiary hover:text-admin-text-primary transition-colors"
                        aria-label="Copiar ID"
                        title="Copiar ID"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  ) : null}

                  {errorCode ? (
                    <p
                      className="admin-code m-0 mt-0.5"
                      style={{ color: "rgb(var(--admin-danger-700))" }}
                    >
                      Erro: {errorCode}
                    </p>
                  ) : null}

                  {publicUrl ? (
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-meta inline-flex items-center gap-1 mt-0.5 hover:underline"
                      style={{ color: "rgb(var(--admin-info-700))" }}
                    >
                      Abrir link <ExternalLink size={12} />
                    </a>
                  ) : null}

                  <p className="admin-meta text-admin-text-tertiary m-0 mt-0.5">
                    {relativeTime(ev.created_at)} · {formatDate(ev.created_at)}
                  </p>
                </div>
              </div>
            );
          })}

          {events.length > INITIAL_COUNT && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="admin-meta text-admin-text-secondary hover:text-admin-text-primary flex items-center gap-1 pt-2 transition-colors"
            >
              <ChevronDown size={13} /> Ver mais {events.length - INITIAL_COUNT}{" "}
              eventos
            </button>
          )}
        </div>
      )}
    </div>
  );
}