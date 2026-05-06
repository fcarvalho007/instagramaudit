/**
 * Admin card — Modo de análise (cache_only / fresh toggle).
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
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
    mutationFn: (mode: "cache_only" | "fresh") => setExecutionMode({ mode }),
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
      <AdminSectionHeader title="Modo de análise" />
      <AdminCard>
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex-1">
            {isCacheOnly ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Cache-only · sem custos
                </span>
                <p className="mt-2 text-xs text-muted-foreground">
                  Só usa dados já guardados. Não chama Apify, OpenAI ou DataForSEO.
                </p>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Fresh · pode gerar custos
                </span>
                <p className="mt-2 text-xs text-muted-foreground">
                  Pode chamar APIs externas e gerar custos.
                </p>
              </>
            )}
          </div>

          <div className="flex rounded-lg border border-border/50 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => handleToggle("cache_only")}
              disabled={isLoading || mutation.isPending}
              className={`px-3 py-1.5 transition-colors ${
                isCacheOnly
                  ? "bg-emerald-500/20 text-emerald-400 font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cache-only
            </button>
            <button
              type="button"
              onClick={() => handleToggle("fresh")}
              disabled={isLoading || mutation.isPending}
              className={`px-3 py-1.5 transition-colors ${
                !isCacheOnly
                  ? "bg-amber-500/20 text-amber-400 font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Fresh
            </button>
          </div>
        </div>
      </AdminCard>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ativar modo Fresh?</AlertDialogTitle>
            <AlertDialogDescription>
              Ativar modo Fresh pode gerar custos de API (Apify, OpenAI, DataForSEO). Confirmar?
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