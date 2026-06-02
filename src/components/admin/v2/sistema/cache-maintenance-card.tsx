/**
 * Admin card — Cache maintenance / Zona de Risco.
 * Redesigned with pink-amber danger zone, trash icon, @ input.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { expireSnapshotForHandle } from "@/lib/admin/execution-mode.functions";
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
        {/* Zone label */}
        <p className="text-[12px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
          style={{ color: "#E24B4A" }}
        >
          ⚠ Zona de risco
        </p>

        {/* Danger card */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "linear-gradient(135deg, #FFF5F5 0%, #FFFBF0 100%)",
            border: "1px solid #FECACA",
          }}
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div
              className="flex items-center justify-center shrink-0 rounded-lg"
              style={{
                width: 36,
                height: 36,
                backgroundColor: "#FEE2E2",
              }}
            >
              <Trash2 size={16} style={{ color: "#E24B4A" }} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-semibold text-admin-text-primary">
                Expirar cache de um perfil
              </span>
              <p className="text-[12px] text-admin-text-tertiary leading-snug">
                Invalida o snapshot guardado.{" "}
                <strong className="text-admin-text-secondary">Não chama APIs</strong>
                {" "}— apenas marca a cache como expirada para forçar nova recolha
                no próximo &ldquo;Buscar novo&rdquo;.
              </p>
            </div>
          </div>

          {/* Input + button */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-admin-text-tertiary select-none">
                @
              </span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="username · ex: martimsilvai"
                className="w-full rounded-lg border bg-white pl-7 pr-3 py-2.5 text-[12px] text-admin-text-primary placeholder:text-admin-text-tertiary/60 focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: "#FECACA",
                  boxShadow: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#E24B4A";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(226,75,74,0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#FECACA";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
            <button
              type="button"
              disabled={!handle.trim() || loading}
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 shrink-0 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "transparent",
                color: "#E24B4A",
                border: "1px solid #FECACA",
              }}
            >
              <Trash2 size={12} />
              {loading ? "A expirar…" : "Expirar cache"}
            </button>
          </div>

          {result && (
            <p className="mt-3 text-[12px] text-admin-text-secondary bg-white/80 rounded-md px-3 py-2 border"
              style={{ borderColor: "#FECACA" }}
            >
              {result}
            </p>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Expirar cache de @{handle}?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto invalida o snapshot atual. A próxima análise vai buscar dados
              novos (se o modo &ldquo;Buscar dados novos&rdquo; estiver ativo).
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
