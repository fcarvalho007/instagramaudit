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
      <div className="rounded-lg border border-admin-border/60 bg-admin-surface-secondary/60 px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-eyebrow-sm text-admin-text-tertiary uppercase tracking-wider">
            Expirar cache
          </p>
          <p className="text-[10px] text-admin-text-tertiary leading-tight hidden sm:block">
            Invalida o snapshot — não chama APIs.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="username"
            className="flex-1 rounded-md border border-admin-border bg-transparent px-2 py-1.5 text-xs text-admin-text-primary placeholder:text-admin-text-tertiary focus:outline-none focus:ring-1 focus:ring-[rgb(var(--admin-info-500))]/40"
          />
          <button
            type="button"
            disabled={!handle.trim() || loading}
            onClick={() => setConfirmOpen(true)}
            className="rounded-md bg-[rgb(var(--admin-expense-400))]/10 px-3 py-1.5 text-[11px] font-medium text-[rgb(var(--admin-expense-400))] hover:bg-[rgb(var(--admin-expense-400))]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? "…" : "Expirar"}
          </button>
        </div>
        {result && (
          <p className="text-[10px] text-admin-text-tertiary">{result}</p>
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