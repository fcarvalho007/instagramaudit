/**
 * Modal de edição de caps mensais (Apify · OpenAI · DataForSEO).
 *
 * Submete via PATCH /api/admin/sistema/caps e invalida queries do admin.
 */

import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CostCaps } from "@/lib/admin/system-queries.server";

interface CostCapsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: CostCaps;
}

async function patchCaps(payload: Partial<CostCaps>): Promise<CostCaps> {
  const res = await fetch("/api/admin/sistema/caps", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as CostCaps;
}

export function CostCapsModal({ open, onOpenChange, initial }: CostCapsModalProps) {
  const qc = useQueryClient();
  const [apify, setApify] = useState(String(initial.apify));
  const [openai, setOpenai] = useState(String(initial.openai));
  const [dataforseo, setDataforseo] = useState(String(initial.dataforseo));

  useEffect(() => {
    if (open) {
      setApify(String(initial.apify));
      setOpenai(String(initial.openai));
      setDataforseo(String(initial.dataforseo));
    }
  }, [open, initial]);

  const mutation = useMutation({
    mutationFn: patchCaps,
    onSuccess: () => {
      toast.success("Caps atualizados.");
      qc.invalidateQueries({ queryKey: ["admin", "sistema", "caps"] });
      qc.invalidateQueries({ queryKey: ["admin", "sistema", "expense-30d"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(`Falha ao atualizar caps: ${err.message}`);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload: Partial<CostCaps> = {};
    const a = Number(apify);
    const o = Number(openai);
    const d = Number(dataforseo);
    if (Number.isFinite(a) && a > 0 && a !== initial.apify) payload.apify = a;
    if (Number.isFinite(o) && o > 0 && o !== initial.openai) payload.openai = o;
    if (Number.isFinite(d) && d > 0 && d !== initial.dataforseo) payload.dataforseo = d;
    if (Object.keys(payload).length === 0) {
      onOpenChange(false);
      return;
    }
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar caps mensais</DialogTitle>
          <DialogDescription>
            Limites em USD por provedor. Guardados em <code>app_config</code>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="cap-apify">Apify (USD)</Label>
            <Input
              id="cap-apify"
              type="number"
              min={1}
              step={1}
              value={apify}
              onChange={(e) => setApify(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cap-openai">OpenAI (USD)</Label>
            <Input
              id="cap-openai"
              type="number"
              min={1}
              step={1}
              value={openai}
              onChange={(e) => setOpenai(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cap-dfs">DataForSEO (USD)</Label>
            <Input
              id="cap-dfs"
              type="number"
              min={1}
              step={1}
              value={dataforseo}
              onChange={(e) => setDataforseo(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "A guardar…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
