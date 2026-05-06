/**
 * Admin card — Cache maintenance actions.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
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
      const res = await expireSnapshotForHandle({ handle: handle.trim().toLowerCase() });
      setResult(res.success ? "Cache expirada com sucesso." : `Erro: ${res.error}`);
      qc.invalidateQueries({ queryKey: ["admin", "test-profiles"] });
    } catch (err) {
      setResult("Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AdminSectionHeader title="Manutenção de cache" />
      <AdminCard>
        <div className="flex flex-col gap-3 p-4">
          <p className="text-xs text-muted-foreground">
            Expirar o snapshot de um perfil para forçar análise fresh na próxima visita.
          </p>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="username"
              className="flex-1 rounded-md border border-border/50 bg-transparent px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
            />
            <button
              type="button"
              disabled={!handle.trim() || loading}
              onClick={() => setConfirmOpen(true)}
              className="rounded-md bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "A processar…" : "Forçar próxima análise fresh"}
            </button>
          </div>
          {result && (
            <p className="text-[11px] text-muted-foreground">{result}</p>
          )}
        </div>
      </AdminCard>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Expirar cache de @{handle}?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto invalida o snapshot atual. A próxima análise vai buscar dados novos (se modo Fresh estiver ativo).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doExpire}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}