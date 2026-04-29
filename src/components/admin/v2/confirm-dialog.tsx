/**
 * ConfirmDialog — diálogo de confirmação reutilizável (admin v2).
 *
 * Usa o `Dialog` Radix do shadcn (`@/components/ui/dialog`). Botão primário
 * adapta-se à variante: `default` (verde — acção positiva) ou `danger`
 * (vermelho — acção destrutiva). Suporta estado `loading` para bloquear
 * o clique e mostrar spinner enquanto a acção decorre.
 */

import { Loader2 } from "lucide-react";
import { type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminActionButton } from "./admin-action-button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const confirmCls =
    variant === "danger"
      ? "!border-admin-danger-500 !bg-admin-danger-500 !text-white hover:!bg-admin-danger-700"
      : "!border-admin-revenue-500 !bg-admin-revenue-500 !text-white hover:!bg-admin-revenue-700";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-admin-border bg-admin-surface">
        <DialogHeader>
          <DialogTitle className="text-admin-text-primary">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-admin-text-secondary">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          <AdminActionButton
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </AdminActionButton>
          <AdminActionButton
            size="md"
            onClick={onConfirm}
            disabled={loading}
            className={confirmCls}
          >
            {loading ? (
              <Loader2
                size={14}
                strokeWidth={2}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : null}
            {confirmLabel}
          </AdminActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}