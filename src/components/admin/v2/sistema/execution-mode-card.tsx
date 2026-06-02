/**
 * Admin card — Modo de execução (cache_only / fresh).
 * Redesigned with human-vocabulary switch, status panel, and cost badge.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  getExecutionMode,
  setExecutionMode,
} from "@/lib/admin/execution-mode.functions";
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

export function ExecutionModeCard() {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "execution-mode"],
    queryFn: () => getExecutionMode(),
    staleTime: 10_000,
  });

  const mutation = useMutation({
    mutationFn: (mode: "cache_only" | "fresh") =>
      setExecutionMode({ data: { mode } }),
    onSuccess: (_res, mode) => {
      qc.invalidateQueries({ queryKey: ["admin", "execution-mode"] });
      qc.invalidateQueries({ queryKey: ["admin", "test-profiles"] });
      toast.success(
        mode === "cache_only"
          ? "Modo alterado: usar dados guardados (sem custos)."
          : "Modo alterado: buscar dados novos (com custos).",
      );
    },
    onError: (err) =>
      toast.error(`Falhou a alterar o modo: ${(err as Error).message}`),
  });

  const mode = data?.mode ?? "cache_only";
  const isCacheOnly = mode === "cache_only";
  const busy = isLoading || mutation.isPending;

  const handleToggle = (target: "cache_only" | "fresh") => {
    if (target === mode) return;
    if (target === "fresh") {
      setConfirmOpen(true);
      return;
    }
    mutation.mutate(target);
  };

  const confirmFresh = () => {
    setConfirmOpen(false);
    mutation.mutate("fresh");
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-[12px] font-semibold text-admin-text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-amber-500">✦</span>
          Modo de execução
        </p>

        <div className="flex flex-col sm:flex-row sm:items-stretch gap-4 sm:flex-wrap">
          {/* Switch pill */}
          <div
            className="relative grid grid-cols-2 sm:inline-flex rounded-xl p-1 shrink-0 w-full sm:w-auto"
            style={{
              backgroundColor: "#F3F2EE",
              border: "1px solid #E5E3D9",
              minHeight: 56,
            }}
          >
            <button
              type="button"
              onClick={() => handleToggle("cache_only")}
              disabled={busy}
              className="relative z-10 flex items-center justify-center sm:justify-start gap-2 rounded-lg px-3 sm:px-5 py-2.5 text-[12px] font-semibold transition-all duration-200 w-full sm:w-auto"
              style={{
                backgroundColor: isCacheOnly ? "#FFFFFF" : "transparent",
                color: isCacheOnly ? "#1D9E75" : "#888780",
                boxShadow: isCacheOnly ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <Database size={14} />
              <div className="flex flex-col items-start min-w-0">
                <span>Usar dados guardados</span>
                <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">
                  sem custos
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleToggle("fresh")}
              disabled={busy}
              className="relative z-10 flex items-center justify-center sm:justify-start gap-2 rounded-lg px-3 sm:px-5 py-2.5 text-[12px] font-semibold transition-all duration-200 w-full sm:w-auto"
              style={{
                backgroundColor: !isCacheOnly ? "#FFFFFF" : "transparent",
                color: !isCacheOnly ? "#BA7517" : "#888780",
                boxShadow: !isCacheOnly ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <RefreshCw size={14} />
              <div className="flex flex-col items-start min-w-0">
                <span>Buscar dados novos</span>
                <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">
                  com custos
                </span>
              </div>
            </button>
          </div>

          {/* Status panel */}
          <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
            <div
              className="flex items-center justify-center shrink-0 rounded-full"
              style={{
                width: 36,
                height: 36,
                backgroundColor: isCacheOnly ? "#E8F5EE" : "#FFF3E0",
              }}
            >
              <CheckCircle2
                size={18}
                style={{ color: isCacheOnly ? "#1D9E75" : "#BA7517" }}
              />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-admin-text-primary">
                  Modo ativo: {isCacheOnly ? "dados guardados" : "buscar novos"}
                </span>
                <span
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold tabular-nums"
                  style={{
                    backgroundColor: isCacheOnly ? "#E8F5EE" : "#FFF3E0",
                    color: isCacheOnly ? "#1D9E75" : "#BA7517",
                  }}
                >
                  {isCacheOnly ? "$0 / análise" : "custos variáveis"}
                </span>
              </div>
              <p className="text-[12px] text-admin-text-tertiary leading-snug">
                {isCacheOnly
                  ? "A aplicação só lê informação já recolhida. Nenhuma API paga (Apify, OpenAI, DataForSEO) será chamada."
                  : "Pode chamar Apify, OpenAI e DataForSEO conforme necessário. Utilizar apenas quando for necessário atualizar dados reais."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-admin-text-tertiary">
        Pode demorar até 30 s a propagar entre instâncias do servidor.
      </p>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ativar modo &ldquo;Buscar dados novos&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Este modo pode gerar chamadas pagas a APIs externas (Apify, OpenAI,
              DataForSEO). Deve ser usado apenas quando for necessário atualizar
              dados reais.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter dados guardados</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFresh}>
              Ativar busca de dados novos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
