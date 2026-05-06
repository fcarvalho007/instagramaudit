/**
 * Admin card — Cache maintenance actions (rendered in Sistema).
 * Compact secondary visual treatment.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { expireSnapshotForHandle } from "@/server/admin/execution-mode.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CacheMaintenanceCard() {
  const qc = useQueryClient();
  const [handle, setHandle] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const doExpire = async () => {
    setConfirmOpen(false);
    if (!handle.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await expireSnapshotForHandle({
        data: { handle: handle.trim().toLowerCase() },
      });
      setResult(
        res.success ? "Cache expirada com sucesso." : `Erro: ${res.error}`,
      );
      qc.invalidateQueries({ queryKey: ["admin", "test-profiles"] });
    } catch {
      setResult("Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] font-semibold text-admin-text-secondary uppercase tracking-wider">
            Expirar cache
          </p>
          <p className="text-[11px] text-admin-text-tertiary leading-tight hidden sm:block">
            Invalida o snapshot — não chama APIs.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="username"
            className="flex-1 rounded-lg border border-admin-border bg-admin-surface-muted/50 px-3 py-2 text-xs text-admin-text-primary placeholder:text-admin-text-tertiary focus:outline-none focus:ring-2 focus:ring-[rgb(var(--admin-info-500))]/30 focus:border-[rgb(var(--admin-info-500))]/40 transition-all"
          />
          <button
            type="button"
            disabled={!handle.trim() || loading}
            onClick={() => setConfirmOpen(true)}
            className="rounded-lg border border-[rgb(var(--admin-expense-400))]/30 bg-[rgb(var(--admin-expense-400))]/8 px-4 py-2 text-[11px] font-semibold text-[rgb(var(--admin-expense-500))] hover:bg-[rgb(var(--admin-expense-400))]/18 disabled:opacity-30 disabled:cursor-not-allowed transition-all whitespace-nowrap"
          >
            {loading ? "…" : "Expirar"}
          </button>
        </div>
        {result && (
          <p className="text-[11px] text-admin-text-secondary bg-admin-surface-muted rounded-md px-3 py-2">
            {result}
          </p>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Expirar cache de @{handle}?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto invalida o snapshot atual. A próxima análise vai buscar dados
              novos (se modo Fresh estiver ativo).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doExpire}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}