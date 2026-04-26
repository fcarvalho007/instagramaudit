import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/admin/fetch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DeliveryStatusBadge,
  PdfStatusBadge,
  RequestStatusBadge,
} from "./status-badge";

interface DetailRow {
  id: string;
  instagram_username: string;
  request_status: string;
  pdf_status: string;
  delivery_status: string;
  pdf_storage_path: string | null;
  pdf_generated_at: string | null;
  pdf_error_message: string | null;
  email_sent_at: string | null;
  email_message_id: string | null;
  email_error_message: string | null;
  analysis_snapshot_id: string | null;
  competitor_usernames: unknown;
  metadata: unknown;
  is_free_request: boolean;
  request_month: string;
  request_source: string;
  created_at: string;
  updated_at: string;
  lead: {
    id: string;
    name: string | null;
    email: string | null;
    company: string | null;
    created_at: string;
  } | null;
}

interface RequestDetailSheetProps {
  reportRequestId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-content-tertiary">
        {label}
      </p>
      <div className="text-sm text-content-primary">{children}</div>
    </div>
  );
}

export function RequestDetailSheet({
  reportRequestId,
  onClose,
  onChanged,
}: RequestDetailSheetProps) {
  const [row, setRow] = useState<DetailRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"pdf" | "email" | null>(null);

  useEffect(() => {
    if (!reportRequestId) {
      setRow(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminFetch(`/api/admin/report-requests/${reportRequestId}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          row?: DetailRow;
          message?: string;
        };
        if (!res.ok || !body.success || !body.row) {
          throw new Error(body.message ?? "Não foi possível carregar o pedido.");
        }
        if (!cancelled) setRow(body.row);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro inesperado.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportRequestId]);

  async function reload() {
    if (!reportRequestId) return;
    const res = await adminFetch(`/api/admin/report-requests/${reportRequestId}`);
    const body = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      row?: DetailRow;
    };
    if (res.ok && body.success && body.row) setRow(body.row);
  }

  async function handleRegeneratePdf() {
    if (!reportRequestId) return;
    setActionLoading("pdf");
    try {
      const res = await adminFetch("/api/admin/regenerate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_request_id: reportRequestId }),
      });
      const body = (await res.json().catch(() => ({}))) as { success?: boolean };
      if (res.ok && body.success) {
        toast.success("PDF regenerado com sucesso.");
        await reload();
        onChanged();
      } else {
        toast.error("Não foi possível regenerar o PDF.");
        await reload();
      }
    } catch {
      toast.error("Erro de rede ao regenerar o PDF.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResendEmail() {
    if (!reportRequestId) return;
    setActionLoading("email");
    try {
      const res = await adminFetch("/api/admin/resend-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_request_id: reportRequestId }),
      });
      const body = (await res.json().catch(() => ({}))) as { success?: boolean };
      if (res.ok && body.success) {
        toast.success("Email reenviado com sucesso.");
        await reload();
        onChanged();
      } else {
        toast.error("O envio do email falhou.");
        await reload();
      }
    } catch {
      toast.error("Erro de rede ao reenviar o email.");
    } finally {
      setActionLoading(null);
    }
  }

  function copy(value: string | null, label: string) {
    if (!value) return;
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`${label} copiado.`))
      .catch(() => toast.error("Não foi possível copiar."));
  }

  return (
    <Sheet
      open={Boolean(reportRequestId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Detalhes do pedido</SheetTitle>
          <SheetDescription>
            Inspecionar e recuperar manualmente um pedido de relatório.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loading ? (
            <p className="text-sm text-content-secondary">A carregar…</p>
          ) : error ? (
            <p className="text-sm text-signal-danger">{error}</p>
          ) : row ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <RequestStatusBadge value={row.request_status} />
                <PdfStatusBadge value={row.pdf_status} />
                <DeliveryStatusBadge value={row.delivery_status} />
                {row.is_free_request ? (
                  <span className="rounded-md border border-border-subtle bg-surface-base px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-content-tertiary">
                    Gratuito
                  </span>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Username">@{row.instagram_username}</Field>
                <Field label="Origem">{row.request_source}</Field>
                <Field label="Criado em">{formatDate(row.created_at)}</Field>
                <Field label="Atualizado em">{formatDate(row.updated_at)}</Field>
                <Field label="Mês do pedido">{row.request_month}</Field>
                <Field label="ID do pedido">
                  <button
                    type="button"
                    className="font-mono text-xs text-accent-luminous hover:underline"
                    onClick={() => copy(row.id, "ID do pedido")}
                  >
                    {row.id}
                  </button>
                </Field>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-content-tertiary">
                  Lead
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome">{row.lead?.name ?? "—"}</Field>
                  <Field label="Email">{row.lead?.email ?? "—"}</Field>
                  <Field label="Empresa">{row.lead?.company ?? "—"}</Field>
                  <Field label="Lead criado em">
                    {formatDate(row.lead?.created_at ?? null)}
                  </Field>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-content-tertiary">
                  Snapshot
                </h3>
                <Field label="ID do snapshot">
                  {row.analysis_snapshot_id ? (
                    <button
                      type="button"
                      className="font-mono text-xs text-accent-luminous hover:underline"
                      onClick={() => copy(row.analysis_snapshot_id, "ID do snapshot")}
                    >
                      {row.analysis_snapshot_id}
                    </button>
                  ) : (
                    "—"
                  )}
                </Field>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-content-tertiary">
                  PDF
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Gerado em">{formatDate(row.pdf_generated_at)}</Field>
                  <Field label="Caminho">
                    <span className="break-all font-mono text-xs text-content-secondary">
                      {row.pdf_storage_path ?? "—"}
                    </span>
                  </Field>
                </div>
                {row.pdf_error_message ? (
                  <Field label="Erro PDF">
                    <span className="text-signal-danger">{row.pdf_error_message}</span>
                  </Field>
                ) : null}
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-content-tertiary">
                  Email
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Enviado em">{formatDate(row.email_sent_at)}</Field>
                  <Field label="Message ID">
                    <span className="break-all font-mono text-xs text-content-secondary">
                      {row.email_message_id ?? "—"}
                    </span>
                  </Field>
                </div>
                {row.email_error_message ? (
                  <Field label="Erro email">
                    <span className="text-signal-danger">{row.email_error_message}</span>
                  </Field>
                ) : null}
              </div>

              <Separator />

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleRegeneratePdf}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "pdf" ? "A regenerar…" : "Regenerar PDF"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={actionLoading !== null || row.pdf_status !== "ready"}
                >
                  {actionLoading === "email" ? "A enviar…" : "Reenviar email"}
                </Button>
              </div>
              {row.pdf_status !== "ready" ? (
                <p className="text-xs text-content-tertiary">
                  O envio de email só fica disponível após o PDF estar pronto.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
