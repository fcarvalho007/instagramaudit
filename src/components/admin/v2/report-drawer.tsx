/**
 * ReportDrawer — drawer slide-in da direita com o detalhe completo de um
 * relatório (admin v2).
 *
 * Estrutura:
 *   1. Cabeçalho — id, origem, perfil, cliente, datas, badge status, custo
 *   2. Phases — 4 mini-KPIs (Pedido / Análise Apify / PDF / Email)
 *   3. Custos — tabela apify / openai / outros / total
 *   4. Timeline — eventos com timestamp mono
 *   5. Acções — re-enviar email / re-gerar PDF / abrir report / investigar
 *   6. Snapshot — JSON colapsado (preview do `normalized_payload`)
 *
 * Acções operacionais usam stubs em `report-actions.client.ts` (UI honesta:
 * confirmação + spinner + toast) — quando os endpoints reais existirem,
 * basta trocar os stubs.
 */

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Send,
  X as XIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AdminBadge } from "./admin-badge";
import { AdminActionButton } from "./admin-action-button";
import { ConfirmDialog } from "./confirm-dialog";
import { ErrorInvestigationModal } from "./error-investigation-modal";
import {
  getMockReportDetail,
  type MockReportDetail,
  type ReportPhase,
  type ReportEvent,
  type ReportStatus,
} from "@/lib/admin/mock-data";
import {
  regenerateReportPdf,
  resendReportEmail,
  retryReportFull,
} from "@/lib/admin/report-actions.client";

interface ReportDrawerProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  reportId: string | null;
}

type AdminActionLog = {
  ts: string;
  action: "resend_email" | "regenerate_pdf" | "retry_full";
  result: "success" | "failure";
};

const ACTION_LABEL: Record<AdminActionLog["action"], string> = {
  resend_email: "Re-enviou email",
  regenerate_pdf: "Re-gerou PDF",
  retry_full: "Re-tentou pedido completo",
};

export function ReportDrawer({ open, onOpenChange, reportId }: ReportDrawerProps) {
  const detail = useMemo<MockReportDetail | null>(
    () => (reportId ? getMockReportDetail(reportId) : null),
    [reportId],
  );

  // Histórico de acções fica em memória de sessão. TODO: quando existir a
  // tabela `report_actions`, substituir este state por fetch + insert real.
  const [actionLog, setActionLog] = useState<AdminActionLog[]>([]);
  useEffect(() => {
    // Reset quando abre noutro report.
    setActionLog([]);
  }, [reportId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full !max-w-[640px] overflow-y-auto border-l-admin-border bg-admin-surface p-0"
      >
        {/* Títulos sr-only para acessibilidade Radix. */}
        <SheetTitle className="sr-only">
          Detalhe do relatório {detail?.id ?? ""}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Vista detalhada com fases, custos, timeline e acções administrativas.
        </SheetDescription>

        {detail ? (
          <DrawerBody
            detail={detail}
            actionLog={actionLog}
            onLogAction={(entry) => setActionLog((prev) => [entry, ...prev])}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({
  detail,
  actionLog,
  onLogAction,
}: {
  detail: MockReportDetail;
  actionLog: AdminActionLog[];
  onLogAction: (entry: AdminActionLog) => void;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <DrawerHeader detail={detail} />
      <div className="flex flex-col gap-7 px-6 py-6">
        <PhasesGrid phases={detail.phases} />
        <CostsTable costs={detail.costs} status={detail.status} />
        <EventsTimeline events={detail.events} />
        <ActionsBar
          detail={detail}
          onLogAction={onLogAction}
        />
        <AuditSection log={actionLog} />
        <SnapshotAccordion snapshot={detail.snapshotPreview} />
      </div>
    </div>
  );
}

function DrawerHeader({ detail }: { detail: MockReportDetail }) {
  return (
    <header className="border-b border-admin-border px-6 pb-5 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="admin-eyebrow m-0 text-admin-text-tertiary">
            Pedido · {detail.origin === "subscription" ? "subscrição" : "avulso"}
          </p>
          <h2 className="mt-1 mb-0 font-mono text-[18px] font-medium text-admin-text-primary">
            #{detail.id}
          </h2>
          <p className="m-0 mt-1 text-[13px] text-admin-text-secondary">
            {detail.handle} · {detail.customer.name}
          </p>
          <p className="m-0 mt-0.5 text-[11px] text-admin-text-tertiary">
            {detail.customer.email}
          </p>
        </div>
        <StatusBadge status={detail.status} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-admin-text-secondary">
        <Meta label="Iniciado">{detail.startedAtLabel}</Meta>
        {detail.deliveredAtLabel ? (
          <Meta label="Entregue">{detail.deliveredAtLabel}</Meta>
        ) : null}
        {detail.totalDurationLabel ? (
          <Meta label="Duração">{detail.totalDurationLabel}</Meta>
        ) : null}
        {detail.totalCost ? <Meta label="Custo">{detail.totalCost}</Meta> : null}
      </div>
    </header>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-admin-text-tertiary">{label}</span>
      <span className="font-mono text-admin-text-primary">{children}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  if (status === "delivered") return <AdminBadge variant="revenue">entregue</AdminBadge>;
  if (status === "processing")
    return (
      <AdminBadge variant="signal" className="gap-1">
        <Loader2 size={10} strokeWidth={2.25} className="animate-spin" />
        a processar
      </AdminBadge>
    );
  if (status === "queued") return <AdminBadge variant="info">em fila</AdminBadge>;
  return <AdminBadge variant="danger">falhou</AdminBadge>;
}

function PhasesGrid({ phases }: { phases: ReportPhase[] }) {
  return (
    <section>
      <h3 className="m-0 mb-3 text-[13px] font-medium text-admin-text-primary">
        Estado e timing
      </h3>
      <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4">
        {phases.map((p) => (
          <li
            key={p.name}
            className="flex flex-col gap-1.5 rounded-md border border-admin-border bg-[var(--color-admin-surface-muted)] px-3 py-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-admin-text-secondary">{p.name}</span>
              <PhaseIcon status={p.status} />
            </div>
            <span className="font-mono text-[12px] text-admin-text-primary">
              {p.timestamp ?? "—"}
            </span>
            {p.durationMs != null ? (
              <span className="text-[11px] text-admin-text-tertiary">
                {(p.durationMs / 1000).toFixed(1)}s
              </span>
            ) : (
              <span className="text-[11px] text-admin-text-tertiary">
                {p.status === "queued" ? "em fila" : p.status === "running" ? "em curso" : "—"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PhaseIcon({ status }: { status: ReportPhase["status"] }) {
  if (status === "done")
    return <Check size={14} strokeWidth={2.25} className="text-admin-revenue-700" />;
  if (status === "running")
    return <Loader2 size={14} strokeWidth={2.25} className="animate-spin text-admin-leads-500" />;
  if (status === "failed")
    return <XIcon size={14} strokeWidth={2.25} className="text-admin-danger-500" />;
  return (
    <span
      aria-hidden="true"
      className="inline-block h-2.5 w-2.5 rounded-full border border-admin-border"
    />
  );
}

function CostsTable({
  costs,
  status,
}: {
  costs: MockReportDetail["costs"];
  status: ReportStatus;
}) {
  const total = costs.apify + costs.openai + costs.other;
  const fmt = (v: number) => `$${v.toFixed(3)}`;

  return (
    <section>
      <h3 className="m-0 mb-3 text-[13px] font-medium text-admin-text-primary">
        Custos detalhados
      </h3>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="text-admin-text-tertiary">
            <th className="admin-eyebrow border-b border-admin-border py-2 text-left font-normal">
              Serviço
            </th>
            <th className="admin-eyebrow border-b border-admin-border py-2 text-right font-normal">
              Custo
            </th>
          </tr>
        </thead>
        <tbody>
          <CostRow label="Apify" value={fmt(costs.apify)} />
          <CostRow label="OpenAI" value={fmt(costs.openai)} />
          <CostRow label="Outros (PDF/email)" value={fmt(costs.other)} />
        </tbody>
        <tfoot>
          <tr>
            <td className="border-t border-admin-border py-2.5 font-medium text-admin-text-primary">
              Total {status === "failed" ? "(parcial)" : ""}
            </td>
            <td className="border-t border-admin-border py-2.5 text-right font-mono font-medium text-admin-text-primary">
              {fmt(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-2 text-admin-text-secondary">{label}</td>
      <td className="py-2 text-right font-mono text-admin-text-primary">{value}</td>
    </tr>
  );
}

function EventsTimeline({ events }: { events: ReportEvent[] }) {
  const toneColor: Record<ReportEvent["tone"], string> = {
    info: "var(--color-admin-leads-500)",
    success: "var(--color-admin-revenue-700)",
    warning: "var(--color-admin-expense-700)",
    danger: "var(--color-admin-danger-500)",
  };
  return (
    <section>
      <h3 className="m-0 mb-3 text-[13px] font-medium text-admin-text-primary">
        Histórico de eventos
      </h3>
      <ol
        className="m-0 list-none p-0"
        style={{ paddingLeft: 22 }}
      >
        <span
          aria-hidden="true"
          className="absolute"
          style={{
            width: 1,
            background: "var(--color-admin-border)",
          }}
        />
        {events.map((ev, i) => (
          <li
            key={`${ev.timestamp}-${i}`}
            className="relative"
            style={{ marginBottom: i === events.length - 1 ? 0 : 12 }}
          >
            <span
              aria-hidden="true"
              className="absolute"
              style={{
                left: -22,
                top: 5,
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: toneColor[ev.tone],
                boxShadow: "0 0 0 2px var(--admin-bg-canvas)",
              }}
            />
            <div className="flex items-baseline gap-2">
              <span className="shrink-0 font-mono text-[11px] text-admin-text-tertiary">
                {ev.timestamp}
              </span>
              <span className="text-[12px] text-admin-text-primary">{ev.message}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ActionsBar({
  detail,
  onLogAction,
}: {
  detail: MockReportDetail;
  onLogAction: (entry: AdminActionLog) => void;
}) {
  const [confirmKind, setConfirmKind] = useState<
    null | "resend" | "regenerate"
  >(null);
  const [errorOpen, setErrorOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isFailed = detail.status === "failed";
  const isDelivered = detail.status === "delivered";

  function nowLabel() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  async function performAction(kind: "resend" | "regenerate") {
    setBusy(true);
    try {
      const result =
        kind === "resend"
          ? await resendReportEmail(detail.id)
          : await regenerateReportPdf(detail.id);
      if (result.ok) {
        onLogAction({
          ts: nowLabel(),
          action: kind === "resend" ? "resend_email" : "regenerate_pdf",
          result: "success",
        });
        toast.success(
          kind === "resend"
            ? `Email reenviado para ${detail.customer.email}`
            : "PDF regenerado com sucesso",
        );
      } else {
        onLogAction({
          ts: nowLabel(),
          action: kind === "resend" ? "resend_email" : "regenerate_pdf",
          result: "failure",
        });
        toast.error(`Falhou: ${result.error}`);
      }
    } finally {
      setBusy(false);
      setConfirmKind(null);
    }
  }

  async function performRetry(): Promise<void> {
    const result = await retryReportFull(detail.id);
    if (result.ok) {
      onLogAction({
        ts: nowLabel(),
        action: "retry_full",
        result: "success",
      });
      toast.success("Pedido re-enfileirado para nova tentativa");
      setErrorOpen(false);
    } else {
      onLogAction({
        ts: nowLabel(),
        action: "retry_full",
        result: "failure",
      });
      toast.error(`Falhou: ${result.error}`);
    }
  }

  return (
    <section>
      <h3 className="m-0 mb-3 text-[13px] font-medium text-admin-text-primary">
        Acções administrativas
      </h3>
      <div className="flex flex-wrap gap-2">
        {isDelivered ? (
          <AdminActionButton
            size="md"
            onClick={() => setConfirmKind("resend")}
            className="!border-admin-revenue-500 !bg-admin-revenue-500 !text-white hover:!bg-admin-revenue-700"
          >
            <Send size={14} strokeWidth={1.75} aria-hidden="true" />
            Re-enviar email
          </AdminActionButton>
        ) : null}
        {(isDelivered || isFailed) ? (
          <AdminActionButton
            size="md"
            onClick={() => setConfirmKind("regenerate")}
          >
            <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
            Re-gerar PDF
          </AdminActionButton>
        ) : null}
        <a
          href="/report/example"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-admin-border bg-admin-surface px-3 text-[12px] font-medium text-admin-text-secondary transition-colors hover:border-admin-border-strong hover:text-admin-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-leads-500"
        >
          <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
          Ver no /report/example
        </a>
        {isFailed ? (
          <AdminActionButton
            size="md"
            onClick={() => setErrorOpen(true)}
            className="!border-admin-danger-500 !text-admin-danger-500 hover:!bg-[var(--color-admin-surface-muted)]"
          >
            <AlertCircle size={14} strokeWidth={1.75} aria-hidden="true" />
            Investigar erro
          </AdminActionButton>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmKind === "resend"}
        onOpenChange={(o) => !o && setConfirmKind(null)}
        title="Reenviar email?"
        description={
          <>
            O email com o relatório <span className="font-mono">#{detail.id}</span>{" "}
            será reenviado para <strong>{detail.customer.email}</strong>.
          </>
        }
        confirmLabel="Reenviar"
        loading={busy}
        onConfirm={() => performAction("resend")}
      />
      <ConfirmDialog
        open={confirmKind === "regenerate"}
        onOpenChange={(o) => !o && setConfirmKind(null)}
        title="Re-gerar PDF?"
        description={
          <>
            O PDF de <span className="font-mono">#{detail.id}</span> será
            substituído. Não envia email.
          </>
        }
        confirmLabel="Re-gerar"
        loading={busy}
        onConfirm={() => performAction("regenerate")}
      />
      <ErrorInvestigationModal
        open={errorOpen}
        onOpenChange={setErrorOpen}
        detail={detail}
        onRetry={performRetry}
      />
    </section>
  );
}

function AuditSection({ log }: { log: AdminActionLog[] }) {
  if (log.length === 0) return null;
  return (
    <section>
      <details className="group rounded-md border border-admin-border bg-[var(--color-admin-surface-muted)] px-4 py-3">
        <summary className="cursor-pointer list-none text-[12px] font-medium text-admin-text-primary marker:hidden">
          Histórico de acções desta sessão · {log.length}
        </summary>
        <ul className="m-0 mt-3 list-none space-y-1.5 p-0">
          {log.map((entry, i) => (
            <li
              key={i}
              className="flex items-baseline gap-2 text-[11px]"
            >
              <span className="font-mono text-admin-text-tertiary">{entry.ts}</span>
              <span className="text-admin-text-primary">
                {ACTION_LABEL[entry.action]}
              </span>
              <span
                className={
                  entry.result === "success"
                    ? "text-admin-revenue-700"
                    : "text-admin-danger-500"
                }
              >
                · {entry.result === "success" ? "ok" : "falha"}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function SnapshotAccordion({ snapshot }: { snapshot: Record<string, unknown> }) {
  return (
    <section>
      <details className="group rounded-md border border-admin-border bg-[var(--color-admin-surface-muted)] px-4 py-3">
        <summary className="cursor-pointer list-none text-[12px] font-medium text-admin-text-primary marker:hidden">
          Ver dados do snapshot original
        </summary>
        <pre className="m-0 mt-3 max-h-72 overflow-auto rounded-md border border-admin-border bg-admin-surface p-3 font-mono text-[11px] leading-relaxed text-admin-text-secondary">
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      </details>
    </section>
  );
}