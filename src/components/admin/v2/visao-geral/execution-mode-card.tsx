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
    mutationFn: (mode: "cache_only" | "fresh") => setExecutionMode({ data: { mode } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "execution-mode"] }),
  });

  const mode = data?.mode ?? "cache_only";
  const isCacheOnly = mode === "cache_only";

  const handleToggle = (target: "cache_only" | "fresh") => {
    if (target === "fresh" && isCacheOnly) {
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
       <div className="rounded-xl border border-admin-border bg-admin-surface-secondary p-4 flex flex-col gap-3">
         <p className="text-eyebrow-sm text-admin-text-tertiary uppercase tracking-wider">
           Modo de execução
         </p>
 
         {/* Segmented control */}
         <div className="flex rounded-lg border border-admin-border overflow-hidden">
           <button
             type="button"
             onClick={() => handleToggle("cache_only")}
             disabled={isLoading || mutation.isPending}
             className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
               isCacheOnly
                 ? "bg-[rgb(var(--admin-revenue-500))]/20 text-[rgb(var(--admin-revenue-400))]"
                 : "text-admin-text-tertiary hover:text-admin-text-secondary"
             }`}
           >
             Cache-only
           </button>
           <button
             type="button"
             onClick={() => handleToggle("fresh")}
             disabled={isLoading || mutation.isPending}
             className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
               !isCacheOnly
                 ? "bg-[rgb(var(--admin-expense-400))]/20 text-[rgb(var(--admin-expense-400))]"
                 : "text-admin-text-tertiary hover:text-admin-text-secondary"
             }`}
           >
             Fresh
           </button>
        </div>
 
         {/* Status badge */}
         {isCacheOnly ? (
           <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[rgb(var(--admin-revenue-500))]/15 px-2.5 py-0.5 text-[11px] font-medium text-[rgb(var(--admin-revenue-400))]">
             <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--admin-revenue-400))]" />
             Cache-only · sem custos
           </span>
         ) : (
           <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[rgb(var(--admin-expense-400))]/15 px-2.5 py-0.5 text-[11px] font-medium text-[rgb(var(--admin-expense-400))]">
             <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--admin-expense-400))]" />
             Fresh · pode gerar custos
           </span>
         )}
 
         {/* Explanatory copy */}
         <p className="text-[11px] text-admin-text-tertiary leading-relaxed">
           {isCacheOnly
             ? "Usa apenas snapshots existentes. Não chama Apify, OpenAI nem DataForSEO."
             : "Permite novas análises e pode gerar custos de API."}
         </p>
       </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ativar modo Fresh?</AlertDialogTitle>
            <AlertDialogDescription>
               Este modo pode chamar APIs pagas, incluindo Apify, OpenAI e DataForSEO. Usa apenas quando quiseres gerar uma nova análise real.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFresh}>
              Ativar Fresh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}