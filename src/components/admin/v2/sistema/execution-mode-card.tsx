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
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold text-admin-text-secondary uppercase tracking-wider">
          Modo de execução
        </p>

        {/* ── Horizontal: segmented + badge ── */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="inline-flex gap-1 rounded-lg bg-admin-surface-muted p-1">
            <button
              type="button"
              onClick={() => handleToggle("cache_only")}
              disabled={busy}
              className={`px-3.5 py-2 text-[12px] font-semibold rounded-md transition-all duration-200 ${
                isCacheOnly
                  ? "bg-white text-[rgb(var(--admin-revenue-500))] shadow-sm"
                  : "text-admin-text-tertiary hover:text-admin-text-secondary"
              }`}
            >
              CACHE-ONLY
            </button>
            <button
              type="button"
              onClick={() => handleToggle("fresh")}
              disabled={busy}
              className={`px-3.5 py-2 text-[12px] font-semibold rounded-md transition-all duration-200 ${
                !isCacheOnly
                  ? "bg-white text-[rgb(var(--admin-expense-500))] shadow-sm"
                  : "text-admin-text-tertiary hover:text-admin-text-secondary"
              }`}
            >
              FRESH
            </button>
          </div>

          {isCacheOnly ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--admin-revenue-500))]/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[rgb(var(--admin-revenue-500))]">
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--admin-revenue-500))] admin-pulse-dot" />
              SEM CUSTOS
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--admin-expense-400))]/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[rgb(var(--admin-expense-500))]">
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--admin-expense-500))] admin-pulse-dot" />
              CUSTOS ATIVOS
            </span>
          )}

          <p className="text-[11px] text-admin-text-tertiary leading-tight">
            {isCacheOnly
              ? "Nenhuma API paga será chamada."
              : "Pode chamar Apify, OpenAI e DataForSEO."}
          </p>
        </div>
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