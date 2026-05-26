/**
 * Diálogo de confirmação para repor o template para o predefinido.
 * Substitui `confirm()` nativo por uma UI consistente com o admin.
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface ResetConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function ResetConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: ResetConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
          </div>
          <DialogTitle>Repor o template para o predefinido?</DialogTitle>
          <DialogDescription className="pt-1">
            O override atual será removido. A versão de fábrica volta a ser
            usada em todos os envios. A alteração fica registada no histórico
            e pode ser revertida.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-md border px-3 py-1.5 text-[12px] font-medium text-admin-text-primary hover:bg-admin-surface-elevated disabled:opacity-50"
            style={{ borderColor: "rgb(var(--admin-border-default))" }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
            style={{ background: "rgb(var(--admin-button-dark))" }}
          >
            {loading ? "A repor…" : "Repor predefinido"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}