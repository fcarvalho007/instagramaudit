/**
 * Admin card — Modo de execução (cache_only / fresh segmented control).
 * Lives in visao-geral/ but is rendered inside Sistema page.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExecutionMode,
  setExecutionMode,
} from "@/server/admin/execution-mode.functions";
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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "execution-mode"] }),
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
      <div className="rounded-xl border border-admin-border bg-admin-surface-secondary p-5 flex flex-col gap-4">
        <p className="text-[11px] font-semibold text-admin-text-secondary uppercase tracking-wider">
          Modo de execução
        </p>

        {/* ── Segmented control ── */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-admin-surface-muted p-1.5">
          <button
            type="button"
            onClick={() => handleToggle("cache_only")}
            disabled={busy}
            className={`flex flex-col items-center gap-1 px-4 py-3.5 text-center rounded-lg transition-all duration-200 ${
              isCacheOnly
                ? "bg-white text-[rgb(var(--admin-revenue-500))] shadow-admin-card"
                : "text-admin-text-tertiary hover:text-admin-text-secondary hover:bg-white/50"
            }`}
          >
            <span className="text-[13px] font-semibold tracking-wide">CACHE-ONLY</span>
            <span className="text-[10px] leading-tight opacity-60">
              Não chama APIs externas
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleToggle("fresh")}
            disabled={busy}
            className={`flex flex-col items-center gap-1 px-4 py-3.5 text-center rounded-lg transition-all duration-200 ${
              !isCacheOnly
                ? "bg-white text-[rgb(var(--admin-expense-500))] shadow-admin-card"
                : "text-admin-text-tertiary hover:text-admin-text-secondary hover:bg-white/50"
            }`}
          >
            <span className="text-[13px] font-semibold tracking-wide">FRESH</span>
            <span className="text-[10px] leading-tight opacity-60">
              Pode gerar custos reais
            </span>
          </button>
        </div>

        {/* ── Status badge ── */}
        {isCacheOnly ? (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[rgb(var(--admin-revenue-500))]/12 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[rgb(var(--admin-revenue-500))]">
            <span className="h-2 w-2 rounded-full bg-[rgb(var(--admin-revenue-500))] admin-pulse-dot" />
            MODO SEGURO · SEM CUSTOS
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[rgb(var(--admin-expense-400))]/12 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[rgb(var(--admin-expense-500))]">
            <span className="h-2 w-2 rounded-full bg-[rgb(var(--admin-expense-500))] admin-pulse-dot" />
            MODO FRESH · CUSTOS ATIVOS
          </span>
        )}

        {/* ── Explanatory copy ── */}
        <p className="text-[12px] text-admin-text-secondary leading-relaxed">
          {isCacheOnly
            ? "Usa apenas snapshots e dados já guardados. Nenhuma API paga será chamada."
            : "Pode chamar Apify, OpenAI e DataForSEO. Utilizar apenas quando necessário atualizar dados reais."}
        </p>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ativar modo Fresh?</AlertDialogTitle>
            <AlertDialogDescription>
              Este modo pode gerar chamadas pagas a APIs externas. Deve ser
              usado apenas quando for necessário atualizar dados reais.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter Cache-only</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFresh}>
              Ativar Fresh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}