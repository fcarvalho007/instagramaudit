/**
 * ErrorInvestigationModal — modal de diagnóstico para reports falhados.
 *
 * Mostra código de erro, mensagem, stack trace e resposta HTTP do provedor.
 * Botão "Re-tentar pedido completo" delega no callback `onRetry` (stub
 * client-side enquanto o backend não existir — ver `report-actions.ts`).
 */

import { Loader2 } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminActionButton } from "./admin-action-button";
import type { MockReportDetail } from "@/lib/admin/mock-data";

interface ErrorInvestigationModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  detail: MockReportDetail;
  onRetry: () => Promise<void>;
}

export function ErrorInvestigationModal({
  open,
  onOpenChange,
  detail,
  onRetry,
}: ErrorInvestigationModalProps) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-admin-border bg-admin-surface">
        <DialogHeader>
          <DialogTitle className="text-admin-text-primary">
            Investigar erro · #{detail.id}
          </DialogTitle>
          <DialogDescription className="text-admin-text-secondary">
            Detalhes técnicos da falha. Útil para abrir incidente ou re-tentar
            o pedido completo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-[12px]">
          <Field label="Código">
            <span className="font-mono text-admin-danger-500">
              {detail.errorCode ?? "—"}
            </span>
          </Field>
          <Field label="Mensagem">
            <span className="text-admin-text-primary">
              {detail.errorMessage ?? "—"}
            </span>
          </Field>
          {detail.errorStack ? (
            <Field label="Stack trace">
              <pre className="m-0 max-h-40 overflow-auto rounded-md border border-admin-border bg-[var(--color-admin-surface-muted)] p-3 font-mono text-[11px] leading-relaxed text-admin-text-secondary">
                {detail.errorStack}
              </pre>
            </Field>
          ) : null}
          {detail.errorResponse ? (
            <Field label={`Resposta HTTP (${detail.errorResponse.status})`}>
              <pre className="m-0 max-h-32 overflow-auto rounded-md border border-admin-border bg-[var(--color-admin-surface-muted)] p-3 font-mono text-[11px] leading-relaxed text-admin-text-secondary">
                {detail.errorResponse.body}
              </pre>
            </Field>
          ) : null}
        </div>

        <DialogFooter>
          <AdminActionButton
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={retrying}
          >
            Fechar
          </AdminActionButton>
          <AdminActionButton
            size="md"
            onClick={handleRetry}
            disabled={retrying}
            className="!border-admin-revenue-500 !bg-admin-revenue-500 !text-white hover:!bg-admin-revenue-700"
          >
            {retrying ? (
              <Loader2
                size={14}
                strokeWidth={2}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : null}
            Re-tentar pedido completo
          </AdminActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="admin-eyebrow text-admin-text-tertiary">{label}</span>
      {children}
    </div>
  );
}